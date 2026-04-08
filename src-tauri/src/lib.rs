use tracing::info;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

mod commands;

pub use commands::*;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Initialize logging
    tracing_subscriber::registry()
        .with(tracing_subscriber::fmt::layer())
        .with(tracing_subscriber::EnvFilter::from_default_env())
        .init();

    info!("Starting HardSubX v3.0.0");

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            commands::video::get_video_metadata,
            commands::video::extract_frames,
            commands::video::extract_frame_at_time,
            commands::video::extract_cropped_frame_at_time,
            commands::video::detect_scenes,
            commands::ocr::process_frame,
            commands::ocr::process_roi,
            commands::export::export_subtitles,
            commands::export::export_multiple_formats,
            commands::file::save_file_dialog,
            commands::file::open_file_dialog,
            commands::file::write_text_file,
            commands::file::read_text_file,
            commands::file::get_file_info,
            commands::scene::detect_scenes,
            commands::scene::calculate_frame_similarity,
            commands::scene::get_video_info,
            commands::ocr_engine::init_ocr_engine,
            commands::ocr_engine::process_image_ocr,
            commands::ocr_engine::process_roi_ocr,
            commands::ocr_engine::get_available_ocr_engines,
            commands::ocr_engine::get_ocr_engine_info,
            commands::ocr_engine::ocr_image_tesseract,
            commands::ocr_engine::ocr_base64_image,
            commands::ocr_engine::process_paddle_ocr,
            commands::ocr_engine::check_paddle_ocr_available,
            commands::system::check_system_dependencies,
            commands::system::get_tesseract_languages,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
