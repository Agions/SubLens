//! SubLens - Rust Tauri 后端命令层
//!
//! 此模块包含所有与前端交互的 Tauri 命令，按功能分为：
//!
//! ## 模块结构
//!
//! - [`types`] - 共享数据类型（BoundingBox、ROI、OCRConfig 等）
//! - [`utils`] - 工具函数（临时文件管理、UUID 生成、Python 查找）
//! - [`video`] - 视频处理命令（提取帧、获取元数据）
//! - [`ocr_engine`] - OCR 引擎统一接口（支持 Tesseract、PaddleOCR）
//! - [`scene`] - 场景检测命令（镜头切换检测）
//! - [`export`] - 字幕导出命令（SRT、VTT、ASS、JSON 等格式）
//! - [`file`] - 文件操作命令（对话框、读写文件）
//! - [`system`] - 系统依赖检查（ffmpeg、tesseract 等）
//!
//! ## 导出策略
//!
//! 为避免名称冲突，仅显式导出需要公开的命令和数据结构。
//! 内部实现细节保留在各自的模块中。

pub mod types;
pub mod utils;
pub mod video;
pub mod export;
pub mod file;
pub mod scene;
pub mod ocr_engine;
pub mod system;
