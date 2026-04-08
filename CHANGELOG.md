# Changelog

All notable changes to HardSubX are documented here.

## [3.2.1] - 2026-04-08

### Refactor

- Project renamed: VisionSub -> HardSubX (repository, documentation, source files, local directory)
- TypeScript Strict Mode: all `any` type violations fixed (7 files, 10+ occurrences)
- GitHub branding: 18 professional topics, English SEO description, SVG logo design

### Documentation

- Documentation rebuilt: 4 new pages (index / getting-started / cli / architecture)
- README updated: version badge fixed (3.1.1 -> 3.2.0), logo embedded in header

## [3.2.0] - 2026-04-04

### Added

- Confidence level filter + batch operations (Phase 3/4):
  - SubtitleList four-tier filter (All / High / Medium / Low) with real-time count display
  - Low-confidence badge pulse animation, click to jump to filtered view
  - Batch delete low-confidence subtitles button
  - Threshold slider shows exact subtitles to be excluded in real time
- Advanced OCR post-processing pipeline (Phase 4):
  - `filterJitterSubtitles`: removes short-duration OCR noise frames, absorbs into adjacent subtitles
  - `mergeSplitSubtitles`: detects and merges split identical subtitles across scene boundaries (gap <= 1.5s)
  - `calibrateConfidenceEnhanced`: refined confidence scoring (CJK bracket check / Latin uppercase penalty / sentence completeness detection / character diversity analysis)
  - `detectTextQualityIssues`: returns structured quality issue list for UI hints

### Improved

- Threshold normalization: `getConfidenceLevel()` unified (>= 0.85 high / >= 0.60 medium / < 0.60 low)
- PaddleOCR Native integration: Python bridge, CPU mode, ROI percent conversion, stdin JSON interface
- PADDLEOCR_SETUP.md guide added

### Refactor

- Confidence threshold constants: CONFIDENCE_HIGH (0.85) / CONFIDENCE_MID (0.60) moved to `types/video.ts`
- SubtitleLite type: post-processing functions use independent SubtitleLite type to avoid coupling with full SubtitleItem

## [3.1.1] - 2026-04-02

### Added

- OCR accuracy estimation dashboard: real-time accuracy estimate based on engine + language + settings combination, color-coded
- Engine selection cards: star ratings (accuracy/speed, 1-5), supported language count, tech stack labels
- Language selector (grouped): grouped by language family with country flags
- Advanced options panel (collapsible):
  - Multi-pass OCR (recognize multiple times, take best result)
  - Text post-processing (punctuation correction, traditional/simplified conversion, remove duplicate chars)
  - Subtitle merge (Levenshtein similarity threshold adjustable)
  - Scene detection sensitivity slider
  - Frame interval stepper

### Improved

- Extraction pipeline: Start button now triggers full OCR process
- OCR engine post-processing pipeline:
  - Full-width to half-width punctuation conversion
  - Confidence calibration (mixed language / ultra-short text / repeated chars auto-degraded)
  - Subtitle auto-merge (similarity >= 80% + time gap <= 0.5s)
- Scene detection: upgraded from pixel diff to 16-bin quantized histogram + chi-square test

### Fixed

- `Start Extraction` button not triggering actual OCR
- `redo()` boundary check missing
- Scene detection false positives on noisy frames

## [3.1.0] - 2026-03-23

### Added

- Export format expansion: TXT and Markdown (MD) support
- Subtitle processing utilities:
  - `mergeConsecutiveSubtitles()`
  - `deduplicateSubtitles()`
  - `splitByLanguage()`
  - `filterByConfidence()`
  - `sortByTime()`
- Format utilities: `getSupportedFormats()`, `getFormatDisplayName()`

### Improved

- Export options support `includeTimecode` parameter
- 12 export formats supported (SRT / VTT / ASS / JSON / TXT / MD / LRC / SBV / CSV / SSA / STL / TTML)

## [3.0.2] - Earlier releases

- Initial release
- OCR engine integration (Tesseract.js + CLI)
- Multiple subtitle format export
- System diagnostics panel
