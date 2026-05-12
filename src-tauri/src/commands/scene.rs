//! Scene detection module.
//!
//! Detects scene changes (shot transitions) in video files using the
//! [scenedetect](https://github.com/Breakthrough/PySceneDetect) Python library.
//!
//! ## Architecture
//!
//! ```text
//! Video File -> ffprobe (get FPS) -> scenedetect.py -> SceneChange[]
//! ```
//!
//! ## Scene Detection Algorithm
//!
//! Uses adaptive threshold detection via scenedetect:
//! - `threshold`: 0.05-0.95 (higher = less sensitive)
//! - `min_scene_length`: minimum frames between cuts

use serde::{Deserialize, Serialize};
use std::path::Path;

use super::utils::{find_python_binary, find_script};
use super::video::get_video_metadata;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SceneDetectionConfig {
    pub threshold: f32,
    pub min_scene_length: u32,
    pub frame_interval: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SceneChange {
    pub frame_index: u64,
    pub timestamp: f64,
    pub similarity: f32,
}

#[tauri::command]
pub async fn detect_scenes(
    video_path: String,
    config: SceneDetectionConfig,
) -> Result<Vec<SceneChange>, String> {
    tracing::info!("Detecting scenes in: {} with threshold: {}", video_path, config.threshold);

    let path = Path::new(&video_path);
    if !path.exists() {
        return Err(format!("File not found: {}", video_path));
    }

    let fps = match get_video_metadata(video_path.clone()).await {
        Ok(metadata) => metadata.fps,
        Err(e) => {
            tracing::warn!("Failed to get video FPS: {}, using default 30.0", e);
            30.0
        }
    };

    let scene_timestamps = detect_scenes_scenedetect(
        &video_path,
        config.threshold,
        config.min_scene_length.max(1),
    )
    .await?;

    let scene_changes: Vec<SceneChange> = scene_timestamps
        .into_iter()
        .enumerate()
        .map(|(_i, timestamp)| SceneChange {
            frame_index: (timestamp * fps) as u64,
            timestamp,
            similarity: 0.0,
        })
        .collect();

    tracing::info!("Detected {} scene changes", scene_changes.len());
    Ok(scene_changes)
}

async fn detect_scenes_scenedetect(
    path: &str,
    threshold: f32,
    min_scene_len: u32,
) -> Result<Vec<f64>, String> {
    let python = find_python_binary().await?;
    let script = find_script("scene_detect.py")?;

    let threshold_arg = format!("{:.3}", threshold.clamp(0.05, 0.95));
    let min_scene_arg = min_scene_len.to_string();

    let script_path = script.to_str().ok_or_else(|| {
        format!("scene_detect.py path is not valid UTF-8: {:?}", script)
    })?;

    let output = tokio::process::Command::new(&python)
        .args([
            script_path,
            path,
            &threshold_arg,
            &min_scene_arg,
        ])
        .output()
        .await
        .map_err(|e| format!("Failed to run scene_detect.py: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("scene_detect.py failed: {}", stderr));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let timestamps: Vec<f64> = serde_json::from_str(&stdout)
        .map_err(|e| format!("Failed to parse scene_detect.py JSON output: {}\nOutput: {}", e, stdout))?;

    Ok(timestamps)
}
