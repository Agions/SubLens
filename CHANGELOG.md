# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.0.0] - 2026-03-22

### 🔥 Breaking Changes

- **Complete rewrite**: Migrated from Python/PyQt to Tauri + Vue 3 + TypeScript
- **New UI**: Completely redesigned with modern dark theme

### ✨ Added

- **Desktop App**: Native Tauri application
- **CLI Tool**: `visionsub-cli` command line interface
- **Theme System**: Dark and light theme support
- **Keyboard Shortcuts**: Full keyboard navigation support
  - Space: Play/Pause
  - J/K: Navigate subtitles
  - Arrow keys: Frame navigation
  - Ctrl+Z/Y: Undo/Redo
- **Batch Processing**: Process multiple videos at once
- **Timeline Component**: Visual timeline with subtitle markers
- **Multiple Export Formats**: SRT, WebVTT, ASS, JSON
- **Scene Detection**: Skip similar frames for faster processing
- **ROI Selection**: Visual subtitle region selection
- **OCR Engines**: Tesseract.js (WebAssembly)

### 🐛 Fixed

- Various bug fixes and improvements

### 📝 Changed

- Improved UI/UX design
- Better performance with native rendering
- More responsive controls

## [2.0.0] - 2024-03-18

### 🔥 Breaking Changes

- Major architecture refactoring
- Migrated to modern module structure

### ✨ Added

- Enhanced OCR engines
- Multi-language support
- Advanced subtitle editing
- Export formats: SRT, VTT, ASS, JSON
- Scene detection
- ROI presets

## [1.0.0] - 2023-01-01

### ✨ Initial Release

- Basic video subtitle extraction
- Tesseract OCR integration
- SRT export
