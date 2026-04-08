# Getting Started with HardSubX

## Prerequisites

| Requirement | Version | Notes |
|:---|:---|:---|
| Node.js | 18+ | For frontend build |
| Rust | 1.70+ | For Tauri backend |
| pnpm | 8+ | Package manager |
| FFmpeg | Latest | Video frame extraction |
| Git | Any | Source clone |

### Optional: GPU OCR Acceleration

For PaddleOCR GPU support (significantly faster on NVIDIA GPUs):

```bash
# NVIDIA CUDA (install once)
conda install cudatoolkit=11.8 -c nvidia
pip install paddlepaddle-gpu

# Then in HardSubX UI, switch to PaddleOCR engine
```

See [PADDLEOCR_SETUP.md](../PADDLEOCR_SETUP.md) for full instructions.

---

## Installation

```bash
# 1. Clone the repository
git clone https://github.com/Agions/HardSubX.git
cd HardSubX

# 2. Install frontend dependencies
pnpm install

# 3. Build the Tauri backend
cd src-tauri && cargo build --release && cd ..

# 4. Run in development mode
pnpm tauri dev
```

---

## First Extraction

### Step 1 — Open a Video File

Click **打开 (Open)** in the toolbar, or drag-and-drop a video file onto the window.

Supported formats: **MP4**, **MKV**, **AVI**, **MOV**, **WebM**

### Step 2 — Select the Subtitle Region (ROI)

Choose a preset or drag to define the subtitle area:

| Preset | Best for |
|:---|:---|
| **底部 (Bottom)** | Most hardcoded subtitles |
| **顶部 (Top)** | Opening/ending credits |
| **左侧/右侧** | Bilingual subtitles |
| **中心** | Dialogue overlays |
| **自定义** | Free-form selection |

### Step 3 — Configure OCR Settings

| Setting | Recommended |
|:---|:---|
| **OCR Engine** | PaddleOCR (best accuracy) |
| **Languages** | Match your subtitle language |
| **Confidence threshold** | 70% — adjust based on results |
| **Multi-pass OCR** | ✅ Enable for difficult subtitles |
| **Text post-processing** | ✅ Enable for cleaner output |
| **Subtitle merge** | ✅ Enable (80% similarity) |

### Step 4 — Extract

Click **▶ 开始提取 (Start Extraction)**.

Use keyboard shortcuts to navigate results:

| Key | Action |
|:---|:---|
| `Space` | Play / Pause |
| `J` / `K` | Previous / Next subtitle |
| `←` / `→` | Frame step |
| `Shift+←/→` | Jump to subtitle |
| `Ctrl+Z` | Undo |
| `Ctrl+Y` | Redo |
| `?` | Show shortcuts |

### Step 5 — Export

Click **导出 (Export)** in the subtitle panel. Select formats:

| Format | Frame mapping | Best for |
|:---|:---:|:---|
| **SRT** | ❌ | Universal subtitle players |
| **VTT** | ❌ | Web video |
| **ASS** | ❌ | Anime fansub (advanced styling) |
| **JSON** | ✅ | Frame-accurate editing |
| **CSV** | ✅ | Spreadsheet analysis |
| **TXT** | ❌ | Plain text |

---

## CLI Usage

```bash
# After installation
npx hardsubx-cli extract video.mp4 --output ./subs

# Or install globally
cargo install --path src-tauri
hardsubx-cli extract video.mp4 --output ./subs --format srt,vtt,json

# Specify ROI + engine
hardsubx-cli extract video.mp4 --roi bottom --ocr paddle --lang ch,en

# Preview a specific frame
hardsubx-cli preview video.mp4 --frame 1500
```

See [cli.md](cli.md) for full CLI reference.
