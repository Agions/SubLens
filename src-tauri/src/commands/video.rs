use base64::Engine;
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};

use super::types::{BoundingBox, ROI};
use super::utils::{
    parse_duration_from_ffmpeg_output, parse_fps_from_fraction, parse_stream_from_ffmpeg_output,
    parse_time_to_seconds, uuid_v4, TempFileGuard,
};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VideoMetadata {
    pub path: String,
    pub width: u32,
    pub height: u32,
    pub duration: f64,
    pub fps: f64,
    pub total_frames: u64,
    pub codec: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Frame {
    pub index: u64,
    pub timestamp: f64,
    pub width: u32,
    pub height: u32,
    pub data: Vec<u8>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExtractOptions {
    pub scene_threshold: f32,
    pub frame_interval: u32,
    /// Optional max frames cap. None = unlimited (capped at 200,000 for safety).
    pub max_frames: Option<usize>,
}

#[tauri::command]
pub async fn get_video_metadata(path: String) -> Result<VideoMetadata, String> {
    tracing::info!("Getting metadata for: {}", path);

    let path_obj = Path::new(&path);

    if !path_obj.exists() {
        return Err(format!("File not found: {}", path));
    }

    // Try to use ffprobe for real metadata
    if let Ok(metadata) = get_video_metadata_ffprobe(&path).await {
        tracing::info!(
            "Got video metadata via ffprobe: {}x{} @ {} fps, {}s",
            metadata.width, metadata.height, metadata.fps, metadata.duration
        );
        return Ok(metadata);
    }

    // Fallback: try to get at least basic info via ffmpeg
    tracing::warn!("ffprobe not available, trying ffmpeg as fallback");
    if let Ok(metadata) = get_video_metadata_ffmpeg(&path).await {
        return Ok(metadata);
    }

    // Last resort: file-based estimation with video extension hint
    tracing::warn!("Using rough file-based estimation - results may be inaccurate");
    let metadata = match tokio::fs::metadata(&path).await {
        Ok(meta) => {
            let file_size = meta.len();
            let extension = path_obj
                .extension()
                .and_then(|e| e.to_str())
                .unwrap_or("")
                .to_lowercase();

            // 根据扩展名和文件大小做更合理的估算
            let (bitrate_per_sec, default_fps, default_width, default_height) =
                match extension.as_str() {
                    "mp4" | "m4v" => (2_000_000.0, 30.0, 1920, 1080),
                    "mkv" => (3_000_000.0, 30.0, 1920, 1080),
                    "webm" => (1_500_000.0, 30.0, 1920, 1080),
                    "avi" => (2_500_000.0, 30.0, 1920, 1080),
                    "mov" => (2_000_000.0, 30.0, 1920, 1080),
                    "flv" => (1_000_000.0, 25.0, 1280, 720),
                    _ => (2_000_000.0, 30.0, 1920, 1080),
                };

            let estimated_duration = (file_size as f64 / bitrate_per_sec).max(1.0);
            let fps = default_fps;
            let total_frames = (estimated_duration * fps) as u64;

            VideoMetadata {
                path: path.clone(),
                width: default_width,
                height: default_height,
                duration: estimated_duration,
                fps,
                total_frames,
                codec: extension.clone(),
            }
        }
        Err(_) => {
            return Err(format!("Cannot read file metadata: {}", path));
        }
    };

    Ok(metadata)
}

/// Get video metadata using ffmpeg (async, fallback when ffprobe unavailable)
async fn get_video_metadata_ffmpeg(path: &str) -> Result<VideoMetadata, String> {
    let output = tokio::process::Command::new("ffmpeg")
        .args(["-i", path, "-f", "null", "-"])
        .output()
        .await
        .map_err(|e| format!("Failed to run ffmpeg: {}", e))?;

    // ffmpeg outputs metadata to stderr
    let stderr = String::from_utf8_lossy(&output.stderr);

    // Parse duration from ffmpeg output
    let duration = parse_duration_from_ffmpeg_output(&stderr);
    let (width, height, fps) = parse_stream_from_ffmpeg_output(&stderr);

    if duration <= 0.0 {
        return Err("Could not determine video duration".to_string());
    }

    let total_frames = if fps > 0.0 {
        (duration * fps) as u64
    } else {
        0
    };

    Ok(VideoMetadata {
        path: path.to_string(),
        width,
        height,
        duration,
        fps,
        total_frames,
        codec: "unknown".to_string(),
    })
}

async fn get_video_metadata_ffprobe(path: &str) -> Result<VideoMetadata, String> {
    let output = tokio::process::Command::new("ffprobe")
        .args([
            "-v", "quiet",
            "-print_format", "json",
            "-show_format",
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

    let width = video_stream["width"].as_u64().unwrap_or(1920) as u32;
    let height = video_stream["height"].as_u64().unwrap_or(1080) as u32;

    // Parse frame rate (e.g., "30000/1001" -> ~29.97)
    let fps_str = video_stream["r_frame_rate"].as_str().unwrap_or("30/1");
    let fps = parse_fps_from_fraction(fps_str);

    let duration = json["format"]["duration"]
        .as_str()
        .and_then(|s| s.parse().ok())
        .unwrap_or(0.0);

    let codec = video_stream["codec_name"]
        .as_str()
        .unwrap_or("unknown")
        .to_string();

    let total_frames = if duration > 0.0 && fps > 0.0 {
        (duration * fps) as u64
    } else {
        video_stream["nb_frames"].as_u64().unwrap_or(0)
    };

    Ok(VideoMetadata {
        path: path.to_string(),
        width,
        height,
        duration,
        fps,
        total_frames,
        codec,
    })
}

#[tauri::command]
pub async fn extract_frames(
    path: String,
    roi: ROI,
    options: ExtractOptions,
) -> Result<Vec<Frame>, String> {
    tracing::info!("Extracting frames from: {} with ROI: {:?}", path, roi);

    let path_obj = Path::new(&path);
    if !path_obj.exists() {
        return Err(format!("File not found: {}", path));
    }

    // Get video metadata to determine total frames
    let metadata = match get_video_metadata_ffprobe(&path).await {
        Ok(m) => m,
        Err(e) => {
            tracing::error!("Failed to get video metadata: {}", e);
            return Err(format!(
                "Failed to get video metadata: {}. Is ffprobe installed?",
                e
            ));
        }
    };

    // Calculate frame interval
    let frame_interval = if options.frame_interval == 0 {
        1
    } else {
        options.frame_interval
    };
    let total_possible = ((metadata.total_frames as f64 / frame_interval as f64).ceil() as usize);
    // No hard cap — use options.max_frames if provided, else 200,000 as absolute safety max
    let max_frames = options.max_frames.unwrap_or(200_000);
    let total_extractable = total_possible.min(max_frames);

    if total_possible > max_frames {
        tracing::warn!(
            "Frame count truncated: {} frames at interval {} would exceed limit ({}). \
             Consider increasing frame_interval or processing in batches.",
            total_possible, frame_interval, max_frames
        );
    }

    tracing::info!(
        "Extracting {} frames at interval {} (of {} total at this interval)",
        total_extractable, frame_interval, total_possible
    );

    // Return frame metadata list.
    // Actual frame extraction with ROI applied must go through
    // extract_cropped_frame_at_time() which correctly wires the crop filter.
    // extract_frames() only returns timing metadata — it does NOT extract image data.
    if total_extractable == 0 {
        return Ok(vec![]);
    }
    let frames: Vec<Frame> = (0..total_extractable)
        .map(|i| {
            let frame_index = (i * frame_interval as usize) as u64;
            let timestamp = frame_index as f64 / metadata.fps;
            Frame {
                index: frame_index,
                timestamp,
                width: roi.width.min(metadata.width),
                height: roi.height.min(metadata.height),
                data: vec![],
            }
        })
        .collect();

    Ok(frames)
}

/// Extract a single frame with ROI cropping applied
#[tauri::command]
pub async fn extract_cropped_frame_at_time(
    path: String,
    timestamp_secs: f64,
    roi: ROI,
) -> Result<String, String> {
    let path_obj = Path::new(&path);
    if !path_obj.exists() {
        return Err(format!("File not found: {}", path));
    }

    // Get video metadata for ROI pixel calculation
    let metadata = get_video_metadata_ffprobe(&path)
        .await
        .map_err(|e| format!("Failed to get video metadata: {}", e))?;

    // Build crop filter
    let crop_filter = build_roi_crop_filter(&roi, metadata.width, metadata.height);

    // Use ffmpeg to extract cropped frame (async)
    let uuid = uuid_v4();
    let timestamp_ms = (timestamp_secs * 1000.0) as u64;
    let output_path = std::env::temp_dir().join(format!(
        "hardsubx_crop_{}_{}.png",
        timestamp_ms,
        uuid
    ));
    let _guard = TempFileGuard::new(output_path.clone()); // Auto-cleanup on function exit

    let output = tokio::process::Command::new("ffmpeg")
        .args([
            "-ss", &format!("{}", timestamp_secs),
            "-i", &path,
            "-vf", &crop_filter,
            "-vframes", "1",
            "-q:v", "2",
            output_path.to_str().unwrap(),
        ])
        .output()
        .await
        .map_err(|e| format!("Failed to run ffmpeg: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("ffmpeg failed: {}", stderr));
    }

    // Read and encode to base64
    let img_data = tokio::fs::read(&output_path)
        .await
        .map_err(|e| format!("Failed to read extracted frame: {}", e))?;

    let base64_str = base64::engine::general_purpose::STANDARD.encode(&img_data);

    Ok(format!("data:image/png;base64,{}", base64_str))
}

/// Build ffmpeg crop filter string from ROI parameters
fn build_roi_crop_filter(roi: &ROI, video_width: u32, video_height: u32) -> String {
    // Determine if ROI is in pixel or percent coordinates
    // Default to percent (0-100 range) for backward compatibility
    let (x, y, w, h) = if roi.unit == "pixel" {
        (roi.x, roi.y, roi.width, roi.height)
    } else {
        // Default: percent coordinates (0-100)
        let x = (roi.x as f32 / 100.0 * video_width as f32) as u32;
        let y = (roi.y as f32 / 100.0 * video_height as f32) as u32;
        let w = (roi.width as f32 / 100.0 * video_width as f32) as u32;
        let h = (roi.height as f32 / 100.0 * video_height as f32) as u32;
        (x, y, w, h)
    };

    format!("crop={}:{}:{}:{}", w, h, x, y)
}

#[tauri::command]
pub async fn extract_frame_at_time(
    path: String,
    timestamp_secs: f64,
) -> Result<String, String> {
    extract_frame_at_time_impl(&path, timestamp_secs, None).await
}

/// Extract a cropped frame at specific ROI (pixel coordinates)
#[tauri::command]
pub async fn extract_cropped_frame(
    path: String,
    timestamp_secs: f64,
    roi_x: f32,
    roi_y: f32,
    roi_width: f32,
    roi_height: f32,
) -> Result<String, String> {
    // Build ROI struct with explicit pixel unit to match build_roi_crop_filter semantics
    let roi = ROI {
        x: roi_x as u32,
        y: roi_y as u32,
        width: roi_width as u32,
        height: roi_height as u32,
        unit: "pixel".to_string(),
        ..Default::default()
    };
    // Get video metadata for video dimensions (needed by build_roi_crop_filter)
    let metadata = get_video_metadata_ffprobe(&path)
        .await
        .map_err(|e| format!("Failed to get video metadata: {}", e))?;
    let crop_filter = build_roi_crop_filter(&roi, metadata.width, metadata.height);
    extract_frame_at_time_impl(&path, timestamp_secs, Some(&crop_filter)).await
}

async fn extract_frame_at_time_impl(
    path: &str,
    timestamp_secs: f64,
    crop_filter: Option<&str>,
) -> Result<String, String> {
    // 使用 UUID + 时间戳避免竞争条件
    let uuid = uuid_v4();
    let timestamp_ms = (timestamp_secs * 1000.0) as u64;
    let output_path = std::env::temp_dir().join(format!(
        "hardsubx_frame_{}_{}.png",
        timestamp_ms,
        uuid
    ));
    let _guard = TempFileGuard::new(output_path.clone()); // Auto-cleanup on function exit

    // Build ffmpeg arguments
    let mut args = vec![
        "-ss".to_string(),
        format!("{}", timestamp_secs),
        "-i".to_string(),
        path.to_string(),
        "-vframes".to_string(),
        "1".to_string(),
        "-q:v".to_string(),
        "2".to_string(),
    ];

    // Add crop filter if specified
    if let Some(filter) = crop_filter {
        args.extend(["-vf".to_string(), filter.to_string()]);
    }

    args.push(output_path.to_string_lossy().into_owned());

    let output = tokio::process::Command::new("ffmpeg")
        .args(&args)
        .output()
        .await
        .map_err(|e| format!("Failed to run ffmpeg: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("ffmpeg failed: {}", stderr));
    }

    // Read the image and convert to base64
    let img_data = tokio::fs::read(&output_path)
        .await
        .map_err(|e| format!("Failed to read extracted frame: {}", e))?;

    let base64_str = base64::engine::general_purpose::STANDARD.encode(&img_data);

    Ok(format!("data:image/png;base64,{}", base64_str))
}
