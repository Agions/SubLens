# HardSubX Architecture

## Overview

HardSubX is a Tauri 2.x desktop application with a Vue 3 frontend and Rust backend. The application extracts hardcoded (burned-in) subtitles from video files using OCR, producing frame-accurate subtitle outputs.

```
┌─────────────────────────────────────────────────────────┐
│                    Desktop Shell (Tauri 2.x)             │
│  ┌─────────────────────────────────────────────────┐    │
│  │               Vue 3 + TypeScript Frontend        │    │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────────────┐ │    │
│  │  │  Pinia   │ │Composables│ │  Vue Components │ │    │
│  │  │  Stores  │ │  (OCR,   │ │  (ROI, Timeline │ │    │
│  │  │          │ │  Video,  │ │   Export)       │ │    │
│  │  │          │ │  Extract)│ │                 │ │    │
│  │  └──────────┘ └──────────┘ └──────────────────┘ │    │
│  └───────────────────────┬─────────────────────────┘    │
│                          │ Tauri IPC (invoke)           │
│  ┌───────────────────────┴─────────────────────────┐    │
│  │              Rust Backend Commands              │    │
│  │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ │    │
│  │  │ video  │ │   ocr  │ │ export  │ │  file  │ │    │
│  │  └────────┘ └────────┘ └────────┘ └────────┘ │    │
│  └─────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
                          │
         ┌────────────────┴───────────────┐
         ▼                                 ▼
┌─────────────────┐            ┌─────────────────┐
│  OCR Engines    │            │  FFmpeg (CLI)   │
│  - Tesseract.js │            │  Frame extract  │
│  - PaddleOCR    │            │  Metadata probe  │
│  - EasyOCR      │            └─────────────────┘
└─────────────────┘
```

---

## Directory Structure

```
HardSubX/
├── src/                           # Vue 3 frontend
│   ├── components/
│   │   ├── common/               # Button, Modal, Tooltip, Loading
│   │   ├── layout/               # ToolBar, SidePanel, StatusBar
│   │   │   ├── VideoPreview.vue   # Video player + ROI overlay
│   │   │   ├── ROISelector.vue    # Subtitle region selection
│   │   │   ├── Timeline.vue       # Frame-accurate scrubber
│   │   │   ├── BatchProcessView.vue
│   │   │   └── SettingsView.vue
│   │   ├── subtitle/
│   │   │   ├── SubtitleList.vue   # Editable subtitle list
│   │   │   └── ExportDialog.vue   # Multi-format export
│   │   └── video/
│   │       ├── Timeline.vue
│   │       └── ROISelector.vue
│   ├── composables/
│   │   ├── useOCREngine.ts        # OCR engine abstraction + post-processing
│   │   ├── useImagePreprocessor.ts # Grayscale, threshold, deskew, scale
│   │   ├── useSubtitleExtractor.ts # Extraction loop + frame iteration
│   │   ├── useBatchProcessor.ts    # Queue + concurrency management
│   │   ├── useVideoPlayer.ts      # Tauri video bridge
│   │   └── useVideoMetadata.ts    # FFmpeg metadata via Rust backend
│   ├── stores/
│   │   ├── subtitle.ts            # Subtitle list + export
│   │   ├── project.ts             # Project file state
│   │   └── settings.ts            # Theme, language, OCR prefs
│   └── types/
│       ├── subtitle.ts            # SubtitleItem, ExportFormat, formatters
│       └── video.ts               # ROI, OCREngine, ExtractOptions
│
├── src-tauri/                     # Rust backend
│   ├── src/
│   │   ├── commands/
│   │   │   ├── video.rs           # Frame extraction, metadata
│   │   │   ├── ocr.rs             # OCR engine management
│   │   │   ├── export.rs          # Format writers
│   │   │   ├── file.rs            # File dialogs, save
│   │   │   └── scene.rs           # Scene detection
│   │   ├── main.rs                # Tauri app entry
│   │   └── main_cli.rs            # Standalone CLI entry
│   └── tauri.conf.json            # Tauri configuration
│
├── cli/                           # Node.js CLI tool
│   ├── src/
│   │   ├── extract.ts             # extract command
│   │   ├── formats.ts             # Format-specific output
│   │   └── index.ts               # CLI entry
│   └── dist/                      # Compiled output
│
└── docs/                          # Documentation
    ├── index.md                   # Docs landing
    ├── getting-started.md         # Quick start
    ├── cli.md                     # CLI reference
    └── architecture.md            # This file
```

---

## OCR Post-Processing Pipeline

Every OCR result passes through a multi-stage refinement pipeline:

```
Raw OCR Text
     │
     ▼
┌──────────────────┐
│ 1. Text cleanup  │  trim, collapse spaces, normalize unicode
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ 2. Punctuation   │  Full-width → half-width conversion
│    Normalization │  Chinese/Japanese punctuation rules
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ 3. Repeat filter │  Remove 3+ consecutive identical chars
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ 4. Confidence    │  Penalize: mixed scripts, short text, repeated chars
│    Calibration   │  Boost: consistent script, good diversity ratio
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ 5. Subtitle      │  Levenshtein similarity merge (default 80%)
│    Merging       │  Bridging split subtitles (gap ≤ 1.5s)
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ 6. Jitter filter │  Remove: <0.3s duration + same text as neighbor
└────────┬─────────┘
         │
         ▼
  Clean Subtitle Text
```

---

## Export Format Architecture

Each format is implemented as a pure function in `src/types/subtitle.ts`:

```
SubtitleItem[] ──► formatSRT() ──► .srt file
                ├── formatWebVTT() ──► .vtt file
                ├── formatASS() ──► .ass file
                ├── formatJSON() ──► .json (frame-mapped)
                ├── formatCSV() ──► .csv (frame-mapped)
                └── ... (LRC, SBV, SSA, TXT, TTML)
```

The `SubtitleItem` type is the canonical format:

```typescript
interface SubtitleItem {
  id: string
  index: number
  startTime: number       // seconds
  endTime: number         // seconds
  startFrame: number      // exact frame
  endFrame: number        // exact frame
  text: string
  confidence: number       // 0–1
  language?: string
  roi: ROI
  thumbnailUrls: string[]
  edited: boolean
}
```
