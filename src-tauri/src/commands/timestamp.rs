//! Timestamp formatting utilities for subtitle export.
//!
//! Provides format-specific timestamp formatters used by the export module:
//!
//! | Format | Separator | Precision | Example |
//! |--------|-----------|-----------|---------|
//! | SRT | `,` (comma) | milliseconds (3) | `01:02:03,456` |
//! | VTT | `.` (period) | milliseconds (3) | `01:02:03.456` |
//! | ASS/SSA | `.` (period) | centiseconds (2) | `01:02:03.45` |
//! | SBV | `.` (period) | milliseconds (3) | `01:02:03.456` |
//!
//! All functions are pure (no side effects) and heap-allocation free
//! (stack pre-allocation via `String::with_capacity` for bounded outputs).

/// Format a timestamp with given separator and precision.
///
/// * `separator`: `","` for SRT, `"."` for ASS/VTT/SBV
/// * `precision`: `3` = milliseconds, `2` = centiseconds
pub fn format_timestamp(seconds: f64, separator: &str, precision: u32) -> String {
    let hours = (seconds / 3600.0).floor() as u32;
    let minutes = ((seconds % 3600.0) / 60.0).floor() as u32;
    let secs = (seconds % 60.0).floor() as u32;
    let fraction = ((seconds % 1.0) * 10_f64.powi(precision as i32)).floor() as u32;
    match precision {
        3 => format!("{:02}:{:02}:{:02}{}{:03}", hours, minutes, secs, separator, fraction),
        _ => format!("{:02}:{:02}:{:02}{}{:02}", hours, minutes, secs, separator, fraction),
    }
}

pub fn format_timestamp_srt(seconds: f64) -> String {
    format_timestamp(seconds, ",", 3)
}

pub fn format_timestamp_ass(seconds: f64) -> String {
    format_timestamp(seconds, ".", 2)
}

pub fn format_timestamp_vtt(seconds: f64) -> String {
    format_timestamp(seconds, ".", 3)
}

/// SBV uses identical timestamp format to WebVTT — reuse directly.
pub fn format_timestamp_sbv(seconds: f64) -> String {
    format_timestamp_vtt(seconds)
}
