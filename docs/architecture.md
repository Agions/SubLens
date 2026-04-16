# 硬字幕提取 架构设计

## Overview

HardSubX is a Tauri 2.x desktop application with a Vue 3 frontend and Rust backend. It extracts hardcoded (burned-in) subtitles from video files using OCR and produces frame-accurate subtitle outputs.

```
+-------------------------------------------------------------+
|                    Desktop Shell (Tauri 2.x)                |
|  +-------------------------------------------------------+  |
|  |                  Vue 3 + TypeScript                    |  |
|  |  +----------+  +------------+  +--------------------+ |  |
|  |  |  Pinia    |  | Composables|  |  Vue Components    | |  |
|  |  |  Stores   |  | (17 total) |  | (23 components)   | |  |
|  |  +----------+  +------------+  +--------------------+ |  |
|  +------------------------+------------------------------+  |
|                           | Tauri IPC (invoke)             |
|  +------------------------+------------------------------+  |
|  |                   Rust Backend Commands                 |  |
|  |  +--------+  +--------+  +--------+  +--------+        |  |
|  |  | video  |  |  ocr   |  | export |  |  file  |        |  |
|  |  +--------+  +--------+  +--------+  +--------+        |  |
|  +-------------------------------------------------------+  |
+-------------------------------------------------------------+
                          |
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
│   │   ├── common/               # Button, Modal, Tooltip, SubtitleToast, AboutDialog
│   │   ├── layout/               # ToolBar, SidePanel, VideoPreview, StatusBar
│   │   │   ├── tabs/             # Tab-based UI components
│   │   │   │   ├── FilesTab.vue    # Current video info
│   │   │   │   ├── ProgressTab.vue # Processing progress + stats
│   │   │   │   ├── ROITab.vue      # ROI preset selection
│   │   │   │   ├── OCRTab.vue      # OCR engine/language/advanced options
│   │   │   │   ├── ExportTab.vue   # Export trigger
│   │   │   │   └── SettingsTab.vue # Theme/language/system settings
│   │   │   ├── BatchProcessView.vue
│   │   │   └── SettingsView.vue
│   │   ├── subtitle/
│   │   │   ├── SubtitleList.vue    # Virtual-window subtitle list
│   │   │   └── ExportDialog.vue    # Multi-format export
│   │   └── video/
│   │       ├── Timeline.vue        # Frame-accurate scrubber + thumbnail preview
│   │       └── ROISelector.vue     # Subtitle region selection
│   ├── composables/               # 17 composables (logic/UI separation)
│   │   ├── useSubtitleList.ts     # Filtering, search, pagination, CRUD
│   │   ├── useVideoPlayer.ts      # Playback, captureFrame, seek
│   │   ├── useOCREngine.ts        # OCR engine abstraction + post-processing
│   │   ├── useSubtitleExtractor.ts # Extraction session management
│   │   ├── useBatchProcessor.ts   # Multi-file queue processing
│   │   ├── useFileOperations.ts   # File dialog, video loading
│   │   ├── useImagePreprocessor.ts # ROI crop, contrast enhancement
│   │   ├── useVideoMetadata.ts     # Video metadata extraction
│   │   ├── useTheme.ts             # OKLCH theme switching
│   │   ├── useSystemCheck.ts       # Dependency diagnostics
│   │   ├── useKeyboardShortcuts.ts # Global keyboard shortcuts
│   │   ├── useOCRTab.ts           # OCR tab state (engine/language/options)
│   │   ├── useExportTab.ts        # Export tab state
│   │   ├── useROITab.ts           # ROI tab state (presets)
│   │   ├── useProgressTab.ts      # Progress tab state (stats)
│   │   └── useSettingsTab.ts      # Settings tab state (sync)
│   ├── stores/                    # Pinia stores
│   │   ├── subtitle.ts            # Subtitle list, export formats, filters
│   │   ├── project.ts             # Project state, video metadata, ROI
│   │   └── settings.ts            # Theme, language, OCR preferences
│   ├── core/                      # Business logic (pure functions)
│   │   ├── SubtitlePipeline.ts    # 4-stage OCR post-processing pipeline
│   │   ├── SubtitleExporter.ts   # 12 format writers
│   │   ├── SceneDetector.ts       # Histogram + chi-square scene detection
│   │   └── ConfidenceCalibrator.ts # Confidence scoring
│   └── types/
│       ├── subtitle.ts           # SubtitleItem, ExportFormat
│       └── video.ts              # ROI, OCREngine, ExtractOptions
│
├── src-tauri/                    # Rust backend
│   └── src/
│       ├── commands/             # Tauri IPC commands
│       │   ├── video.rs         # Frame extraction, metadata, ffmpeg
│       │   ├── ocr_engine.rs    # PaddleOCR Python bridge
│       │   ├── ocr.rs           # EasyOCR / Tesseract.js
│       │   ├── export.rs        # Format writers
│       │   ├── scene.rs         # Scene detection
│       │   ├── file.rs          # File dialogs, save
│       │   └── system.rs        # System diagnostics
│       ├── main.rs              # Tauri app entry
│       ├── main_cli.rs          # Standalone CLI entry
│       └── lib.rs               # Library root
│
├── cli/                          # Node.js CLI tool
│   └── src/
│       ├── extract.ts           # extract command
│       ├── formats.ts           # Format-specific output
│       └── index.ts             # CLI entry
│
└── docs/                         # Documentation
    ├── index.md
    ├── getting-started.md
    ├── cli.md
    └── architecture.md          # This file
```

