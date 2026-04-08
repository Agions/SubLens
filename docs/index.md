# HardSubX

Professional video hard subtitle extraction tool.

## Documentation

| Guide | Description |
|:---|:---|
| [Getting Started](getting-started.md) | Installation, setup, and first extraction |
| [CLI Reference](cli.md) | Full command-line interface reference |
| [Architecture](architecture.md) | Project structure and technical design |

## Features

- **Frame-accurate extraction** — Each subtitle maps to exact video frames
- **Multi-engine OCR** — PaddleOCR, EasyOCR, and Tesseract.js with multi-pass refinement
- **Smart post-processing** — Language-aware text normalization, deduplication, jitter filtering
- **9 export formats** — SRT, VTT, ASS, SSA, JSON, TXT, LRC, CSV, SBV
- **ROI presets** — One-click selection for bottom/top/left/right/center subtitles
- **Batch processing** — Multi-file queue with priority and concurrency control
- **Dark/light themes** — Professional video editing tool aesthetics

## Quick Install

```bash
git clone https://github.com/Agions/HardSubX.git
cd HardSubX
pnpm install
pnpm tauri dev
```

## License

MIT — see [LICENSE](../LICENSE)
