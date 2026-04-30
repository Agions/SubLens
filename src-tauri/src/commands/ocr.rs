//! Tauri CLI-based OCR via Tesseract executable.
//!
//! **⚠️ Deprecation Warning**: This module uses Tesseract via CLI subprocess.
//! For new implementations, prefer [`crate::commands::ocr_engine`] which provides
//! a unified interface supporting both Tesseract and PaddleOCR.
//!
//! ## Architecture
//!
//! All OCR in this module goes through the system Tesseract CLI,
//! using temp files to bridge Rust frame data with the external process:
//!
//! ```text
//! Frame Data (RGBA) -> PPM Temp File -> ImageMagick (optional) -> PNG Temp File
//!                                                                      |
//!                                           Tesseract CLI <-------------+
//!                                           (outputs TSV format)
//!                                           |
//!                                           v
//!                                       OCRProcessResult
//! ```
//!
//! ## Confidence Threshold
//!
//! The `confidence_threshold` in `OCRConfig` is applied during processing.
//! Words with confidence below this threshold are filtered out.
//!
//! ## Coordinate Systems
//!
//! - Input/output coordinates are in **pixels**
//! - ROI coordinates support both **pixels** and **percentages** (via `ROI.unit`)
//! - Use `BoundingBox::to_percent()` / `BoundingBox::to_pixels()` to convert

use super::types::{map_lang_to_tesseract, BoundingBox, OCRConfig, OCRProcessResult, OCRResultItem, ROI};
use super::utils::{uuid_v4, TempFileGuard};

// Re-export unified types for backward compatibility
pub use types::{OCRConfig as TesseractOCRConfig, OCRProcessResult, OCRResultItem};

#[tauri::command]
pub async fn process_frame(
    frame_data: Vec<u8>,
    width: u32,
    height: u32,
    config: OCRConfig,
) -> Result<OCRProcessResult, String> {
    tracing::info!(
        "Processing frame ({}x{}) with OCR engine: {}",
        width,
        height,
        config.engine
    );

    if frame_data.is_empty() {
        return Err("Frame data is empty".to_string());
    }
    if width == 0 || height == 0 {
        return Err("Invalid frame dimensions".to_string());
    }

    let temp_guard = save_frame_to_temp_png(&frame_data, width, height).await?;
    let result = process_with_tesseract(temp_guard.path(), &config).await;
    drop(temp_guard); // explicit cleanup before returning
    result
}

#[tauri::command]
pub async fn process_roi(
    frame_data: Vec<u8>,
    width: u32,
    height: u32,
    roi: ROI,
    config: OCRConfig,
) -> Result<OCRProcessResult, String> {
    tracing::info!(
        "Processing ROI: {:?} with OCR engine: {}",
        roi,
        config.engine
    );

    if frame_data.is_empty() {
        return Err("Frame data is empty".to_string());
    }
    if roi.width == 0 || roi.height == 0 {
        return Err("ROI has invalid dimensions".to_string());
    }

    // Convert ROI to pixel coordinates
    let (roi_x, roi_y, roi_w, roi_h) = roi.to_pixels(width, height);

    // Crop frame data to ROI
    let cropped_data =
        crop_frame_to_roi(&frame_data, width, height, roi_x, roi_y, roi_w, roi_h)?;

    let temp_guard = save_frame_to_temp_png(&cropped_data, roi_w, roi_h).await?;
    let result = process_with_tesseract(temp_guard.path(), &config).await;
    drop(temp_guard);
    result
}

/// Save raw RGBA frame data to a PNG temp file, managed by TempFileGuard (async).
async fn save_frame_to_temp_png(
    frame_data: &[u8],
    width: u32,
    height: u32,
) -> Result<TempFileGuard, String> {
    // Write PPM (P6 binary PPM — no external tool needed)
    let ppm_path = std::env::temp_dir().join(format!("hardsubx_ocr_{}.ppm", uuid_v4()));

    let mut ppm_data = format!("P6\n{} {}\n255\n", width, height).into_bytes();
    ppm_data.extend_from_slice(frame_data);

    tokio::fs::write(&ppm_path, &ppm_data)
        .await
        .map_err(|e| format!("Failed to write temp PPM: {}", e))?;

    // Try ImageMagick first, then ffmpeg as fallback
    let png_guard = TempFileGuard::new(std::env::temp_dir().join(format!(
        "hardsubx_ocr_{}.png",
        uuid_v4()
    )));

    let convert_ok = tokio::process::Command::new("convert")
        .arg(ppm_path.to_str().unwrap())
        .arg(png_guard.path().to_str().unwrap())
        .output()
        .await
        .map(|o| o.status.success())
        .unwrap_or(false);

    if convert_ok && png_guard.path().exists() {
        // Primary path: ImageMagick converted PPM → PNG, clean up PPM
        let _ = tokio::fs::remove_file(&ppm_path).await;
        Ok(png_guard)
    } else {
        // Fallback path: Tesseract reads PPM directly, keep it (guard manages cleanup)
        let _ = tokio::fs::remove_file(png_guard.path()).await;
        Ok(TempFileGuard::new(ppm_path))
    }
}

