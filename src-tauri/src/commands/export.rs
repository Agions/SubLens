use serde::{Deserialize, Serialize};
use super::video::{ROI, BoundingBox};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SubtitleItem {
    pub id: String,
    pub index: u32,
    pub start_time: f64,
    pub end_time: f64,
    pub start_frame: u64,
    pub end_frame: u64,
    pub text: String,
    pub confidence: f32,
    pub language: Option<String>,
    pub roi: ROI,
    pub thumbnails: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ExportFormat {
    #[serde(rename = "srt")]
    SRT,
    #[serde(rename = "vtt")]
    WebVTT,
    #[serde(rename = "ass")]
    ASS,
    #[serde(rename = "json")]
    JSON,
    #[serde(rename = "txt")]
    TXT,
}

impl ExportFormat {
    pub fn from_str(s: &str) -> Self {
        match s.to_lowercase().as_str() {
            "vtt" => ExportFormat::WebVTT,
            "ass" => ExportFormat::ASS,
            "json" => ExportFormat::JSON,
            "txt" => ExportFormat::TXT,
            _ => ExportFormat::SRT,
        }
    }
}

#[tauri::command]
pub async fn export_subtitles(
    subtitles: Vec<SubtitleItem>,
    format: ExportFormat,
    output_path: String,
) -> Result<String, String> {
    tracing::info!("Exporting {} subtitles to {:?} at {}", subtitles.len(), format, output_path);
    // TODO: Implement subtitle export
    Ok(output_path)
}

#[tauri::command]
pub async fn export_multiple_formats(
    subtitles: Vec<SubtitleItem>,
    base_path: String,
    formats: Vec<String>,
) -> Result<Vec<String>, String> {
    tracing::info!("Exporting {} subtitles to multiple formats: {:?}", subtitles.len(), formats);
    // TODO: Implement multi-format export
    let mut outputs = Vec::new();
    for format in formats {
        outputs.push(format!("{}.{}", base_path, format));
    }
    Ok(outputs)
}
