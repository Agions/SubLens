# HardSubX Documentation

> Professional video hard subtitle extraction tool

## 📖 Documentation

| Guide | Description |
|:---|:---|
| [Getting Started](getting-started.md) | Installation, setup, and first extraction |
| [CLI Reference](cli.md) | Command-line interface full reference |
| [Architecture](architecture.md) | Project structure and technical design |

---

## 🌟 Features

- **Frame-accurate extraction** — Each subtitle maps to exact video frames
- **Multi-engine OCR** — PaddleOCR, EasyOCR, and Tesseract.js with multi-pass refinement
- **Smart post-processing** — Language-aware text normalization, deduplication, jitter filtering
- **8+ export formats** — SRT, VTT, ASS, SSA, JSON, TXT, LRC, CSV, SBV
- **ROI presets** — One-click selection for bottom/top/left/right/center subtitles
- **Batch processing** — Multi-file queue with priority and concurrency control
- **Dark/light themes** — Professional video editing tool aesthetics

## 🛠️ Tech Stack

| Layer | Technology |
|:---|:---|
| Desktop framework | Tauri 2.x |
| Frontend | Vue 3 + TypeScript (strict mode) |
| Backend | Rust |
| OCR engines | Tesseract.js (WASM), PaddleOCR, EasyOCR |
| State management | Pinia |
| Build tool | Vite |

## 📦 Quick Install

```bash
# Clone the repo
git clone https://github.com/Agions/HardSubX.git
cd HardSubX

# Install frontend dependencies
pnpm install

# Run in development mode
pnpm tauri dev
```

## 📄 License

MIT — see [LICENSE](../LICENSE)
