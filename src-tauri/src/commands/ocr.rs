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
            engine: "paddle".to_string(),
            language: vec!["ch".to_string()],
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
    tracing::info!("Processing frame with OCR engine: {}", config.engine);
    // TODO: Implement OCR with PaddleOCR/EasyOCR/Tesseract
    Ok(OCRResult {
        text: "Sample Text".to_string(),
        confidence: 0.95,
        bounding_box: BoundingBox {
            x: 0,
            y: 0,
            width,
            height,
        },
    })
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
    // TODO: Implement ROI-based OCR
    Ok(OCRResult {
        text: "ROI Sample Text".to_string(),
        confidence: 0.92,
        bounding_box: BoundingBox {
            x: roi.x,
            y: roi.y,
            width: roi.width,
            height: roi.height,
        },
    })
}
