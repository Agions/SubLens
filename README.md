# HardSubX

<div align="center">
  <img src="public/logo.svg" width="120" height="120" alt="HardSubX" />
</div>

<div align="center">

Professional video hard subtitle extraction tool. Extract hardcoded subtitles from any video and output SRT, VTT, ASS, JSON and more. Built with Tauri + Vue 3 + Rust.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Stars](https://img.shields.io/github/stars/Agions/HardSubX?style=social)](https://github.com/Agions/HardSubX/stargazers)
[![GitHub Actions](https://img.shields.io/badge/GitHub-Actions-blue.svg)](https://github.com/Agions/HardSubX/actions)
[![Tauri](https://img.shields.io/badge/Tauri-FFC131?style=flat-square&logo=tauri&logoColor=FFC131)](https://tauri.app)
[![Vue](https://img.shields.io/badge/Vue.js-4FC08D?style=flat-square&logo=vuedotjs&logoColor=white)](https://vuejs.org)
[![Rust](https://img.shields.io/badge/Rust-000000?style=flat-square&logo=rust&logoColor=white)](https://www.rust-lang.org)

</div>

---

## Key Features

### Frame-Accurate Extraction
Every subtitle maps to exact video frames. View source frames directly from the subtitle list.

### Multi-Engine OCR

| Engine | Technology | Accuracy | Speed | Languages |
|:---|:---|:---:|:---:|:---:|
| **PaddleOCR** | PP-OCRv5 Deep Learning | Excellent | Fast | 80+ |
| **EasyOCR** | PyTorch | Good | Medium | 80+ |
| **Tesseract.js** | LSTM + WASM | Good | Fastest | 100+ |

### Smart Post-Processing
- Multi-pass OCR: recognize multiple times, take the best result
- Text normalization: full-width to half-width punctuation, Chinese typo correction
- Confidence calibration: mixed language / short text / repeated chars auto-degraded
- Subtitle merge: Levenshtein similarity auto-deduplication

### 9 Export Formats

| Format | Frame-Mapped | Best For |
|:---|:---:|:---|
| **SRT** | No | Universal subtitle players |
| **WebVTT** | No | Web video |
| **ASS** | No | Anime fansub, advanced styling |
| **JSON** | Yes | Frame-accurate editing |
| **CSV** | Yes | Spreadsheet analysis |
| **TXT** | No | Plain text |
| **LRC** | No | Lyrics |
| **SBV** | No | YouTube subtitles |
| **SSA** | No | Legacy subtitle format |

### Supported Input Video
MP4 · MKV · AVI · MOV · WebM

---

## Quick Start

```bash
# Clone the repo
git clone https://github.com/Agions/HardSubX.git
cd HardSubX

# Install frontend dependencies
pnpm install

# Run in development mode
pnpm tauri dev

# Build production package
pnpm tauri build
```

### CLI

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
HardSubX/
├── src/                         # Vue frontend
│   ├── components/             # Vue components
│   │   ├── common/            # Button, Modal, Tooltip
│   │   ├── layout/           # ToolBar, SidePanel, VideoPreview
│   │   ├── video/            # ROISelector, Timeline
│   │   └── subtitle/         # SubtitleList, ExportDialog
│   ├── composables/           # Vue composables
│   │   ├── useOCREngine.ts   # OCR engine + post-processing
│   │   ├── useVideoPlayer.ts
│   │   └── useBatchProcessor.ts
│   └── stores/               # Pinia stores
│
├── src-tauri/                 # Rust backend
│   └── src/commands/         # Tauri IPC commands
│       ├── video.rs          # Frame extraction, metadata, ffmpeg
│       ├── ocr_engine.rs      # PaddleOCR Python bridge
│       ├── ocr.rs            # EasyOCR / Tesseract.js
│       ├── scene.rs          # Scene detection (histogram + chi-square)
│       ├── export.rs          # Format writers (SRT/VTT/ASS/JSON...)
│       ├── file.rs           # File dialogs, read/write
│       └── system.rs         # System diagnostics, env check
│
├── docs/                     # Documentation
│   ├── index.md
│   ├── getting-started.md
│   ├── cli.md
│   └── architecture.md
│
└── cli/                     # Node.js CLI tool
```

---

## License

[MIT License](./LICENSE)
