# CLI 参考

## 安装 {#installation}

```bash
# Option 1: npx (无需安装)
npx sublens-cli extract video.mp4 --output ./subs

# Option 2: Build locally
cd cli && pnpm install && pnpm build
node dist/extract.js

# Option 3: Install via Cargo (完整 Rust 后端)
cargo install --path src-tauri
sublens-cli extract video.mp4 --output ./subs
```

## 全局参数 {#global-flags}

| Flag | Short | Type | Default | Description |
|:---|:---:|:---:|:---:|:---|
| `--help` | `-h` | flag | — | Show help |
| `--version` | `-v` | flag | — | Show version |
| `--verbose` | — | flag | false | Verbose output |
| `--config` | `-c` | path | — | Custom config file |

## extract — 提取字幕 {#extract}

```bash
sublens-cli extract <video> [options]
```

**Arguments**

| Argument | Description |
|:---|:---|
| `<video>` | 输入视频文件路径 |

**Options**

| Option | Short | Type | Default | Description |
|:---|:---:|:---:|:---:|:---|
| `--output` | `-o` | path | `./subs` | Output directory |
| `--format` | `-f` | string | `srt` | Comma-separated formats |
| `--roi` | — | string | `bottom` | ROI preset or `x,y,w,h` |
| `--ocr` | — | string | `tesseract` | Engine: `paddle`, `easyocr`, `tesseract` |
| `--lang` | `-l` | string | `eng` | Languages (e.g. `ch,en`, `ja`, `kor`) |
| `--confidence` | — | number | `70` | Min confidence 0–100 |
| `--frame-interval` | — | number | `1` | Process every N frames |
| `--scene-threshold` | — | number | `0.3` | Scene change sensitivity |
| `--no-postprocess` | — | flag | false | Skip text post-processing |
| `--no-merge` | — | flag | false | Skip subtitle merging |

**Supported formats:** `srt`, `vtt`, `ass`, `ssa`, `json`, `txt`, `lrc`, `sbv`, `csv`

**Examples**

```bash
# Basic extraction to SRT
sublens-cli extract video.mp4 --output ./subs

# Multi-format output
sublens-cli extract video.mp4 --format srt,vtt,json --output ./subs

# Chinese + English, PaddleOCR engine
sublens-cli extract video.mp4 --ocr paddle --lang ch,en --roi bottom

# Custom ROI coordinates (x,y,width,height in percent)
sublens-cli extract video.mp4 --roi 0,85,100,15

# High confidence threshold
sublens-cli extract video.mp4 --confidence 85

# Process every 2 frames (faster, lower accuracy)
sublens-cli extract video.mp4 --frame-interval 2
```

**Sample output**

```
SubLens CLI v3.2.0 — Video Info
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

## preview — 预览帧 {#preview}

```bash
sublens-cli preview <video> [options]
```

| Option | Short | Type | Default | Description |
|:---|:---:|:---:|:---:|:---|
| `--frame` | `-f` | number | 0 | Frame number to extract |
| `--roi` | — | string | — | Draw ROI rectangle on output |
| `--output` | `-o` | path | stdout | Save preview image |

```bash
sublens-cli preview video.mp4 --frame 1500 --roi bottom
```

## info — 视频信息 {#info}

```bash
sublens-cli info <video>
```

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

## 退出码 {#exit-codes}

| Code | Meaning |
|:---:|:---|
| `0` | Success |
| `1` | General error |
| `2` | Video file not found |
| `3` | OCR engine initialization failed |
| `4` | No subtitles found |
| `5` | Output directory not writable |
