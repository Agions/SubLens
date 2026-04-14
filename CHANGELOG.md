# Changelog

All notable changes to HardSubX are documented here.

## [3.4.0] - 2026-04-14

### ⚡ Performance — Async I/O

**所有 `std::process::Command` 和 `std::fs` 替换为 `tokio::` async 版本**（主线程不再阻塞）:

| 文件 | 改动 |
|------|------|
| `scene.rs` | `get_video_fps`、`detect_scenes_ffmpeg`、`get_video_info` → `tokio::process::Command` + `tokio::fs` |
| `video.rs` | `get_video_metadata_ffprobe/ffmpeg`、`extract_frame_at_time_impl`、`detect_scenes_ffmpeg` → `tokio::async` |
| `ocr.rs` | `save_frame_to_temp_png`、`process_with_tesseract` → `tokio::async` |
| `ocr_engine.rs` | `ocr_image_tesseract`、`process_paddle_ocr`、`check_paddle_ocr_available`、`find_python_binary` → `tokio async` |
| `system.rs` | `check_single_dependency`、`get_tesseract_languages` → `tokio::process::Command` |
| `file.rs` | `write/read_text_file`、`get_file_info` → `tokio::fs` |
| `export.rs` | `export_subtitles` → `tokio::fs::write` |

---

## [3.3.1] - 2026-04-10

### 🏗️ Architecture Refactor

- **共享 types + utils 模块**：新建 `types.rs` / `utils.rs`，消除 3 处重复代码
  - 统一 `BoundingBox`（消除 `video.rs` / `ocr_engine.rs` 重复定义）
  - 统一 `ROI` 含 `to_pixels()` 方法（消除 `video.rs` 重复定义）
  - 统一 `OCRConfig` / `map_lang_to_tesseract()`（消除 `ocr.rs` 重复）
  - `TempFileGuard` RAII 结构（video.rs / ocr.rs 共用，自动清理临时文件）
  - 统一 `uuid_v4()` 生成函数（消除 `video.rs` / `ocr.rs` 重复）
- **ocr.rs 完全重写**：使用共享 `types` + `utils`，简化 temp 文件管理逻辑

### 🔧 Code Quality

- **历史失败清理**：删除 8 个历史失败 action runs，保持仓库整洁

---

## [3.3.0] - 2026-04-10

### 🎨 Design System v2.0

- **UI 设计系统全面重构**：OKLCH 色彩空间，专业字体（DM Sans/Geist）、标准化动效曲线
- **组件微交互对齐**：Button hover、Modal 背透、StatusBar 脉冲、SubtitleList 骨架屏
- **Rust 编译错误修复**：PathBuf trait 推断、dialog trait 导入、duplicate detect_scenes 宏冲突

### ⚡ Performance

- **mergeOCRResults 优化**：ROI selector 性能改进
- **Temp 文件清理**：RAII guard 自动清理临时帧文件

### 🔧 Code Quality

- **CI 三路并行**：quality / build / rust-test 完全并行，消除 needs 依赖
- **pnpm 缓存修复**：setup-node 缓存冲突解决

### Dependencies

- `base64`: downgrade 0.22（0.24 不存在）

---

## [3.2.1] - 2026-04-08

### Refactor

- Project renamed: VisionSub -> HardSubX (repository, documentation, source files, local directory)
- TypeScript Strict Mode: all `any` type violations fixed (7 files, 10+ occurrences)
- GitHub branding: 18 professional topics, English SEO description, SVG logo design

### Documentation

- Documentation rebuilt: 4 new pages (index / getting-started / cli / architecture)
- README updated: version badge fixed (3.1.1 -> 3.2.0), logo embedded in header

## [3.2.0] - 2026-04-04

### Added

- Confidence level filter + batch operations (Phase 3/4):
  - SubtitleList four-tier filter (All / High / Medium / Low) with real-time count display
  - Low-confidence badge pulse animation, click to jump to filtered view
  - Batch delete low-confidence subtitles button
  - Threshold slider shows exact subtitles to be excluded in real time
- Advanced OCR post-processing pipeline (Phase 4):
  - `filterJitterSubtitles`: removes short-duration OCR noise frames, absorbs into adjacent subtitles
  - `mergeSplitSubtitles`: detects and merges split identical subtitles across scene boundaries (gap <= 1.5s)
  - `calibrateConfidenceEnhanced`: refined confidence scoring (CJK bracket check / Latin uppercase penalty / sentence completeness detection / character diversity analysis)
  - `detectTextQualityIssues`: returns structured quality issue list for UI hints

### Improved

- Threshold normalization: `getConfidenceLevel()` unified (>= 0.85 high / >= 0.60 medium / < 0.60 low)
- PaddleOCR Native integration: Python bridge, CPU mode, ROI percent conversion, stdin JSON interface
- PADDLEOCR_SETUP.md guide added

### Refactor

- Confidence threshold constants: CONFIDENCE_HIGH (0.85) / CONFIDENCE_MID (0.60) moved to `types/video.ts`
- SubtitleLite type: post-processing functions use independent SubtitleLite type to avoid coupling with full SubtitleItem

## [3.1.1] - 2026-04-02

### Added

- OCR accuracy estimation dashboard: real-time accuracy estimate based on engine + language + settings combination, color-coded
- Engine selection cards: star ratings (accuracy/speed, 1-5), supported language count, tech stack labels
- Language selector (grouped): grouped by language family with country flags
- Advanced options panel (collapsible):
  - Multi-pass OCR (recognize multiple times, take best result)
  - Text post-processing (punctuation correction, traditional/simplified conversion, remove duplicate chars)
  - Subtitle merge (Levenshtein similarity threshold adjustable)
  - Scene detection sensitivity slider
  - Frame interval stepper

### Improved

- Extraction pipeline: Start button now triggers full OCR process
- OCR engine post-processing pipeline:
  - Full-width to half-width punctuation conversion
  - Confidence calibration (mixed language / ultra-short text / repeated chars auto-degraded)
  - Subtitle auto-merge (similarity >= 80% + time gap <= 0.5s)
- Scene detection: upgraded from pixel diff to 16-bin quantized histogram + chi-square test

### Fixed

- `Start Extraction` button not triggering actual OCR
- `redo()` boundary check missing
- Scene detection false positives on noisy frames

## [3.1.0] - 2026-03-23

### Added

- Export format expansion: TXT and Markdown (MD) support
- Subtitle processing utilities:
  - `mergeConsecutiveSubtitles()`
  - `deduplicateSubtitles()`
  - `splitByLanguage()`
  - `filterByConfidence()`
  - `sortByTime()`
- Format utilities: `getSupportedFormats()`, `getFormatDisplayName()`

### Improved

- Export options support `includeTimecode` parameter
- 12 export formats supported (SRT / VTT / ASS / JSON / TXT / MD / LRC / SBV / CSV / SSA / STL / TTML)

## [3.0.2] - Earlier releases

- Initial release
- OCR engine integration (Tesseract.js + CLI)
- Multiple subtitle format export
- System diagnostics panel
