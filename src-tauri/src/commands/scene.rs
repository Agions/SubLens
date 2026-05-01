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
//!
//! ## Frame Similarity
//!
//! The `calculate_frame_similarity()` function provides histogram-based
//! comparison for frames that don't involve scene cuts.

use serde::{Deserialize, Serialize};
use std::path::Path;

use super::utils::{find_python_binary, find_script, parse_fps_from_fraction};

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

    // Get video FPS for frame number calculation
    let fps = match get_video_fps(&video_path).await {
        Ok(f) => f,
        Err(e) => {
            tracing::warn!("Failed to get video FPS: {}, using default 30.0", e);
            30.0
        }
    };

    // Use scenedetect (Python) for reliable scene detection
    let scene_timestamps = detect_scenes_scenedetect(
        &video_path,
        config.threshold,
        config.min_scene_length.max(1),
    )
    .await?;

    // Convert timestamps to SceneChange list
    let scene_changes: Vec<SceneChange> = scene_timestamps
        .into_iter()
        .enumerate()
        .map(|(_i, timestamp)| SceneChange {
            frame_index: (timestamp * fps) as u64,
            timestamp,
            similarity: 0.0, // scenedetect doesn't provide per-frame similarity
        })
        .collect();

    tracing::info!("Detected {} scene changes", scene_changes.len());
    Ok(scene_changes)
}

/// Get video FPS using ffprobe (async)
async fn get_video_fps(path: &str) -> Result<f64, String> {
    let output = tokio::process::Command::new("ffprobe")
        .args([
            "-v", "quiet",
            "-print_format", "json",
            "-show_streams",
            path,
        ])
        .output()
        .await
        .map_err(|e| format!("Failed to run ffprobe: {}", e))?;

    if !output.status.success() {
        return Err("ffprobe exited with error".to_string());
    }

    let json_str = String::from_utf8_lossy(&output.stdout);
    let json: serde_json::Value = serde_json::from_str(&json_str)
        .map_err(|e| format!("Failed to parse ffprobe output: {}", e))?;

    // Find video stream
    let video_stream = json["streams"]
        .as_array()
        .and_then(|streams| {
            streams.iter().find(|s| s["codec_type"] == "video")
        })
        .ok_or("No video stream found")?;

    // Parse frame rate (e.g., "30000/1001" -> ~29.97)
    let fps_str = video_stream["r_frame_rate"].as_str().unwrap_or("30/1");
    let fps = parse_fps_from_fraction(fps_str);

    Ok(fps)
}

/// Detect scene changes using scenedetect Python library (async)
/// Replaces deprecated ffmpeg showinfo-based approach.
async fn detect_scenes_scenedetect(
    path: &str,
    threshold: f32,
    min_scene_len: u32,
) -> Result<Vec<f64>, String> {
    let python = find_python_binary().await?;
    let script = find_script("scene_detect.py")?;

    let threshold_arg = format!("{:.3}", threshold.clamp(0.05, 0.95));
    let min_scene_arg = min_scene_len.to_string();

    let output = tokio::process::Command::new(&python)
        .args([
            script.to_str().unwrap_or_default(),
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

#[tauri::command]
pub async fn calculate_frame_similarity(
    frame1_data: Vec<u8>,
    frame2_data: Vec<u8>,
    // NOTE: width and height parameters are reserved for future histogram-based
    // similarity calculation that considers spatial distribution. Currently using
    // global histogram approach that doesn't require dimensions.
    _width: u32,
    _height: u32,
) -> Result<f32, String> {
    // Validate input
    if frame1_data.len() != frame2_data.len() {
        return Err("Frame data length mismatch".to_string());
    }

    if frame1_data.is_empty() {
        return Err("Frame data is empty".to_string());
    }

    // Calculate histogram-based similarity
    let sample_count = (frame1_data.len() / 4).min(1000);
    if sample_count == 0 {
        return Ok(1.0);
    }

    let step = ((frame1_data.len() / 4) / sample_count).max(1);
    let mut total_diff = 0f32;

    for i in 0..sample_count {
        let idx = i * step * 4;
        if idx + 3 >= frame1_data.len() {
            break;
        }

        let r1 = frame1_data[idx] as f32;
        let g1 = frame1_data[idx + 1] as f32;
        let b1 = frame1_data[idx + 2] as f32;

        let r2 = frame2_data[idx] as f32;
        let g2 = frame2_data[idx + 1] as f32;
        let b2 = frame2_data[idx + 2] as f32;

        let diff = ((r1 - r2).powi(2) + (g1 - g2).powi(2) + (b1 - b2).powi(2)).sqrt();
        total_diff += diff;
    }

    let avg_diff = total_diff / sample_count as f32;
    let similarity = 1.0 - (avg_diff / 441.67).min(1.0); // Max RGB distance

    Ok(similarity)
}

#[tauri::command]
pub async fn get_video_info(path: String) -> Result<serde_json::Value, String> {
    let path_obj = Path::new(&path);

    if !path_obj.exists() {
        return Err(format!("File not found: {:?}", path_obj));
    }

    let metadata = tokio::fs::metadata(&path)
        .await
        .map_err(|e| format!("Cannot read file: {}", e))?;

    Ok(serde_json::json!({
        "exists": true,
        "is_file": metadata.is_file(),
        "is_dir": metadata.is_dir(),
        "size": metadata.len(),
        "name": path_obj.file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("unknown"),
        "extension": path_obj.extension()
            .and_then(|e| e.to_str())
            .unwrap_or(""),
    }))
}
