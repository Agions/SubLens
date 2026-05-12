//! SubLens - Rust Tauri Application Library
//!
//! # Overview
//!
//! SubLens is a desktop application for extracting subtitles from videos using OCR.
//! This crate provides the Tauri backend that handles:
//!
//! - **Video Processing**: Frame extraction, metadata reading
//! - **OCR Processing**: Handled in frontend via WASM (EasyOCR / Tesseract.js)
//! - **Scene Detection**: Shot change detection for efficient processing
//! - **Subtitle Export**: Multiple formats (SRT, VTT, ASS, JSON)
//! - **File Operations**: Native dialogs, file I/O
//!
//! # Architecture
//!
//! ```text
//! ┌─────────────────────────────────────────────────────────────┐
//! │                      Frontend (Vue.js)                       │
//! │   ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐     │
//! │   │  OCR (WASM)│  │  ROI    │  │  Export │  │ Settings│     │
//! │   │  Tab    │  │   Tab   │  │   Tab   │  │   Tab   │     │
//! │   └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘     │
//! └────────┼────────────┼────────────┼────────────┼───────────┘
//!          │            │            │            │
//!          └────────────┴────────────┴────────────┘
//!                          │ Tauri IPC
//! ┌─────────────────────────┴───────────────────────────────────┐
//! │                     Backend (Rust/Tauri)                    │
//! │   ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐ │
//! │   │  video   │  │scene_det│  │  export  │  │ file_ops │ │
//! │   │          │  │         │  │          │  │          │ │
//! │   └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘ │
//! │        │             │             │             │       │
//! │        └─────────────┴─────────────┴─────────────┘       │
//! │                          │                                │
//! │                   ┌──────┴──────┐                        │
//! │                   │   utils     │                        │
//! │                   │ ffmpeg_output│                       │
//! │                   │  timestamp  │                        │
//! └───────────────────┴─────────────┴────────────────────────┴─┘
//! ```
//!
//! # Tauri Commands
//!
//! All public functions decorated with `#[tauri::command]` are exposed to the frontend.
//! See individual modules for command documentation.

use tracing::info;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

mod commands;

// Explicit re-exports of all public Tauri commands
pub use commands::file_ops::{get_file_info, open_file_dialog, read_text_file, save_file_dialog, write_text_file};
pub use commands::scene_detect::detect_scenes;
pub use commands::system::{check_system_dependencies, get_tesseract_languages};
pub use commands::export::{export_subtitles, ExportFormat, SubtitleItem};
pub use commands::video::{extract_frame_at_time, get_video_metadata};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Initialize logging
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
            commands::file_ops::save_file_dialog,
            commands::file_ops::open_file_dialog,
            commands::file_ops::write_text_file,
            commands::file_ops::read_text_file,
            commands::file_ops::get_file_info,
            commands::scene_detect::detect_scenes,
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
