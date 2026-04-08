# PaddleOCR Setup Guide

## Prerequisites

- Python 3.8+
- pip

## Installation

### 1. Install PaddlePaddle (CPU version)

```bash
pip install paddlepaddle
```

### 2. Install PaddleOCR

```bash
pip install paddleocr
```

### 3. Verify installation

```bash
python src-tauri/scripts/paddle_ocr.py --check
```

Expected output:

```json
{"available": true, "paddle_version": "...", "ocr_version": "...", "message": "PaddleOCR is ready"}
```

### 4. Test OCR

```bash
python src-tauri/scripts/paddle_ocr.py --image /path/to/test.png --lang ch --gpu false
```

## Supported Languages

| Code | Language |
|:---|:---|
| `ch` | Simplified Chinese |
| `en` | English |
| `ja` | Japanese |
| `ko` | Korean |
| `fr` | French |
| `de` | German |
| `es` | Spanish |
| `pt` | Portuguese |
| `it` | Italian |
| `ru` | Russian |
| `ar` | Arabic |

## GPU Acceleration (Optional)

For NVIDIA GPU acceleration:

```bash
pip install paddlepaddle-gpu
```

The HardSubX UI will automatically use the GPU when the PaddleOCR engine is selected.

## FAQ

**Q: `paddle_ocr.py --check` returns `available: false`**
- Verify `python3 --version` works
- Verify `pip show paddlepaddle` and `pip show paddleocr` return output
- If using a virtual environment, ensure both are installed in the same environment

**Q: Slow startup**
- PaddleOCR downloads models on first run (~150MB)
- Subsequent runs use cached models in `~/.paddleocr/`
