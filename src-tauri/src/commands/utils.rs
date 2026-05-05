//! Shared utilities for the SubLens commands layer.

use std::path::PathBuf;
use std::time::Duration;
use uuid::Uuid;
use tokio::process::Command;
use tokio::time::timeout;
use once_cell::sync::LazyLock;
use std::collections::HashMap;
use std::sync::Mutex;

/// Cached Python binary path - resolved once at first use and reused.
/// Avoids repeated PATH searches on every OCR/scene detection call.
static CACHED_PYTHON: LazyLock<Result<PathBuf, String>> = LazyLock::new(|| {
    let candidates = ["python3", "python", "python3.11", "python3.10", "python3.9"];
    for cmd in &candidates {
        // Use blocking Command for one-shot discovery at startup
        if let Ok(output) = std::process::Command::new(cmd)
            .arg("--version")
            .output()
        {
            if output.status.success() {
                tracing::info!("Cached Python binary: {}", cmd);
                return Ok(PathBuf::from(*cmd));
            }
        }
    }
    Err("Python3 not found in PATH. Please install Python 3.8+".to_string())
});

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
        if !line.contains("Video:") {
            continue;
        }

        // Split once, reuse for both width/height and fps parsing
        let parts: Vec<&str> = line.split(',').map(|p| p.trim()).collect();

        // Parse width x height (first part containing 'x')
        for part in &parts {
            if part.contains('x') {
                if let Some((w_str, h_str)) = part.split_once('x') {
                    let w_trimmed = w_str.trim();
                    let h_trimmed = h_str.trim();
                    // Handle "1920 x 1080" (spaced) vs "1920x1080"
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

        // Parse fps - look for "fps" keyword or bracketed number
        for part in &parts {
            // Pattern: "29.97 fps" or "30fps"
            if part.contains("fps") {
                let numeric = part.split_whitespace()
                    .next()
                    .unwrap_or("30")
                    .trim_end_matches(|c: char| !c.is_ascii_digit() && c != '.');
                if let Ok(f) = numeric.parse() {
                    fps = f;
                }
                break;
            }
            // Pattern: "[29.97]" or "(30)"
            if (part.starts_with('[') && part.ends_with(']'))
                || (part.starts_with('(') && part.ends_with(')')) {
                let inner = &part[1..part.len()-1];
                if let Ok(f) = inner.parse() {
                    fps = f;
                    break;
                }
            }
        }
        break; // Only process the first "Video:" line
    }

    if width == 1920 && height == 1080 {
        tracing::warn!("Could not parse video resolution from ffmpeg output, using default 1920x1080");
    }
    if fps == 30.0 {
        tracing::warn!("Could not parse video fps from ffmpeg output, using default 30.0");
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
    std::env::temp_dir().join("sublens")
}

/// Build a temp file path under the application temp directory.
pub fn temp_path(suffix: &str) -> PathBuf {
    let dir = temp_dir();
    let _ = std::fs::create_dir_all(&dir);
    dir.join(format!("sublens_{}_{}", uuid_v4(), suffix))
}

/// Find Python3/Python executable in PATH (async).
/// Now uses a cached static — the Python binary never changes at runtime.
pub async fn find_python_binary() -> Result<PathBuf, String> {
    CACHED_PYTHON.clone()
}

/// Cached script paths - each script is resolved once and reused.
/// Script locations don't change at runtime.
static SCRIPT_CACHE: LazyLock<Mutex<HashMap<String, PathBuf>>> =
    LazyLock::new(|| Mutex::new(HashMap::new()));

/// Find a scripts/ directory script by name (cached).
///
/// Checks in order:
///   1. `<exe_dir>/scripts/<name>`  (bundled with installed app)
///   2. `<CARGO_MANIFEST_DIR>/../src-tauri/scripts/<name>` (development)
///   3. `src-tauri/scripts/<name>`   (relative to cwd)
///
/// Results are cached after first lookup.
pub fn find_script(script_name: &str) -> Result<PathBuf, String> {
    // Fast path: return cached result
    if let Ok(cache) = SCRIPT_CACHE.lock() {
        if let Some(path) = cache.get(script_name) {
            tracing::debug!("Script cache hit: {} -> {}", script_name, path.display());
            return Ok(path.clone());
        }
    }

    let candidates: [Option<PathBuf>; 3] = [
        // Bundled with the app (relative to executable)
        std::env::current_exe()
            .ok()
            .and_then(|p| p.parent().map(|p| p.to_path_buf()))
            .map(|p| p.join("scripts").join(script_name)),
        // CARGO_MANIFEST_DIR path (development from repo root)
        std::env::var("CARGO_MANIFEST_DIR").ok().map(|dir| {
            PathBuf::from(&dir)
                .parent()
                .map(|p| p.join("src-tauri/scripts").join(script_name))
        }).flatten(),
        // Relative to cwd (cargo run from src-tauri/)
        Some(PathBuf::from("src-tauri/scripts").join(script_name)),
    ];

    for candidate in candidates.into_iter().flatten() {
        if candidate.exists() {
            tracing::info!("Found {} at: {} (caching)", script_name, candidate.display());
            // Cache the result for future lookups
            if let Ok(mut cache) = SCRIPT_CACHE.lock() {
                cache.insert(script_name.to_string(), candidate.clone());
            }
            return Ok(candidate);
        }
    }

    Err(format!(
        "{} not found. Expected at: src-tauri/scripts/{}",
        script_name, script_name
    ))
}

/// Execute a command with a timeout, returning the output or a timeout error.
///
/// # Arguments
/// * `cmd` - Command name
/// * `args` - Command arguments
/// * `timeout_duration` - Maximum duration to wait
///
/// # Returns
/// * `Ok(Output)` if command succeeds within timeout
/// * `Err(String)` if command fails or times out
pub async fn run_command_with_timeout(
    cmd: &str,
    args: &[&str],
    timeout_duration: Duration,
) -> Result<std::process::Output, String> {
    let output = timeout(
        timeout_duration,
        Command::new(cmd).args(args).output(),
    )
    .await
    .map_err(|_| format!("Command '{}' timed out after {:?}", cmd, timeout_duration))?
    .map_err(|e| format!("Failed to execute '{}': {}", cmd, e))?;

    Ok(output)
}
