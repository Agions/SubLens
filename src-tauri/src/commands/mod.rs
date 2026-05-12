//! SubLens - Rust Tauri 后端命令层
//!
//! 此模块包含所有与前端交互的 Tauri 命令，按功能分为：
//!
//! ## 模块结构
//!
//! - [`types`]        - 共享数据类型（ROI）
//! - [`utils`]        - 工具函数（临时文件管理、UUID、Python 查找）
//! - [`video`]        - 视频处理命令（提取帧、获取元数据）
//! - [`ocr`]          - OCR 占位模块（逻辑已移至前端 WASM）
//! - [`scene_detect`] - 场景检测命令（调用 scene_detect.py）
//! - [`export`]       - 导出命令入口 + 公共类型
//! - [`export_formats`]- 12 格式具体实现
//! - [`file_ops`]    - 文件操作命令（对话框、读写）
//! - [`system`]       - 系统依赖检查（ffmpeg、tesseract 等）
//! - [`timestamp`]    - 时间戳格式化（SRT/VTT/ASS/SSA/SBV）
//! - [`ffmpeg_output`] - FFmpeg / ffprobe 输出解析

pub mod types;
pub mod utils;
pub mod ffmpeg_output;  // FFmpeg / ffprobe 输出解析
pub mod video;
pub mod timestamp;       // 时间戳格式化
pub mod export;          // 导出命令入口 + 公共类型
pub mod export_formats;  // 12 格式具体实现
pub mod file_ops;       // 文件操作（对话框、读写）
pub mod scene_detect;   // 场景检测
pub mod ocr;           // OCR 占位
pub mod system;
