//! Subtitle export module.
//!
//! Exports subtitle data to various formats:
//!
//! | Format | Extension | Notes |
//! |--------|-----------|-------|
//! | SRT | `.srt` | Most compatible, widely supported |
//! | WebVTT | `.vtt` | HTML5 standard, supports styling |
//! | ASS/SSA | `.ass` / `.ssa` | Advanced formatting, karaoke effects |
//! | JSON | `.json` | Machine-readable, includes metadata |
//! | Plain Text | `.txt` | Text only, no timing info |
//!
//! ## Export Process
//!
//! 1. Validate subtitles are non-empty
//! 2. Select format-specific exporter
//! 3. Format timestamps according to format spec
//! 4. Escape special characters (commas, newlines)
//! 5. Write to output file
//!
//! ## Timestamp Formats
//!
//! - **SRT**: `HH:MM:SS,mmm` (comma separator)
//! - **VTT**: `HH:MM:SS.mmm` (period separator)
//! - **ASS/SSA**: `HH:MM:SS.cc` (centiseconds)

use serde::{Deserialize, Serialize};
use std::path::Path;

use super::types::{BoundingBox, ROI};

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
    #[serde(rename = "ssa")]
    SSA,
    #[serde(rename = "json")]
    JSON,
    #[serde(rename = "txt")]
    TXT,
    #[serde(rename = "lrc")]
    LRC,
    #[serde(rename = "sbv")]
    SBV,
    #[serde(rename = "csv")]
    CSV,
}

impl ExportFormat {
    pub fn from_str(s: &str) -> Self {
        match s.to_lowercase().as_str() {
            "vtt" => ExportFormat::WebVTT,
            "ass" => ExportFormat::ASS,
            "ssa" => ExportFormat::SSA,
            "json" => ExportFormat::JSON,
            "txt" => ExportFormat::TXT,
            "lrc" => ExportFormat::LRC,
            "sbv" => ExportFormat::SBV,
            "csv" => ExportFormat::CSV,
            _ => ExportFormat::SRT,
        }
    }
}

fn format_timestamp_srt(seconds: f64) -> String {
    let hours = (seconds / 3600.0).floor() as u32;
    let minutes = ((seconds % 3600.0) / 60.0).floor() as u32;
    let secs = (seconds % 60.0).floor() as u32;
    let millis = ((seconds % 1.0) * 1000.0).floor() as u32;
    format!("{:02}:{:02}:{:02},{:03}", hours, minutes, secs, millis)
}

fn format_timestamp_vtt(seconds: f64) -> String {
    let hours = (seconds / 3600.0).floor() as u32;
    let minutes = ((seconds % 3600.0) / 60.0).floor() as u32;
    let secs = (seconds % 60.0).floor() as u32;
    let millis = ((seconds % 1.0) * 1000.0).floor() as u32;
    format!("{:02}:{:02}:{:02}.{:03}", hours, minutes, secs, millis)
}

fn export_as_srt(subtitles: &[SubtitleItem]) -> String {
    subtitles.iter()
        .enumerate()
        .map(|(i, sub)| {
            let start = format_timestamp_srt(sub.start_time);
            let end = format_timestamp_srt(sub.end_time);
            format!("{}\n{} --> {}\n{}\n", i + 1, start, end, sub.text)
        })
        .collect::<Vec<_>>()
        .join("\n")
}

fn export_as_vtt(subtitles: &[SubtitleItem]) -> String {
    let mut output = String::from("WEBVTT\n\n");
    output.push_str(&subtitles.iter()
        .enumerate()
        .map(|(i, sub)| {
            let start = format_timestamp_vtt(sub.start_time);
            let end = format_timestamp_vtt(sub.end_time);
            format!("{}\n{} --> {}\n{}\n", i + 1, start, end, sub.text)
        })
        .collect::<Vec<_>>()
        .join("\n"));
    output
}

fn export_as_txt(subtitles: &[SubtitleItem]) -> String {
    subtitles.iter()
        .map(|sub| sub.text.clone())
        .collect::<Vec<_>>()
        .join("\n")
}

