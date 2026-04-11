//! Tauri CLI-based OCR via Tesseract executable.
//! All OCR in this module goes through the system Tesseract CLI,
//! using temp files to bridge Rust frame data with the external process.

use std::process::Command;

use super::types::{map_lang_to_tesseract, BoundingBox, OCRConfig, ROI};
use super::utils::{uuid_v4, TempFileGuard};

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct OCRResult {
    pub text: String,
    pub confidence: f32,
    pub bounding_box: BoundingBox,
}

#[tauri::command]
pub async fn process_frame(
    frame_data: Vec<u8>,
    width: u32,
    height: u32,
    config: OCRConfig,
) -> Result<OCRResult, String> {
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

    let temp_guard = save_frame_to_temp_png(&frame_data, width, height)?;
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
) -> Result<OCRResult, String> {
    tracing::info!("Processing ROI: {:?} with OCR engine: {}", roi, config.engine);

    if frame_data.is_empty() {
        return Err("Frame data is empty".to_string());
    }
    if roi.width == 0 || roi.height == 0 {
        return Err("ROI has invalid dimensions".to_string());
    }

    // Convert ROI to pixel coordinates
    let (roi_x, roi_y, roi_w, roi_h) = roi.to_pixels(width, height);

    // Crop frame data to ROI
    let cropped_data = crop_frame_to_roi(&frame_data, width, height, roi_x, roi_y, roi_w, roi_h)?;

    let temp_guard = save_frame_to_temp_png(&cropped_data, roi_w, roi_h)?;
    let result = process_with_tesseract(temp_guard.path(), &config).await;
    drop(temp_guard);
    result
}

/// Save raw RGBA frame data to a PNG temp file, managed by TempFileGuard.
fn save_frame_to_temp_png(frame_data: &[u8], width: u32, height: u32) -> Result<TempFileGuard, String> {
    // Write PPM (P6 binary PPM — no external tool needed)
    let ppm_path = std::env::temp_dir().join(format!("hardsubx_ocr_{}.ppm", uuid_v4()));

    let mut ppm_data = format!("P6\n{} {}\n255\n", width, height).into_bytes();
    ppm_data.extend_from_slice(frame_data);

    std::fs::write(&ppm_path, &ppm_data)
        .map_err(|e| format!("Failed to write temp PPM: {}", e))?;

    // Try ImageMagick first, then ffmpeg as fallback
    let png_guard = TempFileGuard::new(
        std::env::temp_dir().join(format!("hardsubx_ocr_{}.png", uuid_v4())),
    );

    let convert_ok = Command::new("convert")
        .arg(ppm_path.to_str().unwrap())
        .arg(png_guard.path().to_str().unwrap())
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false);

    if convert_ok && png_guard.path().exists() {
        // Primary path: ImageMagick converted PPM → PNG, clean up PPM
        let _ = std::fs::remove_file(&ppm_path);
        Ok(png_guard)
    } else {
        // Fallback path: Tesseract reads PPM directly, keep it (guard manages cleanup)
        let _ = std::fs::remove_file(png_guard.path());
        Ok(TempFileGuard::new(ppm_path))
    }
}

/// Process an image file with the Tesseract CLI, returning structured OCRResult.
async fn process_with_tesseract(image_path: &std::path::Path, config: &OCRConfig) -> Result<OCRResult, String> {
    let tesseract_lang = config
        .language
        .iter()
        .map(|l| map_lang_to_tesseract(l))
        .collect::<std::collections::HashSet<_>>()
        .into_iter()
        .collect::<Vec<_>>()
        .join("+");

    let output = Command::new("tesseract")
        .arg(image_path.to_str().unwrap_or("stdout"))
        .arg("stdout")
        .arg("-l")
        .arg(&tesseract_lang)
        .arg("tsv")
        .output()
        .map_err(|e| format!("Failed to run tesseract: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Tesseract OCR failed: {}", stderr));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
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

    tracing::info!(
        "OCR completed: {} words, avg confidence {:.1}%",
        word_count,
        avg_confidence
    );

    Ok(OCRResult {
        text: full_text,
        confidence: avg_confidence / 100.0,
        bounding_box: BoundingBox {
            x: min_x,
            y: min_y,
            width: max_x - min_x,
            height: max_y - min_y,
        },
    })
}

/// Crop RGBA frame data to a sub-region defined by pixel coordinates.
fn crop_frame_to_roi(
    frame_data: &[u8],
    img_width: u32,
    img_height: u32,
    roi_x: u32,
    roi_y: u32,
    roi_w: u32,
    roi_h: u32,
) -> Result<Vec<u8>, String> {
    if roi_x + roi_w > img_width {
        return Err(format!(
            "ROI x+w ({} {}) exceeds image width {}",
            roi_x, roi_w, img_width
        ));
    }
    if roi_y + roi_h > img_height {
        return Err(format!(
            "ROI y+h ({} {}) exceeds image height {}",
            roi_y, roi_h, img_height
        ));
    }

    let mut cropped = Vec::with_capacity((roi_w * roi_h * 4) as usize);

    for y in roi_y..(roi_y + roi_h) {
        for x in roi_x..(roi_x + roi_w) {
            let src_idx = ((y * img_width + x) * 4) as usize;
            if src_idx + 3 < frame_data.len() {
                cropped.push(frame_data[src_idx]);
                cropped.push(frame_data[src_idx + 1]);
                cropped.push(frame_data[src_idx + 2]);
                cropped.push(frame_data[src_idx + 3]);
            }
        }
    }

    Ok(cropped)
}
