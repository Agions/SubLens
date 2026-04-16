use tracing::info;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

mod commands;

// Explicitly re-export only specific items to avoid duplicate detect_scenes
pub use commands::file::{get_file_info, open_file_dialog, read_text_file, save_file_dialog, write_text_file};
pub use commands::ocr::{process_frame, process_roi};
pub use commands::ocr_engine::{
    check_paddle_ocr_available, get_available_ocr_engines, get_ocr_engine_info,
    init_ocr_engine, ocr_base64_image, ocr_image_tesseract, process_image_ocr,
    process_paddle_ocr, process_roi_ocr,
};
pub use commands::scene::{calculate_frame_similarity, detect_scenes, get_video_info};
pub use commands::system::{check_system_dependencies, get_tesseract_languages};
pub use commands::export::{export_multiple_formats, export_subtitles};
pub use commands::video::{extract_cropped_frame_at_time, extract_frame_at_time, extract_frames, get_video_metadata};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Initialize logging
    tracing_subscriber::registry()
        .with(tracing_subscriber::fmt::layer())
        .with(tracing_subscriber::EnvFilter::from_default_env())
        .init();

    info!("Starting SubLens v3.2.0");

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            commands::video::get_video_metadata,
            commands::video::extract_frames,
            commands::video::extract_frame_at_time,
            commands::video::extract_cropped_frame_at_time,
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
