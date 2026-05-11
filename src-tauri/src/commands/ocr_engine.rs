//! OCR Engine unified interface.
//!
//! This module provides a **unified interface** for multiple OCR backends:
//!
//! | Engine | Type | Pros | Cons |
//! |--------|------|------|------|
//! | Tesseract.js | WASM (Browser) | No install required | Slower, less accurate |
//! | Tesseract CLI | Native | Fast, accurate | Must install tesseract |
//! | PaddleOCR | Native (Python) | Best accuracy for CJK | Requires Python |
//!
//! ## Usage
//!
//! 1. Call `init_ocr_engine()` to verify engine availability
//! 2. Use `process_image_ocr()` or `process_roi_ocr()` for processing
//! 3. All functions return `OCRProcessResult` with unified structure
//!
//! ## Language Codes
//!
//! - `ch` / `chi` / `chi_sim` → Chinese Simplified
//! - `chi_tra` → Chinese Traditional
//! - `ja` / `jpn` → Japanese
//! - `ko` / `kor` → Korean
//! - `en`, `fr`, `de`, `es`, `pt`, `it`, `ru`, `ar` → Other languages
//!
//! ## PaddleOCR Setup
//!
//! Requires `src-tauri/scripts/paddle_ocr.py` and:
//! ```bash
//! pip install paddlepaddle paddleocr
//! ```

/// Maximum image size to prevent OOM (16MB)
const MAX_IMAGE_SIZE_BYTES: usize = 16 * 1024 * 1024;

use super::types::{BoundingBox, OCRProcessResult, OCRResultItem};
use super::utils::{find_python_binary, find_script, uuid_v4};
use image::{ImageBuffer, Rgba};
use std::time::Instant;

/// Validate raw image buffer for OCR processing.
/// Returns `Ok(())` if valid, or an `Err` with the validation message.
fn validate_image_data(data: &[u8], width: u32, height: u32) -> Result<(), String> {
    if data.len() > MAX_IMAGE_SIZE_BYTES {
        return Err(format!(
            "Image data too large: {} bytes (max: {}). Refusing to process.",
            data.len(),
            MAX_IMAGE_SIZE_BYTES
        ));
    }
    if data.is_empty() {
        return Err("Image data is empty".to_string());
    }
    if width == 0 || height == 0 {
        return Err("Invalid image dimensions".to_string());
    }
    Ok(())
}

/// Language code mapper: application code -> Tesseract code.
fn map_lang_to_tesseract(lang: &str) -> &'static str {
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

// Re-export for backward compatibility
pub use super::types::{OCRConfig as OCREngineConfig};
