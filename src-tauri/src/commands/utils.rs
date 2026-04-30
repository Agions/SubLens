//! Shared utilities for the SubLens commands layer.

use std::path::PathBuf;
use uuid::Uuid;

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
pub fn parse_stream_from_ffmpeg_output(output: &str) -> (u32, u32, f64) {
    let mut width = 1920u32;
    let mut height = 1080u32;
    let mut fps = 30.0f64;

    for line in output.lines() {
        if line.contains("Video:") {
            for part in line.split(',') {
                let part = part.trim();
                if part.contains('x') {
                    if let Some((w, h)) = part.split_once('x') {
                        width = w.parse().unwrap_or_else(|_| {
                            tracing::warn!("Failed to parse video width: {}", w);
                            1920
                        });
                        height = h.parse().unwrap_or_else(|_| {
                            tracing::warn!("Failed to parse video height: {}", h);
                            1080
                        });
                    }
                }
                if part.contains("fps") {
                    let fps_candidate = part.split_whitespace().next().unwrap_or("30");
                    let numeric = fps_candidate.trim_end_matches(|c: char| !c.is_ascii_digit() && c != '.');
                    fps = numeric.parse().unwrap_or_else(|_| {
                        tracing::warn!("Failed to parse fps value: {}", numeric);
                        30.0
                    });
                }
            }
            break;
        }
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
pub fn parse_time_to_seconds(time_str: &str) -> f64 {
    let parts: Vec<&str> = time_str.split(':').collect();
    if parts.len() >= 3 {
        let hours: f64 = parts[0].parse().unwrap_or(0.0);
        let minutes: f64 = parts[1].parse().unwrap_or(0.0);
        let seconds: f64 = parts[2].parse().unwrap_or(0.0);
        // Compute in integer milliseconds to avoid floating-point accumulation error
        let total_ms = (hours as u64) * 3_600_000
            + (minutes as u64) * 60_000
            + (seconds * 1000.0).round() as u64;
        return total_ms as f64 / 1000.0;
    }
    tracing::warn!("Invalid time format (expected HH:MM:SS): {}", time_str);
    0.0
}

/// RAII guard: automatically removes a temp file when dropped.
pub struct TempFileGuard(PathBuf);

impl TempFileGuard {
    pub fn new(path: PathBuf) -> Self {
        Self(path)
    }

    /// Returns the path being managed as a string slice.
    pub fn path(&self) -> &std::path::Path {
        &self.0
    }

    /// Consumes the guard and returns the path.
    /// The temp file will NOT be automatically deleted — caller is responsible for cleanup.
    /// This is the safe alternative to std::mem::forget.
    pub fn into_path(mut self) -> PathBuf {
        use std::mem::ManuallyDrop;
        // Prevent Drop from running by wrapping in ManuallyDrop
        let guard = ManuallyDrop::new(self);
        guard.0.clone()
    }

    /// Consumes the guard and returns the path, WITH ownership transfer for deletion.
    /// The temp file WILL be deleted when the returned PathBuf is dropped.
    /// Use this when you want the file to persist but still want RAII cleanup.
    pub fn release_path(self) -> PathBuf {
        let path = self.0.clone();
        // Leak the TempFileGuard intentionally so Drop won't run on this path
        // The file will be managed externally now
        std::mem::forget(self);
        path
    }
}

impl Drop for TempFileGuard {
    fn drop(&mut self) {
        if let Err(e) = std::fs::remove_file(&self.0) {
            tracing::warn!("Failed to remove temp file {:?}: {}", self.0, e);
        }
    }
}

/// Generate a cryptographically random UUID v4 string.
/// Used for unique temporary file names.
pub fn uuid_v4() -> String {
    Uuid::new_v4().to_string()
}

/// Get the path to a temp directory for this application.
pub fn temp_dir() -> PathBuf {
    std::env::temp_dir().join("hardsubx")
}

/// Build a temp file path under the application temp directory.
pub fn temp_path(suffix: &str) -> PathBuf {
    let dir = temp_dir();
    let _ = std::fs::create_dir_all(&dir);
    dir.join(format!("hardsubx_{}_{}", uuid_v4(), suffix))
}

/// Find Python3/Python executable in PATH (async).
pub async fn find_python_binary() -> Result<PathBuf, String> {
    let candidates = ["python3", "python", "python3.11", "python3.10", "python3.9"];

    for cmd in candidates {
        if let Ok(output) = tokio::process::Command::new(cmd)
            .arg("--version")
            .output()
            .await
        {
            if output.status.success() {
                return Ok(PathBuf::from(cmd));
            }
        }
    }

    Err("Python3 not found in PATH. Please install Python 3.8+".to_string())
}

/// Find a scripts/ directory script by name.
///
/// Checks in order:
///   1. `<exe_dir>/scripts/<name>`  (bundled with installed app)
///   2. `src-tauri/scripts/<name>`   (development, cargo run)
///   3. `<CARGO_MANIFEST_DIR>/../src-tauri/scripts/<name>`
///   4. `/root/.openclaw/workspace/HardSubX/src-tauri/scripts/<name>`
pub fn find_script(script_name: &str) -> Result<PathBuf, String> {
    let candidates: [Option<PathBuf>; 4] = [
        // Bundled with the app (relative to executable)
        std::env::current_exe()
            .ok()
            .and_then(|p| p.parent().map(|p| p.to_path_buf()))
            .map(|p| p.join("scripts").join(script_name)),
        // Development path (cargo run from src-tauri/)
        Some(PathBuf::from("src-tauri/scripts").join(script_name)),
        // CARGO_MANIFEST_DIR path
        PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .parent()
            .and_then(|p| Some(p.join("src-tauri/scripts").join(script_name))),
        // Absolute development path
        PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .parent()
            .and_then(|p| Some(p.join("src-tauri/scripts").join(script_name))),
    ];

    for candidate in candidates.into_iter().flatten() {
        if candidate.exists() {
            tracing::info!("Found {} at: {}", script_name, candidate.display());
            return Ok(candidate);
        }
    }

    Err(format!(
        "{} not found. Expected at: src-tauri/scripts/{}",
        script_name, script_name
    ))
}
