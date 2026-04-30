//! Shared types for the SubLens commands layer.
//!
//! All cross-cutting data structures live here to avoid duplication.
//! These types are used across multiple command modules (video, ocr, scene, export).
//!
//! ## Unification Note
//!
//! This module consolidates types that were previously duplicated across
//! `ocr.rs` and `ocr_engine.rs`. The unified `OCRProcessResult` and
//! `OCRResultItem` types should be used for all OCR operations.

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
    /// Uses rounding to avoid floating point precision issues.
    pub fn to_percent(&self, img_width: u32, img_height: u32) -> Self {
        let img_width = img_width.max(1);
        let img_height = img_height.max(1);
        Self {
            x: ((self.x as f64 / img_width as f64) * 100.0).round() as u32,
            y: ((self.y as f64 / img_height as f64) * 100.0).round() as u32,
            width: ((self.width as f64 / img_width as f64) * 100.0).round() as u32,
            height: ((self.height as f64 / img_height as f64) * 100.0).round() as u32,
        }
    }

    /// Convert from percentage coordinates to pixel coordinates.
    /// Uses rounding to avoid floating point precision issues.
    pub fn to_pixels(&self, img_width: u32, img_height: u32) -> Self {
        Self {
            x: ((self.x as f64 / 100.0) * img_width as f64).round() as u32,
            y: ((self.y as f64 / 100.0) * img_height as f64).round() as u32,
            width: ((self.width as f64 / 100.0) * img_width as f64).round() as u32,
            height: ((self.height as f64 / 100.0) * img_height as f64).round() as u32,
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
    #[serde(default)]
    pub use_gpu: bool,
}

impl Default for OCRConfig {
    fn default() -> Self {
        Self {
            engine: "tesseract".to_string(),
            language: vec!["eng".to_string()],
            confidence_threshold: 0.7,
            use_gpu: false,
        }
    }
}

/// A single OCR result item with text, confidence, and bounding box.
/// This is the unified type used across all OCR engines.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OCRResultItem {
    pub text: String,
    pub confidence: f32,
    pub bounding_box: BoundingBox,
}

/// The result of a complete OCR processing operation.
/// Contains all detected items plus metadata about the processing.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OCRProcessResult {
    pub items: Vec<OCRResultItem>,
    pub full_text: String,
    pub language_detected: String,
    pub processing_time_ms: u64,
}

impl Default for OCRProcessResult {
    fn default() -> Self {
        Self {
            items: Vec::new(),
            full_text: String::new(),
            language_detected: "unknown".to_string(),
            processing_time_ms: 0,
        }
    }
}
