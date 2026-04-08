# HardSubX CLI Reference

## Installation

```bash
# Option 1: npx (no install required)
npx hardsubx-cli extract video.mp4 --output ./subs

# Option 2: Build and run locally
cd cli && pnpm install && pnpm build
node dist/extract.js

# Option 3: Install via Cargo (full Rust backend)
cargo install --path src-tauri
hardsubx-cli extract video.mp4 --output ./subs
```

---

## Global Flags

| Flag | Short | Type | Default | Description |
|:---|:---:|:---:|:---:|:---|
| `--help` | `-h` | flag | — | Show help |
| `--version` | `-v` | flag | — | Show version |
| `--verbose` | — | flag | false | Verbose output |
| `--config` | `-c` | path | — | Custom config file |

---

## Commands

### `extract` — Extract subtitles from video

```bash
hardsubx-cli extract <video> [options]
```

**Arguments**

| Argument | Description |
|:---|:---|
| `<video>` | Path to input video file |

**Options**

| Option | Short | Type | Default | Description |
|:---|:---:|:---:|:---:|:---|
| `--output` | `-o` | path | `./subs` | Output directory |
| `--format` | `-f` | string | `srt` | Comma-separated formats |
| `--roi` | — | string | `bottom` | ROI preset or `x,y,w,h` |
| `--ocr` | — | string | `tesseract` | Engine: `paddle`, `easyocr`, `tesseract` |
| `--lang` | `-l` | string | `eng` | Languages (e.g. `ch,en`, `ja`, `kor`) |
| `--confidence` | `-c` | number | `70` | Min confidence 0–100 |
| `--frame-interval` | — | number | `1` | Process every N frames |
| `--scene-threshold` | — | number | `0.3` | Scene change sensitivity |
| `--no-postprocess` | — | flag | false | Skip text post-processing |
| `--no-merge` | — | flag | false | Skip subtitle merging |

**Supported formats:** `srt`, `vtt`, `ass`, `ssa`, `json`, `txt`, `lrc`, `sbv`, `csv`

**Examples**

```bash
# Basic extraction to SRT
hardsubx-cli extract video.mp4 --output ./subs

# Multi-format output
hardsubx-cli extract video.mp4 --format srt,vtt,json --output ./subs

# Chinese + English, PaddleOCR engine
hardsubx-cli extract video.mp4 --ocr paddle --lang ch,en --roi bottom

# Custom ROI coordinates (x,y,width,height in percent)
hardsubx-cli extract video.mp4 --roi 0,85,100,15

# High confidence threshold
hardsubx-cli extract video.mp4 --confidence 85

# Process every 2 frames (faster, lower accuracy)
hardsubx-cli extract video.mp4 --frame-interval 2
```

**Sample output**

```
HardSubX CLI v3.2.0 — Video Info
================================
File: video.mp4
Resolution: 1920x1080
Duration: 00:05:23
FPS: 30.00
Total frames: 9688

OCR Engine: tesseract (langs: eng+chi_sim)
ROI: bottom (0, 85, 100, 15)%
Frame interval: 1

Processing: 29% [2812/9688 frames]  ETA: 42s

Done. 47 subtitles extracted.
================================
Output: ./subs/
  video.srt  (47 entries)
  video.json (47 entries + frame mapping)
```

---

### `preview` — Preview a specific frame

```bash
hardsubx-cli preview <video> [options]
```

**Options**

| Option | Short | Type | Default | Description |
|:---|:---:|:---:|:---:|:---|
| `--frame` | `-f` | number | 0 | Frame number to extract |
| `--roi` | — | string | — | Draw ROI rectangle on output |
| `--output` | `-o` | path | stdout | Save preview image |

**Example**

```bash
hardsubx-cli preview video.mp4 --frame 1500 --roi bottom
```

---

### `info` — Show video metadata

```bash
hardsubx-cli info <video>
```

**Sample output**

```
video.mp4
========================
Resolution: 1920x1080
Duration: 00:05:23.45
FPS: 30.00
Total frames: 9688
Audio: AAC 48kHz stereo
Codec: H.264 / AVC
```

---

## Exit Codes

| Code | Meaning |
|:---:|:---|
| `0` | Success |
| `1` | General error |
| `2` | Video file not found |
| `3` | OCR engine initialization failed |
| `4` | No subtitles found |
| `5` | Output directory not writable |
