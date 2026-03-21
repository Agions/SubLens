use serde::{Deserialize, Serialize};

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
    // TODO: Implement with OpenCV
    Ok(VideoMetadata {
        path,
        width: 1920,
        height: 1080,
        duration: 150.0,
        fps: 30.0,
        total_frames: 4500,
        codec: "h264".to_string(),
    })
}

#[tauri::command]
pub async fn extract_frames(
    path: String,
    roi: ROI,
    options: ExtractOptions,
) -> Result<Vec<Frame>, String> {
    tracing::info!("Extracting frames from: {} with ROI: {:?}", path, roi);
    // TODO: Implement frame extraction with OpenCV
    Ok(vec![])
}

#[tauri::command]
pub async fn detect_scenes(
    path: String,
    threshold: f32,
) -> Result<Vec<u64>, String> {
    tracing::info!("Detecting scenes in: {} with threshold: {}", path, threshold);
    // TODO: Implement scene detection
    Ok(vec![])
}
