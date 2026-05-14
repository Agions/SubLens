# SubLens

<div align="center">
  <img src="public/logo.svg" width="120" height="120" alt="SubLens" />
</div>

**视频字幕提取工具** — 从视频中提取硬编码字幕，输出 SRT / VTT / ASS / JSON 等多种格式。

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Stars](https://img.shields.io/github/stars/Agions/SubLens?style=social)](https://github.com/Agions/SubLens/stargazers)
[![Tauri](https://img.shields.io/badge/Tauri-FFC131?style=flat-square&logo=tauri&logoColor=FFC131)](https://tauri.app)
[![Vue](https://img.shields.io/badge/Vue.js-4FC08D?style=flat-square&logo=vuedotjs&logoColor=white)](https://vuejs.org)
[![Rust](https://img.shields.io/badge/Rust-000000?style=flat-square&logo=rust&logoColor=white)](https://www.rust-lang.org)
[![Test](https://img.shields.io/badge/Tests-193%20%E9%80%89%E9%80%89%E9%80%9A%E8%BF%87-green?style=flat-square)](https://github.com/Agions/SubLens/actions)
[![CI](https://img.shields.io/github/actions/workflow/status/Agions/SubLens/CI.yml?branch=main&style=flat-square)](https://github.com/Agions/SubLens/actions/workflows/CI.yml)
[![npm](https://img.shields.io/npm/v/sublens?style=flat-square)](https://www.npmjs.com/package/sublens)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-brightgreen?style=flat-square)](https://nodejs.org)

---

## 功能特性

### 🤖 多引擎 OCR

| 引擎 | 技术 | 精度 | 速度 | 语言 |
|:---|:---|:---:|:---:|:---:|
| **PaddleOCR** | PP-OCRv4 深度学习 | 优秀 | 快（GPU）| 80+ |
| **EasyOCR** | PyTorch | 优秀 | 中等 | 80+ |
| **Tesseract.js** | LSTM + WASM | 良好 | 最快 | 100+ |

### ✨ 智能后处理

- **多轮 OCR** — 同一区域识别多次，取最优结果
- **文本正则化** — 全角/半角标点规范化
- **置信度校准** — 混语/短文本/重复字符自动降权
- **字幕合并** — Levenshtein 相似度智能去重
- **场景检测** — 直方图 + 卡方检验跳过无字幕帧

### 📦 9 种导出格式

SRT · VTT · ASS · SSA · JSON · CSV · TXT · LRC · SBV

### 📋 ROI 预设

底部 · 顶部 · 左侧 · 右侧 · 中间 · 自定义 — 一键切换。

### 🎬 支持格式

MP4 · MKV · AVI · MOV · WebM · M4V · WMV · FLV · 3GP

---

## 快速开始

```bash
git clone https://github.com/Agions/SubLens.git
cd SubLens
pnpm install
pnpm tauri dev   # 开发模式
pnpm tauri build # 生产构建
```

**前置依赖：** Node.js 18+ · Rust 1.70+ · pnpm 8+ · FFmpeg

---

## 系统架构

```
 Frontend (Vue 3 + TypeScript)
┌─────────────────────────────────────────────────────────────┐
│  Files Tab  │  ROI Tab  │  OCR Tab  │  Export Tab  │  ⚙ Tab │
└──────────────────────────┬──────────────────────────────────┘
                           │ Tauri IPC
┌──────────────────────────┴──────────────────────────────────┐
│                  Backend (Rust / Tokio)                     │
│                                                               │
│   video   │  scene  │  export  │  file  │  system  │ utils│
│   ├─ ffmpeg (frame extract)   ├─ export_fmt (12 formats)     │
│   └─ ffmpeg (metadata)        └─ timestamp (SRT/VTT/ASS…)   │
└──────────────────────────────────────────────────────────────┘
```

---

## 项目结构

```
SubLens/
├── src/                       # Vue 3 前端
│   ├── components/           # Vue SFC 组件
│   │   ├── common/           # Button、Modal、Tooltip
│   │   ├── layout/           # ToolBar、SidePanel、VideoPreview
│   │   │   └── tabs/         # Files / Progress / ROI / OCR / Export / Settings
│   │   ├── video/            # ROISelector、Timeline
│   │   └── subtitle/         # SubtitleList、ExportDialog
│   ├── composables/          # 组合式函数（逻辑/UI 分离）
│   ├── stores/               # Pinia 状态管理
│   └── core/                 # 纯业务逻辑（可 Tree-shake / 独立测试）
│       ├── Pipeline.ts       # 5 阶段 OCR 后处理管道
│       ├── Exporter.ts       # 9 格式导出器
│       ├── SceneDetect.ts    # 直方图 + 卡方场景检测
│       └── Calibrator.ts     # 置信度校准
│
├── src-tauri/src/
│   ├── lib.rs               # Tauri 应用入口 + 命令注册
│   └── commands/            # Rust 命令层
│       ├── video.rs        # 元数据 + 帧提取
│       ├── export.rs       # 导出入口 + 类型（SubtitleItem、ExportFormat）
│       ├── export_fmt.rs   # 9 格式实现
│       ├── scene.rs        # 场景检测
│       ├── file.rs         # 文件对话框 + 读写
│       ├── system.rs       # 系统依赖诊断
│       ├── ffmpeg.rs       # FFmpeg / ffprobe 输出解析
│       ├── timestamp.rs    # 时间戳格式化（SRT/VTT/ASS/SSA/SBV）
│       ├── types.rs        # 共享类型（ROI）
│       ├── utils.rs        # 工具（TempFileGuard、UUID、脚本查找）
│       └── ocr.rs          # OCR 占位（已移至前端 WASM）
│
├── docs/                    # VitePress 文档站
│   ├── .vitepress/         # VitePress 配置
│   ├── guide/              # 用户指南（面向使用者）
│   │   ├── getting-started.md
│   │   ├── first-extraction.md
│   │   ├── ocr-engines.md
│   │   ├── roi.md
│   │   ├── export-formats.md
│   │   ├── keyboard-shortcuts.md
│   │   └── faq.md
│   ├── api/                # API 参考（面向开发者）
│   │   ├── commands.md
│   │   ├── pipeline.md
│   │   ├── exporter.md
│   │   ├── scene-detect.md
│   │   └── calibrator.md
│   ├── architecture.md     # 深度架构文档
│   ├── developer-guide.md # 开发者指南
│   └── index.md            # 文档首页
│
├── .github/                # GitHub 配置
│   └── workflows/          # CI/CD 工作流
│       ├── ci.yml         # 前端质量（tsc + ESLint + Vitest）
│       ├── docs.yml       # VitePress → GitHub Pages
│       └── release.yml    # 发布构建
│
├── public/                 # 静态资源
│   ├── logo.svg
│   └── logo-preview.html
│
└── src-tauri/             # Tauri 后端（Rust）
    ├── Cargo.toml
    └── src/
        ├── lib.rs
        └── commands/
```

---

## 技术栈

| 层级 | 技术 |
|:---|:---|
| 桌面框架 | Tauri 2.x |
| 前端 | Vue 3 + TypeScript + Vite + Pinia |
| 后端 | Rust（Tokio 异步运行时）|
| OCR | Tesseract.js (WASM)、EasyOCR (PyTorch)、PaddleOCR |
| 测试 | Vitest |

---

## 文档

| 文档 | 说明 |
|:---|:---|
| [docs/architecture.md](docs/architecture.md) | 前后端分层、数据流、接口定义、命名规范 |
| [docs/developer-guide.md](docs/developer-guide.md) | 环境搭建、调试、测试、添加新命令 / 新格式 |
| [CHANGELOG.md](./CHANGELOG.md) | 版本变更记录 |

---

## License

[MIT License](./LICENSE)
