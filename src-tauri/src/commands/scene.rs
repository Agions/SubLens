use serde::{Deserialize, Serialize};
use std::path::Path;

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
    
    // TODO: Implement actual scene detection using OpenCV
    // For now, return mock data
    let scenes = vec![
        SceneChange {
            frame_index: 0,
            timestamp: 0.0,
            similarity: 1.0,
        },
        SceneChange {
            frame_index: 450,
            timestamp: 15.0,
            similarity: 0.15,
        },
        SceneChange {
            frame_index: 900,
            timestamp: 30.0,
            similarity: 0.2,
        },
    ];
    
    Ok(scenes)
}

#[tauri::command]
pub async fn calculate_frame_similarity(
    frame1_data: Vec<u8>,
    frame2_data: Vec<u8>,
    width: u32,
    height: u32,
) -> Result<f32, String> {
    // Simple histogram-based similarity
    if frame1_data.len() != frame2_data.len() {
        return Err("Frame data length mismatch".to_string());
    }
    
    let sample_count = (frame1_data.len() / 4).min(1000);
    let step = (frame1_data.len() / 4) / sample_count;
    
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
    let similarity = 1.0 - (avg_diff / 441.67).min(1.0); // 441.67 is max possible distance in RGB
    
    Ok(similarity)
}

#[tauri::command]
pub fn get_video_info(path: String) -> Result<serde_json::Value, String> {
    let path = Path::new(&path);
    
    if !path.exists() {
        return Err(format!("File not found: {:?}", path));
    }
    
    // TODO: Extract actual video info using OpenCV
    // For now, return basic info
    Ok(serde_json::json!({
        "exists": true,
        "is_video": true,
        "name": path.file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("unknown")
    }))
}
