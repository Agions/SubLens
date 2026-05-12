# 变更日志

> 本文档内容与仓库根目录 [CHANGELOG.md](https://github.com/Agions/SubLens/blob/main/CHANGELOG.md) 同步。

## [3.6.0] - 2026-05-11

### 🔧 Refactoring — Dead Code Elimination

大规模死代码清理，通过静态分析删除从未被调用的代码，总计减少约 **1,500 行**。

**Rust 侧：**

| 文件 | 变化 | 说明 |
|------|------|------|
| `ocr_engine.rs` | 635→4 行 | 删除全部 9 个 OCR 命令（前端无调用） |
| `video.rs` | 434→301 行 | 删除 `extract_frames` 等 3 个死命令 |
| `scene.rs` | 208→115 行 | 删除 `get_video_info`、`calculate_frame_similarity` |
| `export.rs` | 381→341 行 | 删除 `export_multiple_formats` |
| `types.rs` | 154→95 行 | 删除 BoundingBox/OCRResultItem/OCRProcessResult/OCRConfig |
| `Cargo.toml` | -3 依赖 | 删除 `anyhow`、`thiserror`、`image` |

**前端侧：**

| 操作 | 文件 | 变化 |
|------|------|------|
| 删除 barrel | 5 个 index.ts | 零消费者使用 barrel 导入 |
| 删除死 composable | `useExport.ts` | -54 行 |
| 重写主题 | `themes/index.ts` | `darkTheme`/`lightTheme` 内联 |
| 删除死类型 | `subtitle.ts`/`video.ts` | -SubtitleExportOptions、-ROIPreset |

**活跃命令确认（11 个）：**

`get_video_metadata`、`extract_frame_at_time`（video） · `get_file_info`、`open_file_dialog`、`read_text_file`、`save_file_dialog`、`write_text_file`（file） · `detect_scenes`（scene） · `check_system_dependencies`、`get_tesseract_languages`（system） · `export_subtitles`（export）

---

## [3.5.1] - 2026-05-05

### 🔧 Refactoring — Code Duplication Elimination

前后端代码去重优化。

---

## [3.5.0] - 2026-04-16

### 🎨 Branding — Project Renamed to SubLens

项目正式更名：HardSubX → **SubLens**

---

## [3.4.0] - 2026-04-14

### ⚡ Performance — Async I/O

所有 `std::process::Command` 和 `std::fs` 替换为 `tokio::` async 版本。

---

## 更早版本

请参阅 [GitHub Releases](https://github.com/Agions/SubLens/releases) 查看完整历史。
