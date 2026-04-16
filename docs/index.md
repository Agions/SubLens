# SubLens 文档

<div align="center">

SubLens - 专业的视频字幕提取工具，从任何视频中提取硬编码字幕。

**Version**: 3.3.1 · **License**: MIT

</div>

---

## 📖 Documentation

| Guide | Description |
|:---|:---|
| [Getting Started](getting-started.md) | Installation, setup, and first extraction |
| [CLI Reference](cli.md) | Full command-line interface reference |
| [Architecture](architecture.md) | Project structure and technical design |

---

## ✨ Features

### Frame-Accurate Extraction
Each subtitle maps to exact video frames. **Timeline thumbnail preview** shows actual video frames on hover.

### Multi-Engine OCR
PaddleOCR, EasyOCR, and Tesseract.js with multi-pass refinement. Real-time accuracy estimation based on engine + language + settings.

### Smart Post-Processing
- **4-stage pipeline**: filter jitter → merge split → merge similar → compute end time
- **Language-aware**: full/half-width punctuation, Chinese typo correction
- **Confidence calibration**: mixed language / short text / repeated chars auto-degraded
- **Levenshtein similarity** merge for deduplication

### Professional UI
- **OKLCH design system** — perceptually uniform colors
- **Tab-based interface** — Files / Progress / ROI / OCR / Export / Settings
- **Dark/light themes** — professional video editing aesthetics
- **Virtual scrolling** — smooth performance with 1000+ subtitles

### 12 Export Formats
SRT · VTT · ASS · SSA · JSON · CSV · TXT · LRC · SBV · MD · STL · TTML

---

## 🚀 Quick Install

```bash
git clone https://github.com/Agions/HardSubX.git
cd SubLens
pnpm install
pnpm tauri dev
```

---

## ⌨️ Keyboard Shortcuts

| Key | Action |
|:---|:---|
| `Space` | Play / Pause |
| `J` / `K` | Previous / Next subtitle (with toast preview) |
| `←` / `→` | Frame step |
| `Shift + ←/→` | Jump to subtitle |
| `Ctrl + Z` | Undo |
| `Ctrl + Y` | Redo |
| `?` | Show shortcuts |

---

## 📁 Project Structure

```
SubLens/
├── src/                    # Vue 3 frontend (17 composables, 23 components)
│   ├── components/        # UI components
│   │   ├── layout/tabs/   # Tab-based UI
│   │   ├── video/         # Timeline, ROISelector
│   │   └── subtitle/       # SubtitleList, ExportDialog
│   ├── composables/        # Logic/UI separation
│   ├── stores/             # Pinia state
│   └── core/               # Business logic
├── src-tauri/             # Rust backend
├── cli/                   # Node.js CLI tool
└── docs/                  # This documentation
```

---

## License

MIT — see [LICENSE](../LICENSE)