fn export_as_ass(subtitles: &[SubtitleItem]) -> String {
    // ASS/SSA Advanced Substation Alpha format
    let mut output = String::from(
        "[Script Info]
Title: SubLens Export
ScriptType: v4.00+
Collisions: Normal
PlayDepth: 0

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,20,&H00FFFFFF,&H000000FF,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,2,2,2,10,10,10,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
");
    
    for sub in subtitles {
        let start = format_timestamp_ass(sub.start_time);
        let end = format_timestamp_ass(sub.end_time);
        // ASS escape order: backslash FIRST, then braces, then comma, then newline
        let text = sub.text
            .replace("\\", "\\\\")  // backslash first
            .replace("{", "\\{")
            .replace("}", "\\}")
            .replace(",", "\\,")
            .replace("\n", "\\N");
        output.push_str(&format!(
            "Dialogue: 0,{},{},Default,,0,0,0,,{}\n",
            start, end, text
        ));
    }
    
    output
}

fn format_timestamp_ass(seconds: f64) -> String {
    let hours = (seconds / 3600.0).floor() as u32;
    let minutes = ((seconds % 3600.0) / 60.0).floor() as u32;
    let secs = (seconds % 60.0).floor() as u32;
    let centisecs = ((seconds % 1.0) * 100.0).floor() as u32;
    format!("{}:{:02}:{:02}.{:02}", hours, minutes, secs, centisecs)
}

fn export_as_ssa(subtitles: &[SubtitleItem]) -> String {
    // SSA (SubStation Alpha) - older format with v4.00
    let mut output = String::from(
        "[Script Info]
Title: SubLens Export
ScriptType:v4.00
Collisions:Normal
PlayDepth:0

[V4 Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, TertiaryColour, BackColour, Bold, Italic, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, AlphaLevel, Encoding
Style: Default,Arial,20,16777215,65535,255,0,-1,0,1,2,2,2,10,10,10,0,1

[Events]
Format: Marked, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
");
    
    for sub in subtitles {
        let start = format_timestamp_ass(sub.start_time);
        let end = format_timestamp_ass(sub.end_time);
        // SSA escape: backslash first, then braces, then comma, then newline
        let text = sub.text
            .replace("\\", "\\\\")
            .replace("{", "\\{")
            .replace("}", "\\}")
            .replace(",", "\\,")
            .replace("\n", "\\N");
        output.push_str(&format!(
            "Dialogue: Marked=0,{},{},Default,,0000,0000,0000,,{}\n",
            start, end, text
        ));
    }
    
    output
}

fn export_as_json(subtitles: &[SubtitleItem]) -> String {
    let output = serde_json::json!({
        "version": "3.0",
        "generatedAt": chrono_lite_now(),
        "tool": "SubLens",
        "subtitleCount": subtitles.len(),
        "subtitles": subtitles.iter().map(|sub| {
            serde_json::json!({
                "id": sub.id,
                "index": sub.index,
                "startTime": sub.start_time,
                "endTime": sub.end_time,
                "startFrame": sub.start_frame,
                "endFrame": sub.end_frame,
                "text": sub.text,
                "confidence": sub.confidence,
                "language": sub.language,
            })
        }).collect::<Vec<_>>()
    });
    serde_json::to_string_pretty(&output).unwrap_or_default()
}

fn format_timestamp_sbv(seconds: f64) -> String {
    let hours = (seconds / 3600.0).floor() as u32;
    let minutes = ((seconds % 3600.0) / 60.0).floor() as u32;
    let secs = (seconds % 60.0).floor() as u32;
    let millis = ((seconds % 1.0) * 1000.0).floor() as u32;
    format!("{:02}:{:02}:{:02}.{:03}", hours, minutes, secs, millis)
}

fn export_as_lrc(subtitles: &[SubtitleItem]) -> String {
    let mut output = String::from(
        "[ti:SubLens Export]\n\
         [ar:SubLens]\n\
         [al:Subtitle Export]\n\
         [by:SubLens v3.0]\n\
         [offset:0]\n\
         [re:SubLens]\n\n\
        ");
    for sub in subtitles {
        let mins = (sub.start_time / 60.0).floor() as u32;
        let secs = (sub.start_time % 60.0).floor() as u32;
        let centis = ((sub.start_time % 1.0) * 100.0).floor() as u32;
        output.push_str(&format!(
            "[{:02}:{:02}.{:02}]{}\n\n",
            mins, secs, centis, sub.text
        ));
    }
    output
}

fn export_as_sbv(subtitles: &[SubtitleItem]) -> String {
    subtitles.iter()
        .map(|sub| {
            let start = format_timestamp_sbv(sub.start_time);
            let end = format_timestamp_sbv(sub.end_time);
            format!("{},{}\n{}\n", start, end, sub.text)
        })
        .collect::<Vec<_>>()
        .join("\n")
}

fn export_as_csv(subtitles: &[SubtitleItem]) -> String {
    let mut output = String::from("Index,StartTime,EndTime,StartFrame,EndFrame,Text,Confidence\n");
    for sub in subtitles {
        // CSV escape: wrap text in quotes, double any quotes inside
        let escaped = format!("\"{}\"",
            sub.text.replace("\"", "\"\"")
        );
        output.push_str(&format!(
            "{},{:.3},{:.3},{},{},{},{:.3}\n",
            sub.index,
            sub.start_time,
            sub.end_time,
            sub.start_frame,
            sub.end_frame,
            escaped,
            sub.confidence
        ));
    }
    output
}

fn chrono_lite_now() -> String {
    chrono::Local::now().to_rfc3339()
}

#[tauri::command]
pub async fn export_subtitles(
    subtitles: Vec<SubtitleItem>,
    format: ExportFormat,
    output_path: String,
) -> Result<String, String> {
    tracing::info!("Exporting {} subtitles to {:?} at {}", subtitles.len(), format, output_path);
    
    if subtitles.is_empty() {
        return Err("No subtitles to export".to_string());
    }
    
    let content = match format {
        ExportFormat::SRT => export_as_srt(&subtitles),
        ExportFormat::WebVTT => export_as_vtt(&subtitles),
        ExportFormat::ASS => export_as_ass(&subtitles),
        ExportFormat::SSA => export_as_ssa(&subtitles),
        ExportFormat::JSON => export_as_json(&subtitles),
        ExportFormat::TXT => export_as_txt(&subtitles),
        ExportFormat::LRC => export_as_lrc(&subtitles),
        ExportFormat::SBV => export_as_sbv(&subtitles),
        ExportFormat::CSV => export_as_csv(&subtitles),
    };
    
    let path = Path::new(&output_path);
    tokio::fs::write(path, content.as_bytes())
        .await
        .map_err(|e| format!("Failed to write file: {}", e))?;
    
    tracing::info!("Successfully exported subtitles to {}", output_path);
    Ok(output_path)
}

#[tauri::command]
pub async fn export_multiple_formats(
    subtitles: Vec<SubtitleItem>,
    base_path: String,
    formats: Vec<String>,
) -> Result<Vec<String>, String> {
    tracing::info!("Exporting {} subtitles to multiple formats: {:?}", subtitles.len(), formats);
    
    if subtitles.is_empty() {
        return Err("No subtitles to export".to_string());
    }
    
    let mut outputs = Vec::new();
    let base = Path::new(&base_path);
    let stem = base.file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("subtitle");
    let dir = base.parent().unwrap_or(Path::new("."));
    
    for format in formats {
        let ext = format.to_lowercase();
        let filename = format!("{}.{}", stem, ext);
        let output_path = dir.join(&filename);
        
        let export_format = ExportFormat::from_str(&ext);
        match export_subtitles(subtitles.clone(), export_format, output_path.to_string_lossy().to_string()).await {
            Ok(path) => outputs.push(path),
            Err(e) => {
                tracing::warn!("Failed to export {}: {}", ext, e);
            }
        }
    }
    
    if outputs.is_empty() {
        return Err("Failed to export to any format".to_string());
    }
    
    Ok(outputs)
}
