# SubLens

<div align="center">
  <img src="public/logo.svg" width="120" height="120" alt="SubLens" />
</div>

<div align="center">

**视频字幕提取工具** — 从视频中提取硬编码字幕，输出 SRT / VTT / ASS / JSON 等多种格式。

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Stars](https://img.shields.io/github/stars/Agions/SubLens?style=social)](https://github.com/Agions/SubLens/stargazers)
[![Tauri](https://img.shields.io/badge/Tauri-FFC131?style=flat-square&logo=tauri&logoColor=FFC131)](https://tauri.app)
[![Vue](https://img.shields.io/badge/Vue.js-4FC08D?style=flat-square&logo=vuedotjs&logoColor=white)](https://vuejs.org)
[![Rust](https://img.shields.io/badge/Rust-000000?style=flat-square&logo=rust&logoColor=white)](https://www.rust-lang.org)

</div>

---

## 功能特性

### 🎯 帧级精度
每个字幕精确映射到视频帧，时间线悬停预览实际画面。

### 🔍 智能导航
- `j` / `k` 键快速跳转，带预览浮层
- 置信度过滤（全部 / 高 / 中 / 低）
- 字幕文本搜索
- 1000+ 字幕虚拟滚动，流畅不卡顿

### 🤖 多引擎 OCR

| 引擎 | 技术 | 精度 | 速度 | 语言 |
|:---|:---|:---:|:---:|:---:|
| **PaddleOCR** | PP-OCRv5 深度学习 | 优秀 | 快（GPU）| 80+ |
| **EasyOCR** | PyTorch | 优秀 | 中等 | 80+ |
| **Tesseract.js** | LSTM + WASM | 良好 | 最快 | 100+ |

### ✨ 智能后处理
- **多轮 OCR** — 同一区域识别多次，取最优结果
- **文本正则化** — 全角/半角标点规范化
- **置信度校准** — 混语/短文本/重复字符自动降权
- **字幕合并** — Levenshtein 相似度智能去重
- **场景检测** — 直方图 + 卡方检验跳过无字幕帧

### 📦 12 种导出格式

| 格式 | 帧映射 | 适用场景 |
|:---|:---:|:---|
| **SRT** | — | 通用播放器 |
| **WebVTT** | — | Web 视频 |
| **ASS** | — | 动漫字幕，高级样式 |
| **SSA** | — | 传统字幕格式 |
| **JSON** | ✅ | 帧级精确编辑 |
| **CSV** | ✅ | 电子表格分析 |
| **TXT** | — | 纯文本 |
| **LRC** | — | 歌词同步 |
| **SBV** | — | YouTube 字幕 |
| **MD** | — | Markdown 文档 |
| **STL** | — | Spruce 字幕 |
| **TTML** | — | Timed Text ML |

### 📋 ROI 预设
底部 · 顶部 · 左侧 · 右侧 · 中间 · 自定义 — 一键切换。

### 🎬 支持输入格式
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

### 前置依赖

| 依赖 | 版本 | 说明 |
|:---|:---|:---|
| Node.js | 18+ | 前端构建 |
| Rust | 1.70+ | Tauri 后端 |
| pnpm | 8+ | 包管理器 |
| FFmpeg | 最新 | 视频帧提取 |

---

## 系统架构

```
 ┌─────────────────────────────────────────────────────────────────┐
 │                      Frontend (Vue 3 + TypeScript)                │
 │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───┐ │
 │  │  Files   │  │   ROI    │  │   OCR    │  │  Export  │  │ ⚙ │ │
 │  │   Tab    │  │   Tab    │  │   Tab    │  │   Tab    │  │Tab│ │
 │  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘  └─┬─┘ │
 │       │             │             │             │          │   │
 │       └─────────────┴──────┬──────┴─────────────┘          │   │
 │                            │ Tauri IPC (invoke)              │   │
 ├────────────────────────────┼────────────────────────────────┼───┤
 │     Backend (Rust/Tauri)   │                                │   │
 │  ┌──────────────┐  ┌──────┴──────┐  ┌──────────────┐       │   │
 │  │    video     │  │   export    │  │    scene     │       │   │
 │  │  extract_frame│  │  12 formats │  │  detect_scenes│       │   │
 │  │  metadata    │  │             │  │              │       │   │
 │  └──────┬───────┘  └─────────────┘  └──────┬───────┘       │   │
 │         │                                    │               │   │
 │         └──────────────────┬─────────────────┘               │   │
 │                            │                                │   │
 │                   ┌────────┴────────┐                       │   │
 │                   │     utils       │                       │   │
 │                   │ TempFileGuard  │                       │   │
 │                   │ find_script    │                       │   │
 │                   │ run_cmd_timeout│                       │   │
 │                   └────────┬───────┘                       │   │
 └────────────────────────────┼────────────────────────────────┴───┘
                              │
               ┌──────────────┼──────────────┐
               │              │              │
           ffmpeg/ffprobe   Python        tesseract
           (frame extract)  (scene)       (OCR)
```

---

## 项目结构

```
SubLens/
├── src/                         # Vue 3 前端
│   ├── components/             # Vue 组件
│   │   ├── common/             # Button、Modal、Tooltip 等通用组件
│   │   ├── layout/             # ToolBar、SidePanel、VideoPreview
│   │   │   └── tabs/           # Files/Progress/ROI/OCR/Export/Settings 标签页
│   │   ├── video/              # ROISelector、Timeline（缩略图预览）
│   │   └── subtitle/           # SubtitleList、ExportDialog
│   ├── composables/            # 15 个组合式函数（逻辑/UI 分离）
│   │   ├── useSubtitleList.ts  # 字幕过滤、搜索、分页
│   │   ├── useVideoPlayer.ts   # 播放控制、帧捕获
│   │   ├── useOCREngine.ts    # OCR 引擎抽象 + 后处理
│   │   ├── useExtractor.ts    # 提取流程协调
│   │   └── useBatchProcessor.ts
│   ├── stores/                 # Pinia 状态管理
│   │   ├── subtitle.ts         # 字幕列表、导出格式、过滤器
│   │   ├── project.ts          # 视频状态、元数据、ROI
│   │   └── settings.ts         # 主题、语言、OCR 偏好
│   └── core/                   # 核心业务逻辑（纯函数，无 Vue 依赖）
│       ├── Pipeline.ts          # 4 阶段 OCR 后处理管道
│       ├── Exporter.ts          # 12 格式导出器
│       ├── SceneDetect.ts       # 直方图 + 卡方场景检测
│       ├── Calibrator.ts        # 置信度校准
│       └── index.ts
│
├── src-tauri/                  # Rust 后端
│   └── src/
│       ├── lib.rs              # Tauri 应用入口、命令注册
│       ├── main.rs             # main 函数（调用 lib::run）
│       └── commands/           # Tauri IPC 命令（按功能分组）
│           ├── mod.rs          # 模块声明
│           ├── types.rs        # 共享类型（ROI 等）
│           ├── utils.rs        # 工具函数（TempFileGuard、UUID、脚本查找）
│           ├── video.rs        # 帧提取、元数据读取（ffprobe/ffmpeg）
│           ├── export.rs       # 12 格式字幕导出（SRT/VTT/ASS/JSON/CSV…）
│           ├── scene.rs        # 场景检测（调用 scene_detect.py）
│           ├── file.rs         # 文件对话框、文件读写
│           ├── system.rs       # 系统依赖诊断（ffmpeg/tesseract 版本）
│           └── ocr_engine.rs   # 占位（OCR 已移至前端 WASM）
│
├── docs/                       # VitePress 文档
│   ├── index.md               # 文档首页
│   ├── guide/                 # 用户指南
│   └── api/                   # API 参考
│
└── public/                    # 静态资源（logo.svg 等）
```

---

## 技术栈

| 层级 | 技术 |
|:---|:---|
| 桌面框架 | Tauri 2.x |
| 前端 | Vue 3 + TypeScript + Vite |
| 后端 | Rust（Tokio 异步运行时）|
| OCR 引擎 | Tesseract.js (WASM)、EasyOCR (PyTorch)、PaddleOCR |
| 状态管理 | Pinia |
| 文档 | VitePress |
| 测试 | Vitest |

---

## 核心架构设计

### OCR 后处理管道（Pipeline.ts）

四阶段纯函数管道，输入原始 OCR 结果，输出清洗后的字幕：

```
Stage 0: normalize      → 文本正则化（CRLF 合并、全角/半角规范化）
Stage 1: filterJitter   → 移除单帧 OCR 噪声
Stage 2: mergeSplit     → 合并因场景跳跃而分裂的相同字幕
Stage 3: mergeSimilar   → 合并时间接近的相似字幕
Stage 4: computeEndTime  → 根据下一条字幕计算精确 endTime
```

每阶段独立可测试，`textSimilarity` 结果按 (文本长度前缀 + 首尾各4字) 缓存，O(n log n) 复杂度。

### 置信度校准（Calibrator.ts）

基于语言脚本（CJK / Latin）的多信号加权校准：

- **惩罚信号**：混语、短文本（<3字）、重复字符、孤立 CJK 字符、引号不平衡、大写误识、尾随逗号
- **奖励信号**：字符多样性、句子完整结尾、合理字幕长度

### 场景检测（SceneDetect.ts / scene.rs）

前端直方图 + 卡方检验（TypeScript，纯前端）；后端调用 `scene_detect.py` 脚本（scenedetect 库）做精确检测。双引擎并存，按需切换。

---

## 模块导航

| 模块 | 文件 | 职责 |
|:---|:---|:---|
| **Rust 命令层** | | |
| 视频处理 | `commands/video.rs` | `get_video_metadata`（ffprobe → ffmpeg → 文件估算三层降级）、`extract_frame_at_time`（Base64 PNG） |
| 字幕导出 | `commands/export.rs` | 12 格式导出，RAII 风格 `export_timed_entries` / `export_ass_family` 复用 |
| 场景检测 | `commands/scene.rs` | 调用 `scene_detect.py`，返回 `SceneChange[]` |
| 文件操作 | `commands/file.rs` | 原生对话框、文本文件读写、文件信息查询 |
| 系统诊断 | `commands/system.rs` | ffmpeg / ffprobe / tesseract / ImageMagick 版本检测 |
| 工具函数 | `commands/utils.rs` | `TempFileGuard`（RAII 自动清理）、`find_script`（缓存搜索）、`run_command_with_timeout` |
| **前端核心** | | |
| 后处理管道 | `core/Pipeline.ts` | 五阶段字幕清洗，纯函数，可独立测试 |
| 格式导出 | `core/Exporter.ts` | 12 格式序列化（复用 Rust 格式逻辑）|
| 置信度校准 | `core/Calibrator.ts` | 多信号加权评分 |
| 场景检测 | `core/SceneDetect.ts` | 直方图 + 卡方，纯前端 JS |

---

## License

[MIT License](./LICENSE)