/// Process an image file with the Tesseract CLI, returning OCRProcessResult (async).
async fn process_with_tesseract(
    image_path: &std::path::Path,
    config: &OCRConfig,
) -> Result<OCRProcessResult, String> {
    let start = std::time::Instant::now();
    let tesseract_lang = config
        .language
        .iter()
        .map(|l| map_lang_to_tesseract(l))
        .collect::<std::collections::HashSet<_>>()
        .into_iter()
        .collect::<Vec<_>>()
        .join("+");

    let output = tokio::process::Command::new("tesseract")
        .arg(image_path.to_str().unwrap_or("stdout"))
        .arg("stdout")
        .arg("-l")
        .arg(&tesseract_lang)
        .arg("tsv")
        .output()
        .await
        .map_err(|e| format!("Failed to run tesseract: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Tesseract OCR failed: {}", stderr));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut items = Vec::new();
    let mut full_text = String::new();
    let mut total_conf = 0.0f32;
    let mut word_count = 0;
    let mut min_x = 0u32;
    let mut min_y = 0u32;
    let mut max_x = 0u32;
    let mut max_y = 0u32;
    let mut first_word = true;

    for (idx, line) in stdout.lines().enumerate() {
        if idx == 0 {
            continue; // header row
        }
        let fields: Vec<&str> = line.split('\t').collect();
        if fields.len() < 12 {
            continue;
        }

        let text = fields[11].to_string();
        if text.is_empty() {
            continue;
        }

        let conf: f32 = fields[10].parse().unwrap_or(0.0);
        if conf == 0.0 && fields[10].trim() != "0" && fields[10].trim() != "0.0" {
            tracing::debug!("Failed to parse confidence '{}' from tesseract TSV row, skipping", fields[10]);
            continue;
        }

        // Filter by confidence threshold (config is passed but currently unused)
        if conf / 100.0 < config.confidence_threshold {
            tracing::debug!("Skipping word '{}' with confidence {:.2} below threshold {:.2}",
                text, conf / 100.0, config.confidence_threshold);
            continue;
        }

        let left: u32 = fields[6].parse().unwrap_or(0);
        let top: u32 = fields[7].parse().unwrap_or(0);
        let w: u32 = fields[8].parse().unwrap_or(0);
        let h: u32 = fields[9].parse().unwrap_or(0);

        if first_word {
            min_x = left;
            min_y = top;
            max_x = left + w;
            max_y = top + h;
            first_word = false;
        } else {
            min_x = min_x.min(left);
            min_y = min_y.min(top);
            max_x = max_x.max(left + w);
            max_y = max_y.max(top + h);
        }

        items.push(OCRResultItem {
            text: text.clone(),
            confidence: conf / 100.0,
            bounding_box: BoundingBox {
                x: left,
                y: top,
                width: w,
                height: h,
            },
        });

        if !full_text.is_empty() {
            full_text.push(' ');
        }
        full_text.push_str(&text);
        total_conf += conf;
        word_count += 1;
    }

    let avg_confidence = if word_count > 0 {
        total_conf / word_count as f32
    } else {
        0.0
    };

    let processing_time_ms = start.elapsed().as_millis() as u64;

    tracing::info!(
        "OCR completed: {} words, avg confidence {:.1}%, time {}ms",
        word_count,
        avg_confidence,
        processing_time_ms
    );

    // Detect language (best effort based on what was requested)
    let language_detected = if config.language.iter().any(|l| l.contains("chi")) {
        "chinese".to_string()
    } else if config.language.iter().any(|l| l.contains("jpn")) {
        "japanese".to_string()
    } else if config.language.iter().any(|l| l.contains("kor")) {
        "korean".to_string()
    } else {
        config.language.first().cloned().unwrap_or_else(|| "unknown".to_string())
    };

    Ok(OCRProcessResult {
        items,
        full_text,
        language_detected,
        processing_time_ms,
    })
}

/// Crop RGBA frame data to a sub-region defined by pixel coordinates.
/// Returns an empty Vec if the ROI is completely outside the image bounds.
fn crop_frame_to_roi(
    frame_data: &[u8],
    img_width: u32,
    img_height: u32,
    roi_x: u32,
    roi_y: u32,
    roi_w: u32,
    roi_h: u32,
) -> Result<Vec<u8>, String> {
    // Clamp ROI to image bounds (safe handling of out-of-bounds ROI)
    // If ROI is entirely outside image, return empty result instead of error
    if roi_x >= img_width || roi_y >= img_height {
        tracing::debug!(
            "ROI ({},{}) is outside image bounds ({}x{}), returning empty",
            roi_x, roi_y, img_width, img_height
        );
        return Ok(Vec::new());
    }

    // Calculate actual intersection with image bounds
    let effective_x = roi_x.min(img_width);
    let effective_y = roi_y.min(img_height);
    let effective_w = roi_w.min(img_width.saturating_sub(effective_x));
    let effective_h = roi_h.min(img_height.saturating_sub(effective_y));

    // Check for zero-size ROI after clamping
    if effective_w == 0 || effective_h == 0 {
        return Ok(Vec::new());
    }

    // Use saturating arithmetic to prevent overflow in capacity calculation
    let capacity = effective_w.saturating_mul(effective_h).saturating_mul(4) as usize;
    let mut cropped = Vec::with_capacity(capacity);

    let row_stride = img_width as usize * 4;

    for y in effective_y..(effective_y + effective_h) {
        let row_start = (y as usize) * row_stride;
        for x in effective_x..(effective_x + effective_w) {
            let pixel_start = row_start + (x as usize) * 4;
            // Bounds check before access
            if pixel_start + 3 < frame_data.len() {
                cropped.push(frame_data[pixel_start]);
                cropped.push(frame_data[pixel_start + 1]);
                cropped.push(frame_data[pixel_start + 2]);
                cropped.push(frame_data[pixel_start + 3]);
            }
        }
    }

    Ok(cropped)
}
