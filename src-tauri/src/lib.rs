//! SubLens - Rust Tauri Application Library
//!
//! # Overview
//!
//! SubLens is a desktop application for extracting subtitles from videos using OCR.
//!
//! # Architecture
//!
//! ```text
//! ┌────────────────── Frontend (Vue.js) ──────────────────┐
//! │  OCR Tab  │  ROI Tab  │  Export Tab  │  Settings Tab  │
//! └───────────────────────┬───────────────────────────────┘
//!                         │ Tauri IPC
//! ┌───────────────────────┴───────────────────────────────┐
//! │                 Backend (Rust/Tauri)                  │
//! │  video   │  scene  │  export  │  file  │  system   │
//! └───────────────────────────────────────────────────────┘
//! ```
//!
//! All public `#[tauri::command]` functions are exposed to the frontend.

use tracing::info;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

mod commands;

pub use commands::export::{export_subtitles, ExportFormat, SubtitleItem};
pub use commands::file::{get_file_info, open_file_dialog, read_text_file, save_file_dialog, write_text_file};
pub use commands::scene::detect_scenes;
pub use commands::system::{check_system_dependencies, get_tesseract_languages};
pub use commands::video::{extract_frame_at_time, get_video_metadata};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tracing_subscriber::registry()
        .with(tracing_subscriber::fmt::layer())
        .with(tracing_subscriber::EnvFilter::from_default_env())
        .init();

    info!("Starting SubLens v{}", env!("CARGO_PKG_VERSION"));

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            commands::video::get_video_metadata,
            commands::video::extract_frame_at_time,
            commands::export::export_subtitles,
            commands::file::save_file_dialog,
            commands::file::open_file_dialog,
            commands::file::write_text_file,
            commands::file::read_text_file,
            commands::file::get_file_info,
            commands::scene::detect_scenes,
            commands::system::check_system_dependencies,
            commands::system::get_tesseract_languages,
        ])
        .run(tauri::generate_context!())
        .unwrap_or_else(|e| {
            tracing::error!("Failed to run Tauri application: {}", e);
            eprintln!("ERROR: Failed to start SubLens application: {}", e);
            std::process::exit(1);
        });
}
