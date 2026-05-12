//! Subtitle export module.
//!
//! Delegates to format-specific functions in [`export_formats`].
//! The [`export_formats`] module is the owner of all format logic; this module
//! only handles Tauri command registration and async file I/O.

use serde::{Deserialize, Serialize};
use std::path::Path;

pub use super::export_formats::{ExportFormat, SubtitleItem};

// Re-export format functions for use in lib.rs re-exports
pub use super::export_formats::{
    export_as_ass, export_as_csv, export_as_json, export_as_lrc, export_as_sbv, export_as_srt,
    export_as_ssa, export_as_txt, export_as_vtt,
};

/// Dispatch to the appropriate format exporter.
fn render_content(subtitles: &[SubtitleItem], format: ExportFormat) -> Result<String, String> {
    match format {
        ExportFormat::SRT => Ok(export_as_srt(subtitles)),
        ExportFormat::WebVTT => Ok(export_as_vtt(subtitles)),
        ExportFormat::ASS => Ok(export_as_ass(subtitles)),
        ExportFormat::SSA => Ok(export_as_ssa(subtitles)),
        ExportFormat::JSON => export_as_json(subtitles),
        ExportFormat::TXT => Ok(export_as_txt(subtitles)),
        ExportFormat::LRC => Ok(export_as_lrc(subtitles)),
        ExportFormat::SBV => Ok(export_as_sbv(subtitles)),
        ExportFormat::CSV => Ok(export_as_csv(subtitles)),
    }
}

#[tauri::command]
pub async fn export_subtitles(
    subtitles: Vec<SubtitleItem>,
    format: ExportFormat,
    output_path: String,
) -> Result<String, String> {
    tracing::info!(
        "Exporting {} subtitles to {:?} at {}",
        subtitles.len(),
        format,
        output_path
    );

    if subtitles.is_empty() {
        return Err("No subtitles to export".to_string());
    }

    let content = render_content(&subtitles, format)?;

    let path = Path::new(&output_path);
    tokio::fs::write(path, content.as_bytes())
        .await
        .map_err(|e| format!("Failed to write file: {}", e))?;

    tracing::info!("Successfully exported subtitles to {}", output_path);
    Ok(output_path)
}
