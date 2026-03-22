use serde::{Deserialize, Serialize};
use std::path::Path;

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
    
    // Fallback to file-based estimation
    tracing::warn!("ffprobe not available, using file-based estimation");
    let metadata = match std::fs::metadata(&path) {
        Ok(meta) => {
            let file_size = meta.len();
            // Estimate duration based on file size (rough estimate for video)
            // Assuming ~1MB per second for typical video
            let estimated_duration = file_size as f64 / 1_000_000.0;
            
            VideoMetadata {
                path: path.clone(),
                width: 1920,
                height: 1080,
                duration: estimated_duration.max(1.0),
                fps: 30.0,
                total_frames: (estimated_duration.max(1.0) * 30.0) as u64,
                codec: "unknown".to_string(),
            }
        }
        Err(_) => {
            return Err(format!("Cannot read file metadata: {}", path));
        }
    };
    
    Ok(metadata)
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
    
    // For now, we return empty frames - actual frame extraction
    // requires significant work with ffmpeg for cropping and ROI
    tracing::info!("Frame extraction with ROI support - use frontend Tesseract.js for OCR");
    
    // Return metadata about what would be extracted
    // The frontend will handle the actual frame capture via HTML5 video element
    Ok(vec![])
}

#[tauri::command]
pub async fn extract_frame_at_time(
    path: String,
    timestamp_secs: f64,
) -> Result<String, String> {
    // Extract a single frame as base64 PNG at the given timestamp
    use std::process::Command;
    
    // 使用 PID 和时间戳避免竞争
    let pid = std::process::id();
    let timestamp_ms = (timestamp_secs * 1000.0) as u64;
    let output_path = std::env::temp_dir().join(format!(
        "visionsub_frame_{}_{}.png", 
        pid,
        timestamp_ms
    ));
    
    let output = Command::new("ffmpeg")
        .args([
            "-ss", &format!("{}", timestamp_secs),
            "-i", &path,
            "-vframes", "1",
            "-q:v", "2",
            output_path.to_str().unwrap()
        ])
        .output()
        .map_err(|e| format!("Failed to extract frame: {}", e))?;
    
    if !output.status.success() {
        return Err("Failed to extract frame from video".to_string());
    }
    
    // Read the image and convert to base64
    let img_data = std::fs::read(&output_path)
        .map_err(|e| format!("Failed to read extracted frame: {}", e))?;
    
    let base64_str = base64::encode(&img_data);
    
    // Clean up temp file
    let _ = std::fs::remove_file(&output_path);
    
    Ok(format!("data:image/png;base64,{}", base64_str))
}

#[tauri::command]
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
