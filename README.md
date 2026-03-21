# VisionSub v3.0

<div align="center">

### 🔥 Professional Video Subtitle Extraction Tool

**Tauri + Vue 3 + TypeScript + SCSS**

*[English](./README.md) · 中文*

</div>

---

## ✨ Features

### 🎬 Desktop Application
- **Modern UI**: Dark tech theme inspired by professional video editing software
- **Visual ROI Selection**: Drag & drop subtitle region selection with presets
- **Real-time Preview**: Live OCR preview with frame navigation
- **Multi-format Export**: SRT, WebVTT, ASS, JSON (with frame mapping)

### ⌨️ CLI Tool
```bash
# Extract subtitles
visionsub-cli extract video.mp4 --output ./subs --format srt,vtt,json

# Preview frame
visionsub-cli preview video.mp4 --frame 1500

# Get video info
visionsub-cli info video.mp4
```

### 🗺️ Frame-Subtitle Mapping
Each subtitle entry contains:
- Start/End frame numbers
- Associated frame thumbnails
- ROI source region
- Confidence score

## 🛠️ Tech Stack

| Layer | Technology |
|:---|:---|
| Desktop Framework | Tauri 2.x |
| Frontend | Vue 3 + TypeScript |
| Styling | SCSS + CSS Variables |
| State Management | Pinia |
| Video Processing | WebCodecs API / Native FFmpeg |
| OCR Engine | Tesseract.js (WASM) / PaddleOCR |

## 📂 Project Structure

```
visionsub/
├── src/                          # Vue Frontend
│   ├── components/             # UI Components
│   │   ├── layout/           # Layout (ToolBar, SidePanel...)
│   │   ├── video/            # Video player, ROI selector
│   │   └── subtitle/         # Subtitle list, editor
│   ├── composables/           # Vue Composables
│   ├── stores/               # Pinia Stores
│   └── types/                # TypeScript Types
│
├── src-tauri/                 # Rust Backend
│   ├── src/
│   │   ├── commands/         # Tauri IPC Commands
│   │   │   ├── video.rs    # Video processing
│   │   │   ├── ocr.rs      # OCR integration
│   │   │   └── export.rs    # Subtitle export
│   │   └── lib.rs
│   └── Cargo.toml
│
├── SPEC.md                    # Design Specification
└── README.md
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Rust 1.70+
- pnpm 8+

### Install Dependencies

```bash
# Install frontend dependencies
pnpm install

# Install Rust dependencies
cd src-tauri && cargo build
```

### Development

```bash
# Run frontend dev server
pnpm dev

# Run Tauri app
pnpm tauri dev
```

### Build

```bash
# Build frontend
pnpm build

# Build Tauri app
pnpm tauri build
```

## 🎯 Supported Formats

### Input Video
| Format | Extension |
|:---|:---|
| MP4 | .mp4 |
| MKV | .mkv |
| AVI | .avi |
| MOV | .mov |
| WebM | .webm |

### Output Subtitles
| Format | Frame Mapping | Description |
|:---|:---|:---|
| SRT | ❌ | Standard subtitle format |
| WebVTT | ❌ | Web video text tracks |
| ASS | ❌ | Advanced SubStation Alpha |
| JSON | ✅ | Structured data with frame info |
| TXT | ❌ | Plain text |

## 🎨 UI Preview

```
┌─────────────────────────────────────────────────────────┐
│  VisionSub  │  Project  │  📂  │  💾  │    ⚙️        │
├──────────┬─────────────────────────────┬─────────────────┤
│          │                             │                 │
│  📁 Files│    🎬 Video Preview       │  📝 Subtitles   │
│  📊 Progress                           │  ⏱️ Timeline   │
│  🎯 ROI  │    [ROI Selection Area]   │  🔍 Frame Info  │
│  ⚙️ OCR  │                             │                 │
│          │  ▶️  00:01:23 / 00:05:00  │                 │
├──────────┴─────────────────────────────┴─────────────────┤
│  Frame: #2341  │  FPS: 30  │  1920×1080  │  PaddleOCR  │
└─────────────────────────────────────────────────────────┘
```

## 📜 License

MIT License - see [LICENSE](./LICENSE) file.

## 🙏 Acknowledgments

- [Tauri](https://tauri.app/) - Build smaller, faster desktop apps
- [Vue.js](https://vuejs.org/) - The progressive JavaScript framework
- [PaddleOCR](https://github.com/PaddlePaddle/PaddleOCR) - Ultra-fast OCR engine
- [Tesseract.js](https://github.com/naptha/tesseract.js) - Pure JS OCR
