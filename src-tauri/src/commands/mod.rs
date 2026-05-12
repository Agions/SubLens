//! SubLens - Rust Tauri 后端命令层
//!
//! ## 模块结构
//!
//! | 模块 | 说明 |
//! |------|------|
//! | `types` | 共享数据类型（ROI） |
//! | `utils` | 工具函数（临时文件、UUID、Python 查找） |
//! | `video` | 视频元数据 + 帧提取 |
//! | `scene` | 场景检测（调用 scene_detect.py）|
//! | `export` | 导出命令入口 + 公共类型 |
//! | `export_fmt` | 12 格式具体实现 |
//! | `ffmpeg` | FFmpeg / ffprobe 输出解析 |
//! | `file` | 文件操作（对话框、读写） |
//! | `system` | 系统依赖检查（ffmpeg、tesseract）|
//! | `timestamp` | 时间戳格式化（SRT/VTT/ASS/SSA/SBV）|
//! | `ocr` | OCR 占位（逻辑已移至前端 WASM）|

pub mod types;
pub mod utils;
pub mod video;
pub mod scene;
pub mod export;
pub mod export_fmt;
pub mod ffmpeg;
pub mod file;
pub mod system;
pub mod timestamp;
pub mod ocr;
