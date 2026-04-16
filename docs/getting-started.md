# 硬字幕提取 - 快速上手

## Prerequisites

| Requirement | Version | Notes |
|:---|:---|:---|
| Node.js | 18+ | Frontend build |
| Rust | 1.70+ | Tauri backend |
| pnpm | 8+ | Package manager |
| FFmpeg | Latest | Video frame extraction |
| Git | Any | Source clone |

### Optional: GPU OCR Acceleration

For PaddleOCR GPU support (significantly faster on NVIDIA GPUs):

```bash
# NVIDIA CUDA
conda install cudatoolkit=11.8 -c nvidia
pip install paddlepaddle-gpu
```

Then switch to PaddleOCR engine in the HardSubX UI. See [PADDLEOCR_SETUP.md](../PADDLEOCR_SETUP.md) for full instructions.

---

## Installation

```bash
# 1. Clone the repository
git clone https://github.com/Agions/HardSubX.git
cd HardSubX

# 2. Install frontend dependencies
pnpm install

# 3. Run in development mode (Rust backend auto-builds on first run)
pnpm tauri dev

# 4. Build production package
pnpm tauri build
```

---

## First Extraction

### Step 1 — Open a Video

Click **Open** in the toolbar, or drag-and-drop a video file.

Supported: **MP4** · **MKV** · **AVI** · **MOV** · **WebM**

### Step 2 — Select Subtitle Region (ROI)

Choose a preset or drag to define the subtitle area:

| Preset | Best for |
|:---|:---|
| **Bottom** | Most hardcoded subtitles |
| **Top** | Opening/ending credits |
| **Left / Right** | Bilingual subtitles |
| **Center** | Dialogue overlays |
| **Custom** | Free-form selection |

### Step 3 — Configure OCR

| Setting | Recommended |
|:---|:---|
| **OCR Engine** | PaddleOCR (best accuracy) |
| **Languages** | Match your subtitle language |
| **Confidence threshold** | 70% — adjust based on results |
| **Multi-pass OCR** | Enable for difficult subtitles |
| **Text post-processing** | Enable for cleaner output |
| **Subtitle merge** | Enable (80% similarity) |

### Step 4 — Extract

Click **Start Extraction**. Progress shows in the **Progress** tab.

### Step 5 — Export

Click **Export** in the subtitle panel. Select formats:

| Format | Frame-mapped | Best for |
|:---|:---:|:---|
| **SRT** | No | Universal subtitle players |
| **WebVTT** | No | Web video |
| **ASS** | No | Anime fansub (advanced styling) |
| **JSON** | Yes | Frame-accurate editing |
| **CSV** | Yes | Spreadsheet analysis |
| **TXT** | No | Plain text |

---

## Keyboard Shortcuts

| Key | Action |
|:---|:---|
| `Space` | Play / Pause |
| `J` / `K` | Previous / Next subtitle |
| `←` / `→` | Frame step |
| `Shift + ←/→` | Jump to subtitle |
| `Ctrl + Z` | Undo |
| `Ctrl + Y` | Redo |
| `?` | Show shortcuts help |

---

## CLI Usage

```bash
# Basic extraction
npx hardsubx-cli extract video.mp4 --output ./subs

# Multi-format output
npx hardsubx-cli extract video.mp4 --format srt,vtt,json --output ./subs

# Specify ROI + engine
npx hardsubx-cli extract video.mp4 --roi bottom --ocr paddle --lang ch,en

# High confidence threshold
npx hardsubx-cli extract video.mp4 --confidence 85

# Process every 2 frames (faster, lower accuracy)
npx hardsubx-cli extract video.mp4 --frame-interval 2
```

See [cli.md](cli.md) for the full CLI reference.
