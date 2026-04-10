use tauri::AppHandle;
use tauri_plugin_dialog::Dialog;

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct FileFilter {
    pub name: String,
    pub extensions: Vec<String>,
}

impl FileFilter {
    pub fn to_filter_tuple(&self) -> (String, Vec<String>) {
        (self.name.clone(), self.extensions.clone())
    }
}

#[tauri::command]
pub async fn save_file_dialog(
    app: AppHandle,
    title: String,
    default_name: String,
    filters: Vec<FileFilter>,
) -> Result<String, String> {
    let mut builder = app.dialog().file().set_title(&title).set_file_name(&default_name);

    if filters.is_empty() {
        builder = builder.add_filter("All Files", &["*"]);
    } else {
        for filter in filters {
            let (name, extensions) = filter.to_filter_tuple();
            builder = builder.add_filter(&name, &extensions.iter().map(|s| s.as_str()).collect::<Vec<_>>());
        }
    }

    let file_path = builder.blocking_save_file();

    match file_path {
        Some(path) => Ok(path.to_string()),
        None => Err("No file selected".to_string()),
    }
}

#[tauri::command]
pub async fn open_file_dialog(
    app: AppHandle,
    title: String,
    filters: Vec<FileFilter>,
) -> Result<String, String> {
    let mut builder = app.dialog().file().set_title(&title);

    if filters.is_empty() {
        builder = builder
            .add_filter("Video Files", &["mp4", "mkv", "avi", "mov", "webm", "flv"])
            .add_filter("All Files", &["*"]);
    } else {
        for filter in filters {
            let (name, extensions) = filter.to_filter_tuple();
            builder = builder.add_filter(&name, &extensions.iter().map(|s| s.as_str()).collect::<Vec<_>>());
        }
    }

    let file_path = builder.blocking_pick_file();

    match file_path {
        Some(path) => Ok(path.to_string()),
        None => Err("No file selected".to_string()),
    }
}

#[tauri::command]
pub async fn write_text_file(
    path: String,
    content: String,
) -> Result<(), String> {
    std::fs::write(&path, &content)
        .map_err(|e| format!("Failed to write file {}: {}", path, e))
}

#[tauri::command]
pub async fn read_text_file(
    path: String,
) -> Result<String, String> {
    std::fs::read_to_string(&path)
        .map_err(|e| format!("Failed to read file {}: {}", path, e))
}

#[tauri::command]
pub async fn get_file_info(
    path: String,
) -> Result<FileInfo, String> {
    let metadata = std::fs::metadata(&path)
        .map_err(|e| format!("Failed to get file info: {}", e))?;
    
    Ok(FileInfo {
        path,
        size: metadata.len(),
        is_directory: metadata.is_dir(),
    })
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct FileInfo {
    pub path: String,
    pub size: u64,
    pub is_directory: bool,
}