---

## State Management

HardSubX uses **Pinia** for frontend state with a clear separation:

```
┌─────────────────────────────────────────────────────┐
│                   Vue Components                     │
│  (SidePanel, SubtitleList, Timeline, VideoPreview)  │
└──────────────────────────┬──────────────────────────┘
                           │ use stores
         ┌─────────────────┼─────────────────┐
         ▼                 ▼                 ▼
+----------------+  +---------------+  +--------------+
│  subtitleStore │  │ projectStore  │  │ settingsStore│
+----------------+  +---------------+  +--------------+
│ • subtitles    │  │ • videoPath   │  │ • theme      │
│ • filters      │  │ • videoMeta   │  │ • language   │
│ • searchQuery  │  │ • duration    │  │ • OCR prefs  │
│ • exportFormats│  │ • roi         │  │ • autoSave   │
│ • extractProgress│ │ • extractOpts │  │              │
└────────────────+  └───────────────┘  └──────────────┘
```

---

## Composables Architecture

17 composables provide logic/UI separation:

| Composable | Responsibility |
|:---|:---|
| `useSubtitleList` | Filtering, search, pagination, edit, CRUD |
| `useVideoPlayer` | Video element control, captureFrame |
| `useOCREngine` | OCR engine selection, language config |
| `useSubtitleExtractor` | Extraction session (start/pause/stop) |
| `useBatchProcessor` | Multi-file queue processing |
| `useFileOperations` | File dialog, video loading |
| `useImagePreprocessor` | ROI crop, contrast/brightness |
| `useVideoMetadata` | Metadata extraction (fps, resolution) |
| `useTheme` | OKLCH theme switching |
| `useSystemCheck` | Dependency diagnostics |
| `useKeyboardShortcuts` | j/k navigation, shortcuts |
| `useOCRTab` | OCR tab state (engine/language/options) |
| `useExportTab` | Export tab state |
| `useROITab` | ROI tab state (presets) |
| `useProgressTab` | Progress tab state (stats) |
| `useSettingsTab` | Settings tab state (sync) |

---

## OCR Post-Processing Pipeline

Every OCR result passes through a 4-stage refinement pipeline in `src/core/SubtitlePipeline.ts`:

```
Raw OCR Text (SubtitleLite[])
      │
      v
+---------------+
| 1. filterJitter | Remove single-frame OCR noise (< 3 frames)
+---------------+
      │
      v
+---------------+
| 2. mergeSplit  | Merge same text split by scene detection
|    (gap ≤ 1.5s)|
+---------------+
      │
      v
+---------------+
| 3. mergeSimilar| Levenshtein similarity merge (default 80%)
|    Bridge gaps  |
+---------------+
      │
      v
+---------------+
| 4. computeEndTime | Accurate end time based on next subtitle
+---------------+
      │
      v
 Clean Subtitle Text
```

---

## Export Format Architecture

12 formats as pure functions in `src/core/SubtitleExporter.ts`:

```
SubtitleItem[] --> formatSRT()     --> .srt
               +-> formatWebVTT()  --> .vtt
               +-> formatASS()     --> .ass
               +-> formatSSA()     --> .ssa
               +-> formatJSON()    --> .json (frame-mapped)
               +-> formatCSV()     --> .csv (frame-mapped)
               +-> formatTXT()     --> .txt
               +-> formatLRC()     --> .lrc
               +-> formatSBV()     --> .sbv
               +-> formatMD()      --> .md
               +-> formatSTL()     --> .stl
               +-> formatTTML()    --> .ttml
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

---

## OKLCH Design System

HardSubX uses the **OKLCH** color space for perceptually uniform colors:

```css
:root {
  /* OKLCH-based palette */
  --color-primary: oklch(55% 0.2 250);    /* Blue */
  --color-success: oklch(65% 0.18 145);  /* Green */
  --color-warning: oklch(75% 0.18 85);   /* Yellow */
  --color-danger: oklch(60% 0.22 25);    /* Red */

  /* OutCubic easing for animations */
  --ease-out-cubic: cubic-bezier(0.33, 1, 0.68, 1);
}
```

Theme toggle switches between dark/light with CSS variables.
