# VisionSub v3.0

> 专业视频字幕提取工具 - Tauri + Vue 3 + TypeScript

<div align="center">

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/Agions/VisionSub/pulls)
[![Stars](https://img.shields.io/github/stars/Agions/VisionSub?style=social)](https://github.com/Agions/VisionSub/stargazers)

</div>

---

## ✨ 特性

### 🖥️ 桌面客户端
- **现代化 UI**: 深色科技风格，灵感来自专业视频剪辑软件
- **可视化 ROI 选择**: 拖拽选择字幕区域，支持多种预设
- **实时预览**: 字幕实时识别，预览效果
- **帧-字幕对应**: 每个字幕精确对应视频帧位置

### ⌨️ 命令行工具
```bash
# 提取字幕
visionsub-cli extract video.mp4 --output ./subs --format srt,vtt,json

# 预览帧
visionsub-cli preview video.mp4 --frame 1500

# 查看视频信息
visionsub-cli info video.mp4
```

## 🚀 快速开始

### 环境要求
- Node.js 18+
- Rust 1.70+
- pnpm 8+

### 安装依赖

```bash
# 安装前端依赖
pnpm install

# 构建 Rust 后端
cd src-tauri && cargo build --release
```

### 开发

```bash
# 启动前端开发服务器
pnpm dev

# 启动 Tauri 应用
pnpm tauri dev
```

### 构建

```bash
# 构建前端
pnpm build

# 构建 Tauri 应用
pnpm tauri build
```

## 🎯 支持格式

### 输入视频
| 格式 | 扩展名 |
|:---|:---|
| MP4 | `.mp4` |
| MKV | `.mkv` |
| AVI | `.avi` |
| MOV | `.mov` |
| WebM | `.webm` |

### 输出字幕
| 格式 | 帧对应 | 说明 |
|:---|:---|:---|
| SRT | ❌ | 标准字幕格式 |
| WebVTT | ❌ | Web 视频字幕 |
| ASS | ❌ | 高级字幕格式 |
| JSON | ✅ | 含帧映射信息 |
| TXT | ❌ | 纯文本 |

## 🛠️ 技术栈

| 层级 | 技术 |
|:---|:---|
| **桌面框架** | Tauri 2.x |
| **前端** | Vue 3 + TypeScript |
| **样式** | SCSS + CSS Variables |
| **状态管理** | Pinia |
| **OCR 引擎** | Tesseract.js (WASM) |

## 📂 项目结构

```
visionsub/
├── src/                          # Vue 前端
│   ├── components/             # UI 组件
│   │   ├── layout/           # 布局组件
│   │   ├── video/            # 视频相关
│   │   └── subtitle/         # 字幕相关
│   ├── composables/           # Vue Composables
│   ├── stores/               # Pinia 状态管理
│   └── types/                # TypeScript 类型
│
├── src-tauri/                 # Rust 后端
│   └── src/
│       └── commands/         # Tauri IPC 命令
│
├── SPEC.md                    # 设计规范
└── README.md
```

## 🎨 界面预览

```
┌─────────────────────────────────────────────────────────────┐
│  VisionSub  │  项目  │  📂  │  💾  │              ⚙️     │
├──────────┬─────────────────────────────────┬─────────────────┤
│          │                                 │                 │
│  📁 文件 │      🎬 视频预览区域           │  📝 字幕列表    │
│  📊 进度 │      [ROI 选择区域]           │  ⏱️ 时间轴     │
│  🎯 区域 │                                 │  🔍 帧详情      │
│  🔧 OCR  │      ▶️  00:01:23 / 00:05:00  │                 │
│          │                                 │                 │
├──────────┴─────────────────────────────────┴─────────────────┤
│  帧: #2341  │  FPS: 30  │  1920×1080  │  PaddleOCR      │
└─────────────────────────────────────────────────────────────┘
```

## 📜 许可证

[MIT License](./LICENSE) - 详情请查看 LICENSE 文件。

## 🙏 致谢

- [Tauri](https://tauri.app/) - 构建更小更快的桌面应用
- [Vue.js](https://vuejs.org/) - 渐进式 JavaScript 框架
- [Tesseract.js](https://github.com/naptha/tesseract.js) - 纯 JavaScript OCR 引擎
