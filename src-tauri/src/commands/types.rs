//! Shared types for the SubLens commands layer.
//! All cross-cutting data structures live here to avoid duplication.

use serde::{Deserialize, Serialize};

/// Bounding box for a detected text region or OCR result.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BoundingBox {
    pub x: u32,
    pub y: u32,
    pub width: u32,
    pub height: u32,
}

impl BoundingBox {
    pub fn new(x: u32, y: u32, width: u32, height: u32) -> Self {
        Self { x, y, width, height }
    }

    /// Convert from pixel coordinates to percentage of image dimensions.
    pub fn to_percent(&self, img_width: u32, img_height: u32) -> Self {
        Self {
            x: (self.x as f32 / img_width as f32 * 100.0) as u32,
            y: (self.y as f32 / img_height as f32 * 100.0) as u32,
            width: (self.width as f32 / img_width as f32 * 100.0) as u32,
            height: (self.height as f32 / img_height as f32 * 100.0) as u32,
        }
    }

    /// Convert from percentage coordinates to pixel coordinates.
    pub fn to_pixels(&self, img_width: u32, img_height: u32) -> Self {
        Self {
            x: (self.x as f32 / 100.0 * img_width as f32) as u32,
            y: (self.y as f32 / 100.0 * img_height as f32) as u32,
            width: (self.width as f32 / 100.0 * img_width as f32) as u32,
            height: (self.height as f32 / 100.0 * img_height as f32) as u32,
        }
    }
}

/// Region of interest within a video frame for subtitle extraction.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ROI {
    pub id: String,
    pub name: String,
    #[serde(rename = "type")]
    pub roi_type: String,
    pub x: u32,
    pub y: u32,
    pub width: u32,
    pub height: u32,
    pub enabled: bool,
    #[serde(default = "default_unit")]
    pub unit: String,
}

fn default_unit() -> String {
    "percent".to_string()
}

impl Default for ROI {
    fn default() -> Self {
        Self {
            id: "default".to_string(),
            name: "Default".to_string(),
            roi_type: "bottom".to_string(),
            x: 0,
            y: 80,
            width: 100,
            height: 20,
            enabled: true,
            unit: "percent".to_string(),
        }
    }
}

impl ROI {
    /// Convert ROI coordinates to absolute pixels given image dimensions.
    pub fn to_pixels(&self, img_width: u32, img_height: u32) -> (u32, u32, u32, u32) {
        let (x, y, w, h) = match self.unit.as_str() {
            "pixel" => (self.x, self.y, self.width, self.height),
            _ => (
                (self.x as f32 / 100.0 * img_width as f32) as u32,
                (self.y as f32 / 100.0 * img_height as f32) as u32,
                (self.width as f32 / 100.0 * img_width as f32) as u32,
                (self.height as f32 / 100.0 * img_height as f32) as u32,
            ),
        };
        (x, y, w, h)
    }
}

/// Common OCR engine configuration used across all engines.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OCRConfig {
    pub engine: String,
    pub language: Vec<String>,
    pub confidence_threshold: f32,
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

/// Language code mapper: application code -> Tesseract code.
pub fn map_lang_to_tesseract(lang: &str) -> &'static str {
    match lang {
        "ch" | "chi" | "chi_sim" => "chi_sim",
        "chi_tra" => "chi_tra",
        "ja" | "jpn" => "jpn",
        "ko" | "kor" => "kor",
        "fr" | "fra" => "fra",
        "de" | "deu" => "deu",
        "es" | "spa" => "spa",
        "pt" | "por" => "por",
        "it" | "ita" => "ita",
        "ru" | "rus" => "rus",
        "ar" => "ara",
        _ => "eng",
    }
}
