# 架构设计

## 技术概览

SubLens 是基于 Tauri 2.x 的桌面应用，前端使用 Vue 3 + TypeScript，后端使用 Rust。核心原理：通过 OCR 从视频中识别硬编码（烧录）字幕，并输出帧级精确的字幕文件。

```
+-------------------------------------------------------------+
|                    Desktop Shell (Tauri 2.x)                |
|  +-------------------------------------------------------+  |
|  |                  Vue 3 + TypeScript                    |  |
|  |  +----------+  +------------+  +--------------------+ |  |
|  |  |  Pinia    |  | Composables|  |  Vue Components    | |  |
|  |  |  Stores   |  | (17 total) |  | (23 components)   | |  |
|  |  +----------+  +------------+  +--------------------+ |  |
|  +------------------------+------------------------------+  |
|                           | Tauri IPC (invoke)             |
|  +------------------------+------------------------------+  |
|  |                   Rust Backend Commands                 |  |
|  |  +--------+  +--------+  +--------+  +--------+        |  |
|  |  | video  |  |  ocr   |  | export |  |  file  |        |  |
|  |  +--------+  +--------+  +--------+  +--------+        |  |
|  +-------------------------------------------------------+  |
+-------------------------------------------------------------+
                          |
          +---------------+                  +----------------+
          v                                   v
+-------------------+               +------------------------+
|   OCR Engines     |               |    FFmpeg (CLI)        |
|  Tesseract.js     |               |  Frame extraction      |
|  PaddleOCR        |               |  Metadata probe        |
|  EasyOCR          |               +------------------------+
+-------------------+
```

## 前端架构（Vue 3） {#frontend}

### 目录结构

```
src/
├── components/           # Vue 组件
│   ├── common/           # Button, Modal, Tooltip, SubtitleToast, AboutDialog
│   ├── layout/           # ToolBar, SidePanel, VideoPreview, StatusBar
│   │   └── tabs/         # FilesTab / ProgressTab / ROITab / OCRTab / ExportTab / SettingsTab
│   ├── subtitle/         # SubtitleList, ExportDialog
│   └── video/            # Timeline, ROISelector
├── composables/          # 17 个组合式函数（逻辑/UI 分离）
├── stores/               # Pinia 状态管理
│   ├── subtitle.ts       # 字幕列表、导出格式、过滤器
│   ├── project.ts        # 项目状态、视频元数据、ROI
│   └── settings.ts       # 主题、语言、OCR 偏好
└── core/                 # 核心业务逻辑
    ├── SubtitlePipeline.ts  # 4 阶段 OCR 后处理
    ├── SubtitleExporter.ts # 12 格式导出器
    ├── SceneDetector.ts    # 直方图 + 卡方检验场景检测
    └── ConfidenceCalibrator.ts
```

### 状态管理（Pinia）

SubLens uses **Pinia** for frontend state with a clear separation:

- `subtitles.ts` — 字幕数据模型、搜索过滤、分页
- `project.ts` — 视频文件状态、元数据、ROI
- `settings.ts` — 主题、语言、OCR 偏好设置

### Composables 组合式函数

17 个 composables 分离 UI 与业务逻辑：

| Composable | 职责 |
|:---|:---|
| `useSubtitleList` | 字幕列表过滤、搜索、分页、CRUD |
| `useVideoPlayer` | 播放控制、帧捕获、seek |
| `useOCREngine` | OCR 引擎抽象 + 后处理 |
| `useSubtitleExtractor` | 提取会话管理 |
| `useBatchProcessor` | 多文件队列处理 |
| `useFileOperations` | 文件对话框、视频加载 |
| `useImagePreprocessor` | ROI 裁剪、对比度增强 |
| `useVideoMetadata` | 视频元数据提取 |
| `useTheme` | OKLCH 主题切换 |
| `useSystemCheck` | 依赖诊断 |
| `useKeyboardShortcuts` | 全局键盘快捷键 |

## 后端架构（Rust） {#backend}

```
src-tauri/src/
├── main.rs              # Tauri app entry
├── main_cli.rs          # CLI entry point (sublens-cli)
├── lib.rs               # Library root
└── commands/
    ├── video.rs          # FFmpeg 帧提取、元数据
    ├── ocr.rs            # EasyOCR / Tesseract.js
    ├── ocr_engine.rs     # PaddleOCR Python bridge
    ├── scene.rs          # 场景检测
    ├── export.rs         # 格式写入
    ├── file.rs           # 文件对话框
    └── system.rs         # 系统依赖诊断
```

所有 `std::process::Command` 和 `std::fs` 已替换为 `tokio::` 异步版本，主线程不再阻塞。

## 设计系统 {#design-system}

### OKLCH 色彩

SubLens uses the **OKLCH** color space for perceptually uniform colors across the UI.

### 字体

- UI: DM Sans（数字显示）
- Code / Monospace: JetBrains Mono

### 主题

- **Dark**: 专业视频剪辑风格，低饱和度
- **Light**: 干净明亮的文档风格
