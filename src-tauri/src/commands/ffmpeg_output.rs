//! FFmpeg / ffprobe output parsing utilities.
//!
//! Provides pure parsing functions for extracting structured data from
//! FFmpeg and ffprobe text outputs. All functions are deterministic
//! and side-effect free.
//!
//! ## Parsed outputs
//!
//! | Source | Function | Output |
//! |--------|----------|--------|
//! | ffprobe JSON | [`parse_video_metadata`] | `VideoMetadata` |
//! | ffmpeg stderr | [`parse_duration_from_ffmpeg_output`] | `f64` (seconds) |
//! | ffmpeg stderr | [`parse_stream_info`] | `(width, height, fps)` |
//! | fraction string | [`parse_fps_from_fraction`] | `f64` (fps) |
//! | time string | [`parse_time_to_seconds`] | `f64` (seconds) |

use serde::{Deserialize, Serialize};

// Re-export so callers can get VideoMetadata without pulling in video.rs
pub use super::video::VideoMetadata;

/// Parse frame rate from ffprobe's "30000/1001" fraction string.
/// Returns fps as f64, or 30.0 as fallback.
pub fn parse_fps_from_fraction(fps_str: &str) -> f64 {
    let parts: Vec<&str> = fps_str.split('/').collect();
    if parts.len() == 2 {
        let num: f64 = parts[0].parse().unwrap_or(30.0);
        let den: f64 = parts[1].parse().unwrap_or(1.0);
        if den > 0.0 {
            return num / den;
        }
    }
    fps_str.parse().unwrap_or(30.0)
}

/// Parse video stream info from ffmpeg stderr output ("Video: ... WxH ... fps, ...").
/// Returns (width, height, fps).
pub fn parse_stream_info(output: &str) -> (u32, u32, f64) {
    let mut width = 1920u32;
    let mut height = 1080u32;
    let mut fps = 30.0f64;

    for line in output.lines() {
        if !line.contains("Video:") {
            continue;
        }

        let parts: Vec<&str> = line.split(',').map(|p| p.trim()).collect();

        // Parse width x height
        for part in &parts {
            if part.contains('x') {
                if let Some((w_str, h_str)) = part.split_once('x') {
                    let w_trimmed = w_str.trim();
                    let h_trimmed = h_str.trim();
                    let w_clean = w_trimmed.trim_end_matches(|c: char| !c.is_ascii_digit());
                    let h_clean = h_trimmed.trim_start_matches(|c: char| !c.is_ascii_digit());
                    width = w_clean.parse().unwrap_or_else(|_| {
                        tracing::warn!("Failed to parse video width: {}", w_trimmed);
                        1920
                    });
                    height = h_clean.parse().unwrap_or_else(|_| {
                        tracing::warn!("Failed to parse video height: {}", h_trimmed);
                        1080
                    });
                    break;
                }
            }
        }

        // Parse fps
        for part in &parts {
            if part.contains("fps") {
                let numeric = part
                    .split_whitespace()
                    .next()
                    .unwrap_or("30")
                    .trim_end_matches(|c: char| !c.is_ascii_digit() && c != '.');
                if let Ok(f) = numeric.parse() {
                    fps = f;
                }
                break;
            }
            if (part.starts_with('[') && part.ends_with(']'))
                || (part.starts_with('(') && part.ends_with(')'))
            {
                let inner = &part[1..part.len() - 1];
                if let Ok(f) = inner.parse() {
                    fps = f;
                    break;
                }
            }
        }
        break; // Only process the first "Video:" line
    }

    if width == 1920 && height == 1080 {
        tracing::warn!(
            "Could not parse video resolution from ffmpeg output, using default 1920x1080"
        );
    }
    if fps == 30.0 {
        tracing::warn!(
            "Could not parse video fps from ffmpeg output, using default 30.0"
        );
    }

    (width, height, fps)
}

/// Parse duration from ffmpeg stderr ("Duration: HH:MM:SS.ms, ...").
/// Returns total seconds, or 0.0 if not found.
pub fn parse_duration_from_ffmpeg_output(output: &str) -> f64 {
    for line in output.lines() {
        if line.contains("Duration:") {
            if let Some(duration_str) = line.split("Duration:").nth(1) {
                let time_part = duration_str.split(',').next().unwrap_or("").trim();
                return parse_time_to_seconds(time_part);
            }
        }
    }
    0.0
}

/// Parse "HH:MM:SS.ms" time string to seconds.
/// Computes in integer milliseconds to avoid floating-point accumulation error.
pub fn parse_time_to_seconds(time_str: &str) -> f64 {
    let parts: Vec<&str> = time_str.split(':').collect();
    if parts.len() >= 3 {
        let hours: f64 = parts[0].parse().unwrap_or(0.0);
        let minutes: f64 = parts[1].parse().unwrap_or(0.0);
        let seconds: f64 = parts[2].parse().unwrap_or(0.0);
        let total_ms = (hours as u64) * 3_600_000
            + (minutes as u64) * 60_000
            + (seconds * 1000.0).round() as u64;
        return total_ms as f64 / 1000.0;
    }
    tracing::warn!("Invalid time format (expected HH:MM:SS): {}", time_str);
    0.0
}
