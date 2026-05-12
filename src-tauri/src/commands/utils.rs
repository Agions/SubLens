//! Shared utilities for the SubLens commands layer.
//!
//! ## Contents
//!
//! | Item | Type | Description |
//! |------|------|-------------|
//! | [`CACHED_PYTHON`] | `LazyLock` | Cached Python binary path discovery |
//! | [`TempFileGuard`] | struct | RAII temp-file auto-cleanup |
//! | [`uuid_v4()`] | fn | Cryptographically random UUID v4 string |
//! | [`find_python_binary()`] | async fn | Async Python binary lookup (uses cache) |
//! | [`find_script()`] | fn | Locate bundled scripts with multi-path fallback |
//! | [`run_command_with_timeout()`] | async fn | Execute a command with a hard timeout |
//!
//! FFmpeg / ffprobe output parsing lives in [`super::ffmpeg`].

use std::path::PathBuf;
use std::sync::LazyLock;
use std::time::Duration;
use std::{collections::HashMap, sync::Mutex};
use uuid::Uuid;
use tokio::process::Command;
use tokio::time::timeout;

// ─── Python binary cache ──────────────────────────────────────────────────────

/// Cached Python binary path — resolved once at first use and reused.
/// Avoids repeated PATH searches on every OCR/scene detection call.
static CACHED_PYTHON: LazyLock<Result<PathBuf, String>> = LazyLock::new(|| {
    let candidates = ["python3", "python", "python3.11", "python3.10", "python3.9"];
    for cmd in &candidates {
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

// ─── Script path cache ───────────────────────────────────────────────────────

/// Cached script paths — each script is resolved once and reused.
static SCRIPT_CACHE: LazyLock<Mutex<HashMap<String, PathBuf>>> =
    LazyLock::new(|| Mutex::new(HashMap::new()));

// ─── Temp file guard ─────────────────────────────────────────────────────────

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
}

impl Drop for TempFileGuard {
    fn drop(&mut self) {
        if let Err(e) = std::fs::remove_file(&self.0) {
            tracing::warn!("Failed to remove temp file {:?}: {}", self.0, e);
        }
    }
}

// ─── UUID ────────────────────────────────────────────────────────────────────

/// Generate a cryptographically random UUID v4 string.
pub fn uuid_v4() -> String {
    Uuid::new_v4().to_string()
}

// ─── Python binary lookup ────────────────────────────────────────────────────

/// Find Python3/Python executable in PATH (async).
/// Now uses a cached static — the Python binary never changes at runtime.
pub async fn find_python_binary() -> Result<PathBuf, String> {
    CACHED_PYTHON.clone()
}

// ─── Script lookup ────────────────────────────────────────────────────────────

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
        std::env::var("CARGO_MANIFEST_DIR")
            .ok()
            .map(|dir| {
                PathBuf::from(&dir)
                    .parent()
                    .map(|p| p.join("src-tauri/scripts").join(script_name))
            })
            .flatten(),
        // Relative to cwd (cargo run from src-tauri/)
        Some(PathBuf::from("src-tauri/scripts").join(script_name)),
    ];

    for candidate in candidates.into_iter().flatten() {
        if candidate.exists() {
            tracing::info!(
                "Found {} at: {} (caching)",
                script_name,
                candidate.display()
            );
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

// ─── Command execution ────────────────────────────────────────────────────────

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
