use serde::{Deserialize, Serialize};
use super::video::BoundingBox;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OCRConfig {
    pub engine: String,
    pub language: Vec<String>,
    pub confidence_threshold: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OCRResult {
    pub text: String,
    pub confidence: f32,
    pub bounding_box: BoundingBox,
}

impl Default for OCRConfig {
    fn default() -> Self {
        Self {
            engine: "tesseract".to_string(),
            language: vec!["eng".to_string()],
            confidence_threshold: 0.7,
        }
    }
}

#[tauri::command]
pub async fn process_frame(
    frame_data: Vec<u8>,
    width: u32,
    height: u32,
    config: OCRConfig,
) -> Result<OCRResult, String> {
    tracing::info!("Processing frame ({}x{}) with OCR engine: {}", width, height, config.engine);
    
    if frame_data.is_empty() {
        return Err("Frame data is empty".to_string());
    }
    
    if width == 0 || height == 0 {
        return Err("Invalid frame dimensions".to_string());
    }
    
    // Save frame data to temp file and process with Tesseract CLI
    let temp_path = save_frame_to_temp_png(&frame_data, width, height)?;
    
    let result = process_with_tesseract(&temp_path, &config).await;
    
    // Clean up temp file
    let _ = std::fs::remove_file(&temp_path);
    
    result
}

#[tauri::command]
pub async fn process_roi(
    frame_data: Vec<u8>,
    width: u32,
    height: u32,
    roi: super::video::ROI,
    config: OCRConfig,
) -> Result<OCRResult, String> {
    tracing::info!("Processing ROI: {:?} with OCR engine: {}", roi, config.engine);
    
    if frame_data.is_empty() {
        return Err("Frame data is empty".to_string());
    }
    
    // Validate ROI dimensions
    if roi.width == 0 || roi.height == 0 {
        return Err("ROI has invalid dimensions".to_string());
    }
    
    // Calculate actual ROI pixel coordinates
    let (roi_x, roi_y, roi_w, roi_h) = calculate_roi_pixels(&roi, width, height);
    
    // Crop frame data to ROI
    let cropped_data = crop_frame_to_roi(&frame_data, width, height, roi_x, roi_y, roi_w, roi_h)?;
    
    // Save cropped frame to temp file and process
    let temp_path = save_frame_to_temp_png(&cropped_data, roi_w, roi_h)?;
    
    let result = process_with_tesseract(&temp_path, &config).await;
    
    // Clean up temp file
    let _ = std::fs::remove_file(&temp_path);
    
    result
}

/// Save raw RGBA frame data to a PNG temp file
fn save_frame_to_temp_png(frame_data: &[u8], width: u32, height: u32) -> Result<String, String> {
    use std::process::Command;
    
    // Generate unique temp filename
    let uuid = uuid_v4();
    let output_path = std::env::temp_dir().join(format!("hardsubx_ocr_{}.png", uuid));
    
    // Create a simple PPM file first, then convert with ffmpeg or use raw2png
    // For simplicity, we'll use ffmpeg if available, otherwise create PPM
    let ppm_path = std::env::temp_dir().join(format!("hardsubx_ocr_{}.ppm", uuid));
    
    // Write PPM (P6 binary PPM format - simpler than PNG)
    let mut ppm_data = format!("P6\n{} {}\n255\n", width, height).into_bytes();
    ppm_data.extend_from_slice(frame_data);
    
    std::fs::write(&ppm_path, &ppm_data)
        .map_err(|e| format!("Failed to write temp PPM: {}", e))?;
    
    // Try to convert PPM to PNG using ImageMagick or ffmpeg
    let output_path_str = output_path.to_string_lossy().to_string();
    
    // Try ImageMagick first
    let convert_result = Command::new("convert")
        .arg(ppm_path.to_str().unwrap())
        .arg(&output_path_str)
        .output();
    
    if convert_result.is_ok() && std::path::Path::new(&output_path_str).exists() {
        let _ = std::fs::remove_file(&ppm_path);
        return Ok(output_path_str);
    }
    
    // Try ffmpeg as fallback
    let ffmpeg_result = Command::new("ffmpeg")
        .args([
            "-f", "ppm",
            "-i", ppm_path.to_str().unwrap(),
            "-frames:v", "1",
            output_path_str.as_str()
        ])
        .output();
    
    let _ = std::fs::remove_file(&ppm_path);
    
    if ffmpeg_result.is_ok() && std::path::Path::new(&output_path_str).exists() {
        return Ok(output_path_str);
    }
    
    // Last resort: return PPM path and let tesseract handle it
    // Tesseract can read PPM directly
    return Ok(ppm_path.to_string_lossy().to_string());
}

/// Process image with Tesseract CLI
async fn process_with_tesseract(image_path: &str, config: &OCRConfig) -> Result<OCRResult, String> {
    use std::process::Command;
    use std::time::Instant;
    
    let start = Instant::now();
    
    // Map language codes
    let tesseract_lang = map_language_to_tesseract(&config.language);
    
    // Check if tesseract is available
    let version_check = Command::new("tesseract")
        .args(["--version"])
        .output();
    
    if version_check.is_err() {
        return Err("Tesseract not found. Install Tesseract OCR and ensure it's in your PATH.".to_string());
    }
    
    // Run tesseract with TSV output
    let output = Command::new("tesseract")
        .arg(image_path)
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
            // First line is header
            continue;
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
        
        // Get bounding box (columns 6-9: left, top, width, height)
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
    
    let processing_time_ms = start.elapsed().as_millis() as u64;
    let avg_confidence = if word_count > 0 {
        total_conf / word_count as f32
    } else {
        0.0
    };
    
    tracing::info!(
        "OCR completed in {}ms: {} words, avg confidence {:.1}%",
        processing_time_ms, word_count, avg_confidence
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

/// Map application language codes to Tesseract language codes
fn map_language_to_tesseract(languages: &[String]) -> String {
    let mut tesseract_langs = Vec::new();
    
    for lang in languages {
        match lang.as_str() {
            "ch" | "chi" | "chi_sim" => tesseract_langs.push("chi_sim"),
            "chi_tra" => tesseract_langs.push("chi_tra"),
            "en" | "eng" => tesseract_langs.push("eng"),
            "ja" | "jpn" => tesseract_langs.push("jpn"),
            "ko" | "kor" => tesseract_langs.push("kor"),
            "fr" | "fra" => tesseract_langs.push("fra"),
            "de" | "deu" => tesseract_langs.push("deu"),
            "es" | "spa" => tesseract_langs.push("spa"),
            "pt" | "por" => tesseract_langs.push("por"),
            "it" | "ita" => tesseract_langs.push("ita"),
            "ru" | "rus" => tesseract_langs.push("rus"),
            "ar" => tesseract_langs.push("ara"),
            _ => tesseract_langs.push("eng"),
        }
    }
    
    // Remove duplicates
    tesseract_langs.dedup();
    
    tesseract_langs.join("+")
}

/// Calculate actual pixel coordinates for ROI
fn calculate_roi_pixels(roi: &super::video::ROI, img_width: u32, img_height: u32) -> (u32, u32, u32, u32) {
    match roi.unit.as_str() {
        "percent" | "" => {
            let x = (roi.x as f32 / 100.0 * img_width as f32) as u32;
            let y = (roi.y as f32 / 100.0 * img_height as f32) as u32;
            let w = (roi.width as f32 / 100.0 * img_width as f32) as u32;
            let h = (roi.height as f32 / 100.0 * img_height as f32) as u32;
            (x, y, w, h)
        }
        "pixel" => (roi.x, roi.y, roi.width, roi.height),
        _ => {
            let x = (roi.x as f32 / 100.0 * img_width as f32) as u32;
            let y = (roi.y as f32 / 100.0 * img_height as f32) as u32;
            let w = (roi.width as f32 / 100.0 * img_width as f32) as u32;
            let h = (roi.height as f32 / 100.0 * img_height as f32) as u32;
            (x, y, w, h)
        }
    }
}

/// Crop RGBA frame data to specified ROI
fn crop_frame_to_roi(
    frame_data: &[u8],
    img_width: u32,
    img_height: u32,
    roi_x: u32,
    roi_y: u32,
    roi_w: u32,
    roi_h: u32,
) -> Result<Vec<u8>, String> {
    // Validate dimensions
    if roi_x + roi_w > img_width {
        return Err(format!("ROI x+w ({} {}) exceeds image width {}", roi_x, roi_w, img_width));
    }
    if roi_y + roi_h > img_height {
        return Err(format!("ROI y+h ({} {}) exceeds image height {}", roi_y, roi_h, img_height));
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

/// Generate UUID for temp files
fn uuid_v4() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default();
    
    let random_part = (now.as_nanos() ^ (std::process::id() as u128 * 0x5deece66d)) % 0xfffffffffffff;
    
    format!(
        "{:012x}-{:04x}-4{:03x}-{:04}-{:012x}",
        (random_part >> 80) & 0xffffffffffff,
        (random_part >> 64) & 0xffff,
        (random_part >> 60) & 0xfff,
        ((random_part >> 48) & 0x3fff) | 0x8000,
        random_part & 0xffffffffffff
    )
}
