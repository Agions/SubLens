# SubLens

<div align="center">
  <img src="public/logo.svg" width="120" height="120" alt="SubLens" />
</div>

<div align="center">

SubLens - 视频字幕提取工具，从视频中提取硬编码字幕，支持多种格式输出。基于 Tauri + Vue 3 + Rust 构建。

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Stars](https://img.shields.io/github/stars/Agions/HardSubX?style=social)](https://github.com/Agions/HardSubX/stargazers)
[![GitHub Actions](https://img.shields.io/badge/GitHub-Actions-blue.svg)](https://github.com/Agions/HardSubX/actions)
[![Tauri](https://img.shields.io/badge/Tauri-FFC131?style=flat-square&logo=tauri&logoColor=FFC131)](https://tauri.app)
[![Vue](https://img.shields.io/badge/Vue.js-4FC08D?style=flat-square&logo=vuedotjs&logoColor=white)](https://vuejs.org)
[![Rust](https://img.shields.io/badge/Rust-000000?style=flat-square&logo=rust&logoColor=white)](https://www.rust-lang.org)
[![简体中文](https://img.shields.io/badge/简体中文-中文-blue.svg)]

</div>

---

## Key Features

### 🎯 Frame-Accurate Extraction
Every subtitle maps to exact video frames. **Timeline thumbnail preview** shows actual video frames on hover.

### 🔍 Smart Subtitle Navigation
- **j/k keys** for quick subtitle jumping with toast preview
- **Confidence filter** (All / High / Medium / Low)
- **Search** within subtitle text
- **Virtual scrolling** for smooth performance with 1000+ subtitles

### 🎨 Professional UI
- **OKLCH design system** — perceptually uniform colors, consistent visual experience
- **Dark/light theme** — professional video editing aesthetics
- **Tab-based interface** — Files / Progress / ROI / OCR / Export / Settings
- **Micro-interactions** — hover effects, transitions, toast notifications

### 🤖 Multi-Engine OCR

| Engine | Technology | Accuracy | Speed | Languages |
|:---|:---|:---:|:---:|:---:|
| **PaddleOCR** | PP-OCRv5 Deep Learning | Excellent | Fast | 80+ |
| **EasyOCR** | PyTorch | Good | Medium | 80+ |
| **Tesseract.js** | LSTM + WASM | Good | Fastest | 100+ |

### ✨ Smart Post-Processing
- **Multi-pass OCR** — recognize multiple times, take the best result
- **Text normalization** — full-width to half-width punctuation, Chinese typo correction
- **Confidence calibration** — mixed language / short text / repeated chars auto-degraded
- **Subtitle merge** — Levenshtein similarity auto-deduplication
- **Scene detection** — histogram + chi-square test for intelligent frame sampling

### 📦 12 Export Formats

| Format | Frame-Mapped | Best For |
|:---|:---:|:---|
| **SRT** | No | Universal subtitle players |
| **WebVTT** | No | Web video |
| **ASS** | No | Anime fansub, advanced styling |
| **SSA** | No | Legacy subtitle format |
| **JSON** | Yes | Frame-accurate editing |
| **CSV** | Yes | Spreadsheet analysis |
| **TXT** | No | Plain text |
| **LRC** | No | Lyrics sync |
| **SBV** | No | YouTube subtitles |
| **MD** | No | Markdown documentation |
| **STL** | No | Spruce subtitle format |
| **TTML** | No | Timed Text ML |

### 📋 ROI Presets
Bottom · Top · Left · Right · Center · Custom — one-click selection

### 🎬 Supported Input Video
MP4 · MKV · AVI · MOV · WebM

---

## Quick Start

```bash
# Clone the repo
git clone https://github.com/Agions/HardSubX.git
cd SubLens

# Install frontend dependencies
pnpm install

# Run in development mode
pnpm tauri dev

# Build production package
pnpm tauri build
```

---

## CLI Usage

```bash
# Basic extraction
hardsubx-cli extract video.mp4 --output ./subs

# Multi-format output
hardsubx-cli extract video.mp4 --format srt,vtt,json --output ./subs

# Specify ROI region + OCR engine
hardsubx-cli extract video.mp4 --roi bottom --ocr paddle --lang ch,en

# Custom confidence threshold
hardsubx-cli extract video.mp4 --confidence 80

# Preview a specific frame
hardsubx-cli preview video.mp4 --frame 1500

# Show video metadata
hardsubx-cli info video.mp4

# Display help
hardsubx-cli --help
```

---

## Tech Stack

| Layer | Technology |
|:---|:---|
| Desktop Framework | Tauri 2.x |
| Frontend | Vue 3 + TypeScript |
| Backend | Rust |
| OCR Engines | Tesseract.js (WASM), PaddleOCR (Native), EasyOCR |
| State Management | Pinia |
| Build Tool | Vite |

---

## Project Structure

```
SubLens/
├── src/                         # Vue 3 frontend
│   ├── components/              # Vue components
│   │   ├── common/             # Button, Modal, Tooltip, SubtitleToast
│   │   ├── layout/             # ToolBar, SidePanel, VideoPreview
│   │   │   ├── tabs/           # Tab components (Files/Progress/ROI/OCR/Export/Settings)
│   │   │   ├── BatchProcessView.vue
│   │   │   └── StatusBar.vue
│   │   ├── video/              # ROISelector, Timeline (with thumbnail preview)
│   │   └── subtitle/           # SubtitleList, ExportDialog
│   ├── composables/            # 17 composables (logic/UI separation)
│   │   ├── useSubtitleList.ts  # Subtitle filtering, search, pagination
│   │   ├── useVideoPlayer.ts   # Video playback, captureFrame
│   │   ├── useOCREngine.ts     # OCR engine abstraction + post-processing
│   │   ├── useSubtitleExtractor.ts
│   │   ├── useBatchProcessor.ts
│   │   └── use*.ts             # Tab-specific composables
│   ├── stores/                 # Pinia stores
│   │   ├── subtitle.ts         # Subtitle list + export formats
│   │   ├── project.ts          # Project file state + video metadata
│   │   └── settings.ts         # Theme, language, OCR preferences
│   ├── core/                   # Business logic
│   │   ├── SubtitlePipeline.ts # 4-stage OCR post-processing
│   │   ├── SubtitleExporter.ts # 12 format writers
│   │   ├── SceneDetector.ts    # Histogram + chi-square scene detection
│   │   └── ConfidenceCalibrator.ts
│   └── types/                  # TypeScript type definitions
│
├── src-tauri/                  # Rust backend
│   └── src/
│       ├── commands/           # Tauri IPC commands
│       │   ├── video.rs        # Frame extraction, metadata, ffmpeg
│       │   ├── ocr_engine.rs   # PaddleOCR Python bridge
│       │   ├── ocr.rs          # EasyOCR / Tesseract.js
│       │   ├── scene.rs        # Scene detection
│       │   ├── export.rs       # Format writers
│       │   ├── file.rs         # File dialogs
│       │   └── system.rs       # System diagnostics
│       └── main.rs             # Tauri app entry
│
├── docs/                       # Documentation
│   ├── index.md               # Documentation hub
│   ├── getting-started.md      # Installation and first extraction
│   ├── architecture.md        # Project structure and design
│   └── cli.md                 # CLI reference
│
└── cli/                        # Node.js CLI tool
    └── src/
        ├── extract.ts
        ├── formats.ts
        └── index.ts
```

---

## License

[MIT License](./LICENSE)
