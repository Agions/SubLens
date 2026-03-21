use serde::{Deserialize, Serialize};
use tauri::AppHandle;
use tauri_plugin_dialog::DialogExt;

#[derive(Debug, Serialize, Deserialize)]
pub struct ExportOptions {
    pub formats: Vec<String>,
    pub include_thumbnails: bool,
    pub include_confidence: bool,
}

#[tauri::command]
pub async fn save_file_dialog(
    app: AppHandle,
    title: String,
    default_name: String,
    filters: Vec<serde_json::Value>,
) -> Result<String, String> {
    let file_path = app
        .dialog()
        .file()
        .set_title(&title)
        .set_file_name(&default_name)
        .add_filter("All Files", &["*"])
        .blocking_save_file();
    
    match file_path {
        Some(path) => Ok(path.to_string()),
        None => Err("No file selected".to_string()),
    }
}

#[tauri::command]
pub async fn open_file_dialog(
    app: AppHandle,
    title: String,
    filters: Vec<serde_json::Value>,
) -> Result<String, String> {
    let file_path = app
        .dialog()
        .file()
        .set_title(&title)
        .add_filter("Video Files", &["mp4", "mkv", "avi", "mov", "webm"])
        .add_filter("All Files", &["*"])
        .blocking_pick_file();
    
    match file_path {
        Some(path) => Ok(path.to_string()),
        None => Err("No file selected".to_string()),
    }
}

#[tauri::command]
pub fn write_text_file(path: String, content: String) -> Result<(), String> {
    std::fs::write(&path, &content)
        .map_err(|e| format!("Failed to write file: {}", e))
}

#[tauri::command]
pub fn read_text_file(path: String) -> Result<String, String> {
    std::fs::read_to_string(&path)
        .map_err(|e| format!("Failed to read file: {}", e))
}

#[tauri::command]
pub fn get_file_info(path: String) -> Result<serde_json::Value, String> {
    let metadata = std::fs::metadata(&path)
        .map_err(|e| format!("Failed to get file info: {}", e))?;
    
    let file_name = std::path::Path::new(&path)
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("unknown")
        .to_string();
    
    Ok(serde_json::json!({
        "path": path,
        "name": file_name,
        "size": metadata.len(),
        "is_file": metadata.is_file(),
        "is_dir": metadata.is_dir(),
    }))
}
