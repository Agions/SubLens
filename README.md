# HardSubX v3.2.0

> 专业的视频硬字幕提取工具 — 提取字幕与画面帧一一对应，支持高准确度 OCR 后处理

<div align="center">

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/Agions/HardSubX/pulls)
[![Stars](https://img.shields.io/github/stars/Agions/HardSubX?style=social)](https://github.com/Agions/HardSubX/stargazers)
[![GitHub Actions](https://img.shields.io/badge/GitHub-Actions-blue.svg)](https://github.com/Agions/HardSubX/actions)
[![Version](https://img.shields.io/badge/version-3.2.0-blue.svg)](https://github.com/Agions/HardSubX/releases)

</div>

---

## ✨ 特性

### 🖥️ 桌面客户端
- **深色科技风格 UI**：专业视频剪辑工具美学，霓虹点缀
- **可视化 ROI 选择**：拖拽选择字幕区域，预设（底部/顶部/左侧/右侧/中心）
- **实时预览**：字幕实时识别，预览效果
- **帧-字幕对应**：每个字幕精确对应视频帧位置
- **主题切换**：暗色/亮色一键切换
- **批处理**：双栏布局处理多视频文件

### 🤖 高准确度 OCR 引擎

| 引擎 | 技术 | 精度 | 速度 | 语言 |
|:---|:---|:---:|:---:|:---:|
| **PaddleOCR** | PP-OCRv5 深度学习 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | 80+ |
| **EasyOCR** | PyTorch | ⭐⭐⭐⭐ | ⭐⭐⭐ | 80+ |
| **Tesseract.js** | LSTM + WASM | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | 100+ |

**准确度增强管道：**
- 多通道 OCR：多次识别取最优结果
- 文字后处理：全角→半角标点转换、去除重复字符、中文错字修正
- 置信度校准：混合语言/超短文本/重复字符自动降分
- 字幕合并：基于 Levenshtein 相似度自动去重

### ⌨️ 键盘快捷键
| 按键 | 功能 |
|:---|:---|
| `Space` | 播放/暂停 |
| `J` / `K` | 上一条/下一条字幕 |
| `←` / `→` | 逐帧导航 |
| `Shift + ←/→` | 跳转字幕 |
| `Ctrl + Z` | 撤销 |
| `Ctrl + Y` | 重做 |
| `?` | 快捷键帮助 |

### ⌨️ 命令行工具 (hardsubx-cli)
```bash
# 提取字幕 (多格式)
hardsubx-cli extract video.mp4 --output ./subs --format srt,vtt,json

# 指定 ROI 区域 + OCR 引擎
hardsubx-cli extract video.mp4 --roi bottom --ocr paddle --lang ch,en

# 自定义置信度阈值
hardsubx-cli extract video.mp4 --confidence 80

# 预览帧
hardsubx-cli preview video.mp4 --frame 1500

# 查看视频信息
hardsubx-cli info video.mp4

# 显示帮助
hardsubx-cli --help
hardsubx-cli extract --help
```

## 🚀 快速开始

### 环境要求
- Node.js 18+
- Rust 1.70+
- pnpm 8+

### 安装

```bash
# 克隆项目
git clone https://github.com/Agions/HardSubX.git
cd HardSubX

# 安装前端依赖
pnpm install

# 开发模式
pnpm tauri dev

# 构建安装包
pnpm tauri build
```

### CLI 工具

```bash
# 安装 CLI (开发模式)
cargo install --path src-tauri

# 或使用 npx
npx hardsubx-cli --help
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
|:---|:---:|:---|
| SRT | ❌ | SubRip - 最通用 |
| WebVTT | ❌ | Web 视频字幕 |
| ASS | ❌ | Advanced SubStation Alpha |
| SSA | ❌ | SubStation Alpha |
| JSON | ✅ | 含完整帧映射信息 |
| TXT | ❌ | 纯文本 |
| LRC | ❌ | 歌词格式 |
| SBV | ❌ | YouTube 字幕 |
| CSV | ✅ | Excel 表格 |

## 🛠️ 技术栈

| 层级 | 技术 |
|:---|:---|
| **桌面框架** | Tauri 2.x |
| **前端** | Vue 3 + TypeScript |
| **样式** | SCSS + CSS Variables |
| **状态管理** | Pinia |
| **构建工具** | Vite |
| **后端** | Rust |
| **OCR 引擎** | Tesseract.js (WASM), PaddleOCR (Native), EasyOCR |

## 📂 项目结构

```
HardSubX/
├── src/                          # Vue 前端源码
│   ├── assets/                  # 静态资源 (SCSS)
│   ├── components/              # Vue 组件
│   │   ├── common/            # 通用组件 (Button, Modal, Tooltip...)
│   │   ├── layout/            # 布局组件 (ToolBar, SidePanel...)
│   │   ├── video/             # 视频组件 (ROISelector, Timeline)
│   │   └── subtitle/          # 字幕组件 (ExportDialog, SubtitleList)
│   ├── composables/            # Vue Composables
│   │   ├── useVideoPlayer.ts
│   │   ├── useOCREngine.ts    # OCR 引擎 + 后处理管道
│   │   ├── useSubtitleExtractor.ts  # 字幕提取循环
│   │   ├── useBatchProcessor.ts
│   │   └── ...
│   ├── stores/                 # Pinia 状态管理
│   ├── themes/                # 主题系统
│   └── types/                 # TypeScript 类型定义
│
├── src-tauri/                   # Rust 后端
│   └── src/
│       ├── commands/          # Tauri IPC 命令
│       │   ├── video.rs
│       │   ├── ocr.rs
│       │   ├── export.rs
│       │   ├── file.rs
│       │   ├── scene.rs
│       │   └── ocr_engine.rs
│       ├── main.rs
│       ├── main_cli.rs        # CLI 入口
│       └── lib.rs
│
├── .github/workflows/           # GitHub Actions
│   ├── ci.yml                 # 持续集成
│   └── release.yml            # 发布构建
│
├── SPEC.md                      # 设计规范文档
└── README.md
```

## 🎨 界面预览

```
┌─────────────────────────────────────────────────────────────────┐
│  HardSubX  │  未命名项目  │  打开  │  保存  │  ☀ 主题  │  ℹ️  │
├──────────────┬───────────────────────────────────┬─────────────┤
│              │                                   │             │
│  文件列表    │        视频预览区域               │  字幕列表   │
│  处理进度    │    ┌───────────────────┐          │  置信度徽章 │
│  ROI 区域    │    │   字幕叠加层      │          │  内联编辑   │
│  OCR 设置    │    │   + timeline      │          │             │
│  导出        │    └───────────────────┘          │  00:00:12   │
│              │      ▶  00:01:23 / 00:05:00      │  00:00:15   │
├──────────────┴───────────────────────────────────┴─────────────┤
│  帧: #2341  │  FPS: 30  │  1920×1080  │  PaddleOCR          │
└─────────────────────────────────────────────────────────────────┘
```

**OCR 设置面板预览：**
```
┌──────────────────────────────┐
│  预估准确率  ████████░░  95% │
├──────────────────────────────┤
│  OCR 引擎                     │
│  [PP-OCRv5] [EO] [TS]       │
│   精度 ★★★★★  速度 ★★★★☆     │
├──────────────────────────────┤
│  识别语言                     │
│  🇨🇳 中文  🇬🇧 英文  🇯🇵 日文 │
├──────────────────────────────┤
│  高级选项 ▾ 展开              │
│  ☑ 多通道 OCR                │
│  ☑ 文字后处理                 │
│  ☑ 字幕合并 (80%)             │
│  场景灵敏度 ────●────         │
│  帧间隔  [1]                 │
├──────────────────────────────┤
│  置信度阈值 ────●────  70%    │
│                              │
│  [  ▶ 开始提取  ]            │
└──────────────────────────────┘
```

## 📜 许可证

[MIT License](./LICENSE) - 详情请查看 LICENSE 文件。

## 🙏 致谢

- [Tauri](https://tauri.app/) - 构建更小更快的桌面应用
- [Vue.js](https://vuejs.org/) - 渐进式 JavaScript 框架
- [Tesseract.js](https://github.com/naptha/tesseract.js) - 纯 JavaScript OCR 引擎
- [PaddleOCR](https://github.com/PaddlePaddle/PaddleOCR) - 百度开源 OCR 引擎

## 📊 CI/CD

| 环境 | 状态 |
|:---|:---|
| Linux | ![Linux](https://img.shields.io/badge/Linux-passing-brightgreen) |
| macOS | ![macOS](https://img.shields.io/badge/macOS-passing-brightgreen) |
| Windows | ![Windows](https://img.shields.io/badge/Windows-passing-brightgreen) |

## 📝 贡献

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/amazing`)
3. 提交更改 (`git commit -m 'feat: add amazing feature'`)
4. 推送分支 (`git push origin feature/amazing`)
5. 创建 Pull Request
