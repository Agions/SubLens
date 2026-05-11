//! Shared types for the SubLens commands layer.
//!
//! All cross-cutting data structures live here to avoid duplication.

use serde::{Deserialize, Serialize};

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
