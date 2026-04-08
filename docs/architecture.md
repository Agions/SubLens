# HardSubX Architecture

## Overview

HardSubX is a Tauri 2.x desktop application with a Vue 3 frontend and Rust backend. It extracts hardcoded (burned-in) subtitles from video files using OCR and produces frame-accurate subtitle outputs.

```
+-------------------------------------------------------------+
|                    Desktop Shell (Tauri 2.x)                |
|  +-------------------------------------------------------+  |
|  |                  Vue 3 + TypeScript                    |  |
|  |  +----------+  +------------+  +--------------------+ |  |
|  |  |  Pinia   |  | Composables |  |  Vue Components   | |  |
|  |  |  Stores  |  | (OCR, Video,|  | (ROI, Timeline,   | |  |
|  |  |          |  |  Extract)   |  |  Export)          | |  |
|  |  +----------+  +------------+  +--------------------+ |  |
|  +------------------------+------------------------------+  |
|                           | Tauri IPC (invoke)             |
|  +------------------------+------------------------------+  |
|  |                   Rust Backend Commands                |  |
|  |  +--------+  +--------+  +--------+  +--------+       |  |
|  |  | video  |  |  ocr   |  | export |  |  file  |       |  |
|  |  +--------+  +--------+  +--------+  +--------+       |  |
|  +-------------------------------------------------------+  |
+-------------------------------------------------------------+
                          |                  |
          +---------------+                  +----------------+
          v                                   v
+-------------------+               +------------------------+
|   OCR Engines     |               |    FFmpeg (CLI)        |
|  Tesseract.js     |               |  Frame extraction      |
|  PaddleOCR        |               |  Metadata probe         |
|  EasyOCR          |               +------------------------+
+-------------------+
```

---

## Directory Structure

```
HardSubX/
├── src/                          # Vue 3 frontend
│   ├── components/
│   │   ├── common/              # Button, Modal, Tooltip, Loading
│   │   ├── layout/               # ToolBar, SidePanel, VideoPreview
│   │   │   ├── BatchProcessView.vue
│   │   │   └── SettingsView.vue
│   │   ├── subtitle/
│   │   │   ├── SubtitleList.vue  # Editable subtitle list
│   │   │   └── ExportDialog.vue  # Multi-format export
│   │   └── video/
│   │       ├── Timeline.vue      # Frame-accurate scrubber
│   │       └── ROISelector.vue   # Subtitle region selection
│   ├── composables/
│   │   ├── useOCREngine.ts       # OCR engine abstraction + post-processing
│   │   ├── useImagePreprocessor.ts
│   │   ├── useSubtitleExtractor.ts
│   │   ├── useBatchProcessor.ts
│   │   ├── useVideoPlayer.ts
│   │   └── useVideoMetadata.ts
│   ├── stores/
│   │   ├── subtitle.ts           # Subtitle list + export
│   │   ├── project.ts            # Project file state
│   │   └── settings.ts           # Theme, language, OCR prefs
│   └── types/
│       ├── subtitle.ts           # SubtitleItem, ExportFormat, formatters
│       └── video.ts              # ROI, OCREngine, ExtractOptions
│
├── src-tauri/                    # Rust backend
│   └── src/
│       ├── commands/
│       │   ├── video.rs          # Frame extraction, metadata
│       │   ├── ocr.rs            # OCR engine management
│       │   ├── ocr_engine.rs     # OCR engine integration
│       │   ├── export.rs        # Format writers
│       │   ├── file.rs           # File dialogs, save
│       │   └── scene.rs          # Scene detection
│       ├── main.rs               # Tauri app entry
│       ├── main_cli.rs           # Standalone CLI entry
│       └── lib.rs                # Library root
│
├── cli/                          # Node.js CLI tool
│   ├── src/
│   │   ├── extract.ts            # extract command
│   │   ├── formats.ts            # Format-specific output
│   │   └── index.ts              # CLI entry
│   └── dist/                     # Compiled output
│
└── docs/                         # Documentation
    ├── index.md
    ├── getting-started.md
    ├── cli.md
    └── architecture.md           # This file
```

---

## OCR Post-Processing Pipeline

Every OCR result passes through a multi-stage refinement pipeline:

```
Raw OCR Text
      |
      v
+---------------+
| 1. Cleanup     | trim, collapse spaces, normalize unicode
+---------------+
      |
      v
+---------------+
| 2. Punctuation | Full-width -> half-width conversion
|    Normalize   | Chinese/Japanese punctuation rules
+---------------+
      |
      v
+---------------+
| 3. Repeat      | Remove 3+ consecutive identical chars
|    Filter      |
+---------------+
      |
      v
+---------------+
| 4. Confidence  | Penalize: mixed scripts, short text, repeated chars
|    Calibration | Boost: consistent script, good diversity ratio
+---------------+
      |
      v
+---------------+
| 5. Subtitle    | Levenshtein similarity merge (default 80%)
|    Merging     | Bridge split subtitles (gap <= 1.5s)
+---------------+
      |
      v
+---------------+
| 6. Jitter      | Remove: <0.3s duration + same text as neighbor
|    Filter      |
+---------------+
      |
      v
 Clean Subtitle Text
```

---

## Export Format Architecture

Each format is a pure function in `src/types/subtitle.ts`:

```
SubtitleItem[] --> formatSRT()     --> .srt
               +-> formatWebVTT()  --> .vtt
               +-> formatASS()     --> .ass
               +-> formatJSON()    --> .json (frame-mapped)
               +-> formatCSV()     --> .csv (frame-mapped)
               +-> ... (LRC, SBV, SSA, TXT)
```

`SubtitleItem` is the canonical internal type:

```typescript
interface SubtitleItem {
  id: string
  index: number
  startTime: number    // seconds
  endTime: number      // seconds
  startFrame: number   // exact frame
  endFrame: number     // exact frame
  text: string
  confidence: number   // 0-1
  language?: string
  roi: ROI
  thumbnailUrls: string[]
  edited: boolean
}
```
