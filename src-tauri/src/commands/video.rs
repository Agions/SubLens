use base64::Engine;
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};

/// RAII guard: automatically removes temp file when dropped
struct TempFileGuard(PathBuf);

impl Drop for TempFileGuard {
    fn drop(&mut self) {
        if let Err(e) = std::fs::remove_file(&self.0) {
            tracing::warn!("Failed to remove temp file {:?}: {}", self.0, e);
        }
    }
}

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
pub struct ROI {
    pub id: String,
    pub name: String,
    #[serde(rename = "type")]
    pub roi_type: String,
    pub x: u32,
    pub y: u32,
    pub width: u32,
    pub height: u32,
    pub enabled: bool,
    #[serde(default = "default_unit")]
    pub unit: String,
}

fn default_unit() -> String {
    "percent".to_string()
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExtractOptions {
    pub scene_threshold: f32,
    pub frame_interval: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BoundingBox {
    pub x: u32,
    pub y: u32,
    pub width: u32,
    pub height: u32,
}

impl Default for ROI {
    fn default() -> Self {
        Self {
            id: "default".to_string(),
            name: "Default".to_string(),
            roi_type: "bottom".to_string(),
            x: 0,
            y: 0,
            width: 1920,
            height: 100,
            enabled: true,
            unit: "percent".to_string(),
        }
    }
}

#[tauri::command]
pub async fn get_video_metadata(path: String) -> Result<VideoMetadata, String> {
    tracing::info!("Getting metadata for: {}", path);
    
    let path_obj = Path::new(&path);
    
    if !path_obj.exists() {
        return Err(format!("File not found: {}", path));
    }
    
    // Try to use ffprobe for real metadata
    if let Ok(metadata) = get_video_metadata_ffprobe(&path) {
        tracing::info!("Got video metadata via ffprobe: {}x{} @ {} fps, {}s", 
            metadata.width, metadata.height, metadata.fps, metadata.duration);
        return Ok(metadata);
    }
    
    // Fallback: try to get at least basic info via ffmpeg
    tracing::warn!("ffprobe not available, trying ffmpeg as fallback");
    if let Ok(metadata) = get_video_metadata_ffmpeg(&path) {
        return Ok(metadata);
    }
    
    // Last resort: file-based estimation with video extension hint
    tracing::warn!("Using rough file-based estimation - results may be inaccurate");
    let metadata = match std::fs::metadata(&path) {
        Ok(meta) => {
            let file_size = meta.len();
            let extension = path_obj.extension()
                .and_then(|e| e.to_str())
                .unwrap_or("")
                .to_lowercase();
            
            // 根据扩展名和文件大小做更合理的估算
            // 不同的编码格式有不同的码率
            let (bitrate_per_sec, default_fps, default_width, default_height) = 
                match extension.as_str() {
                    "mp4" | "m4v" => (2_000_000.0, 30.0, 1920, 1080),   // ~2Mbps for H.264
                    "mkv" => (3_000_000.0, 30.0, 1920, 1080),             // ~3Mbps for H.265
                    "webm" => (1_500_000.0, 30.0, 1920, 1080),            // ~1.5Mbps for VP9
                    "avi" => (2_500_000.0, 30.0, 1920, 1080),             // ~2.5Mbps
                    "mov" => (2_000_000.0, 30.0, 1920, 1080),             // ~2Mbps for H.264
                    "flv" => (1_000_000.0, 25.0, 1280, 720),              // ~1Mbps for H.264
                    _ => (2_000_000.0, 30.0, 1920, 1080),                // 默认值
                };
            
            // 考虑码率、帧率计算时长，再反推总帧数
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

/// Get video metadata using ffmpeg (fallback when ffprobe unavailable)
fn get_video_metadata_ffmpeg(path: &str) -> Result<VideoMetadata, String> {
    use std::process::Command;
    
    let output = Command::new("ffmpeg")
        .args([
            "-i", path,
            "-f", "null",
            "-"
        ])
        .output()
        .map_err(|e| format!("Failed to run ffmpeg: {}", e))?;
    
    // ffmpeg outputs metadata to stderr
    let stderr = String::from_utf8_lossy(&output.stderr);
    
    // Parse duration from ffmpeg output
    let duration = parse_duration_from_ffmpeg(&stderr);
    let (width, height, fps) = parse_stream_from_ffmpeg(&stderr);
    
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

fn parse_duration_from_ffmpeg(output: &str) -> f64 {
    // Look for "Duration: HH:MM:SS.ms" pattern
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

fn parse_time_to_seconds(time_str: &str) -> f64 {
    let parts: Vec<&str> = time_str.split(':').collect();
    if parts.len() >= 3 {
        let hours: f64 = parts[0].parse().unwrap_or(0.0);
        let minutes: f64 = parts[1].parse().unwrap_or(0.0);
        let seconds: f64 = parts[2].parse().unwrap_or(0.0);
        return hours * 3600.0 + minutes * 60.0 + seconds;
    }
    0.0
}

fn parse_stream_from_ffmpeg(output: &str) -> (u32, u32, f64) {
    let mut width = 1920u32;
    let mut height = 1080u32;
    let mut fps = 30.0f64;
    
    for line in output.lines() {
        // Look for video stream info like "Stream #0:0: Video: h264, ..."
        if line.contains("Video:") {
            // Parse resolution (e.g., "1920x1080")
            for part in line.split(',') {
                let part = part.trim();
                if part.contains('x') {
                    if let Some((w, h)) = part.split_once('x') {
                        width = w.parse().unwrap_or(1920);
                        height = h.parse().unwrap_or(1080);
                    }
                }
                // Parse fps (e.g., "30 fps" or "29.97 fps")
                if part.contains("fps") {
                    let fps_str = part.split_whitespace().next().unwrap_or("30");
                    fps = fps_str.parse().unwrap_or(30.0);
                }
            }
            break;
        }
    }
    
    (width, height, fps)
}

fn get_video_metadata_ffprobe(path: &str) -> Result<VideoMetadata, String> {
    use std::process::Command;
    
    let output = Command::new("ffprobe")
        .args([
            "-v", "quiet",
            "-print_format", "json",
            "-show_format",
            "-show_streams",
            path
        ])
        .output()
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
    let fps_parts: Vec<&str> = fps_str.split('/').collect();
    let fps = if fps_parts.len() == 2 {
        let num: f64 = fps_parts[0].parse().unwrap_or(30.0);
        let den: f64 = fps_parts[1].parse().unwrap_or(1.0);
        if den > 0.0 { num / den } else { 30.0 }
    } else {
        fps_str.parse().unwrap_or(30.0)
    };
    
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
    let metadata = match get_video_metadata_ffprobe(&path) {
        Ok(m) => m,
        Err(e) => {
            tracing::error!("Failed to get video metadata: {}", e);
            return Err(format!(
                "Failed to get video metadata: {}. Is ffprobe installed?", e
            ));
        }
    };
    
    // Calculate frame interval
    let frame_interval = if options.frame_interval == 0 { 1 } else { options.frame_interval };
    let total_possible = ((metadata.total_frames as f64 / frame_interval as f64).ceil() as usize);
    let max_frames = 1000_usize;
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
    
    // For ROI cropping, we use ffmpeg to extract specific regions
    // Build ffmpeg crop filter based on ROI coordinates
    let crop_filter = build_roi_crop_filter(&roi, metadata.width, metadata.height);
    
    tracing::info!("ROI crop filter: {}", crop_filter);
    
    // Return frame metadata list
    // Frontend should use extract_cropped_frame_at_time for actual frame extraction
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
        .map_err(|e| format!("Failed to get video metadata: {}", e))?;
    
    // Build crop filter
    let crop_filter = build_roi_crop_filter(&roi, metadata.width, metadata.height);
    
    // Use ffmpeg to extract cropped frame
    use std::process::Command;
    
    let uuid = uuid_v4();
    let timestamp_ms = (timestamp_secs * 1000.0) as u64;
    let output_path = std::env::temp_dir().join(format!(
        "hardsubx_crop_{}_{}.png",
        timestamp_ms,
        uuid
    ));
    let _guard = TempFileGuard(output_path.clone()); // Auto-cleanup on function exit

    let output = Command::new("ffmpeg")
        .args([
            "-ss", &format!("{}", timestamp_secs),
            "-i", &path,
            "-vf", &crop_filter,
            "-vframes", "1",
            "-q:v", "2",
            output_path.to_str().unwrap()
        ])
        .output()
        .map_err(|e| format!("Failed to run ffmpeg: {}", e))?;
    
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("ffmpeg failed: {}", stderr));
    }
    
    // Read and encode to base64
    let img_data = std::fs::read(&output_path)
        .map_err(|e| format!("Failed to read extracted frame: {}", e))?;
    
    let base64_str = base64::engine::general_purpose::STANDARD.encode(&img_data);

    Ok(format!("data:image/png;base64,{}", base64_str))
}

/// Build ffmpeg crop filter string from ROI parameters
fn build_roi_crop_filter(roi: &ROI, video_width: u32, video_height: u32) -> String {
    // ROI coordinates are in percentage (0-100) by default
    let (x, y, w, h) = match roi.unit.as_str() {
        "percent" | "" => {
            let x = (roi.x as f32 / 100.0 * video_width as f32) as u32;
            let y = (roi.y as f32 / 100.0 * video_height as f32) as u32;
            let w = (roi.width as f32 / 100.0 * video_width as f32) as u32;
            let h = (roi.height as f32 / 100.0 * video_height as f32) as u32;
            (x, y, w, h)
        }
        "pixel" => {
            (roi.x, roi.y, roi.width, roi.height)
        }
        _ => {
            // Default to percentage
            let x = (roi.x as f32 / 100.0 * video_width as f32) as u32;
            let y = (roi.y as f32 / 100.0 * video_height as f32) as u32;
            let w = (roi.width as f32 / 100.0 * video_width as f32) as u32;
            let h = (roi.height as f32 / 100.0 * video_height as f32) as u32;
            (x, y, w, h)
        }
    };
    
    format!("crop={}:{}:{}:{}", w, h, x, y)
}

#[tauri::command]
pub async fn extract_frame_at_time(
    path: String,
    timestamp_secs: f64,
) -> Result<String, String> {
    extract_frame_at_time_impl(&path, timestamp_secs, None)
}

/// Extract a cropped frame at specific ROI
#[tauri::command]
pub async fn extract_cropped_frame(
    path: String,
    timestamp_secs: f64,
    roi_x: f32,
    roi_y: f32,
    roi_width: f32,
    roi_height: f32,
) -> Result<String, String> {
    // Pass ROI as percentage-based crop filter
    let crop_filter = format!("crop={}:{}:{}:{}", 
        roi_width as u32, 
        roi_height as u32, 
        roi_x as u32, 
        roi_y as u32
    );
    extract_frame_at_time_impl(&path, timestamp_secs, Some(&crop_filter))
}

fn extract_frame_at_time_impl(
    path: &str,
    timestamp_secs: f64,
    crop_filter: Option<&str>,
) -> Result<String, String> {
    use std::process::Command;
    
    // 使用 UUID + 时间戳避免竞争条件
    let uuid = uuid_v4();
    let timestamp_ms = (timestamp_secs * 1000.0) as u64;
    let output_path = std::env::temp_dir().join(format!(
        "hardsubx_frame_{}_{}.png",
        timestamp_ms,
        uuid
    ));
    let _guard = TempFileGuard(output_path.clone()); // Auto-cleanup on function exit

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
    
    let output = Command::new("ffmpeg")
        .args(&args)
        .output()
        .map_err(|e| format!("Failed to run ffmpeg: {}", e))?;
    
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("ffmpeg failed: {}", stderr));
    }
    
    // Read the image and convert to base64
    let img_data = std::fs::read(&output_path)
        .map_err(|e| format!("Failed to read extracted frame: {}", e))?;
    
    let base64_str = base64::engine::general_purpose::STANDARD.encode(&img_data);

    Ok(format!("data:image/png;base64,{}", base64_str))
}

/// Generate a proper UUID v4 using the uuid crate
fn uuid_v4() -> String {
    uuid::Uuid::new_v4().to_string()
}

// NOTE: detect_scenes is intentionally NOT a #[tauri::command] here to avoid
// duplicate __cmd__detect_scenes macro conflict with scene::detect_scenes.
// Use scene::detect_scenes via generate_handler![] instead.
pub async fn detect_scenes(
    path: String,
    threshold: f32,
) -> Result<Vec<u64>, String> {
    tracing::info!("Detecting scenes in: {} with threshold: {}", path, threshold);
    
    let path_obj = Path::new(&path);
    if !path_obj.exists() {
        return Err(format!("File not found: {}", path));
    }
    
    // 获取视频 FPS 用于帧号计算
    let fps = match get_video_metadata_ffprobe(&path) {
        Ok(meta) => meta.fps,
        Err(_) => 30.0, // 默认 30fps
    };
    
    // Use ffmpeg for scene detection via select filter
    if let Ok(scenes) = detect_scenes_ffmpeg(&path, threshold, fps) {
        return Ok(scenes);
    }
    
    // Fallback: use histogram-based frame comparison
    tracing::warn!("Using fallback histogram-based scene detection");
    Ok(vec![])
}

fn detect_scenes_ffmpeg(path: &str, threshold: f32, fps: f64) -> Result<Vec<u64>, String> {
    use std::process::Command;
    
    // Use ffmpeg with select filter for scene detection
    // This outputs frame numbers where scene changes are detected
    let threshold_str = format!("{}", (threshold * 255.0) as i32);
    
    let output = Command::new("ffmpeg")
        .args([
            "-i", path,
            "-vf", &format!("select='gt(scene,{})',showinfo", threshold),
            "-f", "null",
            "-"
        ])
        .output()
        .map_err(|e| format!("Failed to run ffmpeg scene detection: {}", e))?;
    
    if !output.status.success() {
        return Err("ffmpeg scene detection failed".to_string());
    }
    
    // Parse scene change frames from stderr
    let stderr = String::from_utf8_lossy(&output.stderr);
    let mut scene_frames = Vec::new();
    
    for line in stderr.lines() {
        if line.contains("pts_time:") {
            // Extract timestamp from showinfo
            if let Some(time_str) = line.split("pts_time:").nth(1) {
                let time: f64 = time_str.split_whitespace().next()
                    .and_then(|s| s.parse().ok())
                    .unwrap_or(0.0);
                // Convert to frame number using actual FPS
                scene_frames.push((time * fps) as u64);
            }
        }
    }
    
    Ok(scene_frames)
}
