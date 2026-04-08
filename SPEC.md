# HardSubX v3.2 - 专业视频字幕提取工具

> ⚠️ **文档状态**: 本文档描述的是 v3.0 版本的完整设计规范和架构。
> 
> **最新更新 (2026-03-22)**:
> - ✅ 修复 ASS 导出格式 (完整的 ASS/SSA 格式支持)
> - ✅ 增强 Rust 后端 ffprobe 集成以获取真实视频元数据
> - ✅ 实现 ffmpeg 场景检测
> - ✅ 添加 Tauri 桌面应用构建到 CI/CD
> - ✅ 修复组件导出路径错误
> - ✅ 增强 Toolbar 文件操作集成

## 1. Concept & Vision

**核心理念**：一款专业级视频硬字幕提取工具，融合优雅的界面设计与强大的底层技术。界面如剪辑软件般精准专业，后端如AI助手般智能高效。支持帧级别的字幕与画面对应，让用户清晰看到每个字幕的来源。

**设计风格**：深邃科技感 + 剪辑软件专业风。深色主题为主，霓虹点缀，致敬专业视频剪辑工具（DaVinci Resolve、Premiere）的精确美学。

---

## 2. Design Language

### 色彩系统

```scss
// 主色调 - 深邃科技蓝
$primary: #0A84FF;
$primary-dim: #0A84FF33;
$primary-glow: #0A84FF66;

// 次要色 - 赛博青
$secondary: #00D4AA;
$secondary-dim: #00D4AA33;

// 强调色 - 霓虹紫（用于时间轴）
$accent: #BF5AF2;
$accent-dim: #BF5AF233;

// 背景层次
$bg-base: #0D0D0F;
$bg-surface: #151518;
$bg-elevated: #1C1C21;
$bg-overlay: #232328;

// 文字
$text-primary: #FFFFFF;
$text-secondary: #98989D;
$text-muted: #5C5C61;

// 边框与分隔
$border: #2C2C31;
$border-light: #3A3A40;

// 功能色
$success: #30D158;
$warning: #FFD60A;
$error: #FF453A;
$info: #64D2FF;
```

### 字体系统

```scss
// 显示字体 - 科技感强
$font-display: 'JetBrains Mono', 'SF Mono', monospace;

// 界面字体 - 清晰易读
$font-ui: 'Inter', -apple-system, sans-serif;

// 文字字体 - 支持多语言
$font-text: 'Noto Sans SC', 'PingFang SC', sans-serif;

// 字号规范
$text-xs: 11px;
$text-sm: 13px;
$text-base: 14px;
$text-lg: 16px;
$text-xl: 20px;
$text-2xl: 24px;
$text-3xl: 32px;
```

### 空间系统

```scss
$space-1: 4px;
$space-2: 8px;
$space-3: 12px;
$space-4: 16px;
$space-5: 20px;
$space-6: 24px;
$space-8: 32px;
$space-10: 40px;
$space-12: 48px;

$radius-sm: 4px;
$radius-md: 8px;
$radius-lg: 12px;
$radius-xl: 16px;
```

### 动效哲学

- **入场动画**：元素从下方淡入上移，错开 50ms
- **交互反馈**：按钮缩放 0.98，150ms ease-out
- **进度指示**：时间轴上的播放头，带发光拖尾效果
- **字幕高亮**：字幕与对应帧同步高亮，波纹扩散效果
- **加载状态**：进度条 + 百分比 + 当前处理阶段

---

## 3. Layout & Structure

### 整体布局（三栏式）

```
┌─────────────────────────────────────────────────────────────────┐
│  顶部工具栏 (48px)                                               │
│  [项目名] [文件操作] [视图切换] [设置]           [最小化][关闭] │
├────────────────┬────────────────────────────┬───────────────────┤
│                │                            │                   │
│  左侧边栏      │    中央视频预览区            │   右侧字幕面板    │
│  (280px)       │    (flex-grow)             │   (320px)         │
│                │                            │                   │
│  📁 文件列表   │    ┌──────────────────┐   │   📝 字幕列表      │
│  📊 处理进度   │    │                  │   │   ⏱️ 时间轴        │
│  🎯 ROI预设   │    │   视频画面       │   │   🔍 帧详情        │
│  ⚙️ OCR设置   │    │   + 字幕叠加    │   │                   │
│                │    │                  │   │                   │
│                │    └──────────────────┘   │                   │
│                │                            │                   │
│                │    [◀][▶][⏸] 00:03/02:30│                   │
├────────────────┴────────────────────────────┴───────────────────┤
│  底部状态栏 (28px) - 帧号 | FPS | 分辨率 | OCR引擎 | 内存使用  │
└─────────────────────────────────────────────────────────────────┘
```

### CLI 模式布局

```
$ hardsubx-cli extract video.mp4 --output ./subs --format srt,vtt

 HardSubX CLI v3.0
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

 📁 输入文件: video.mp4
 🎯 处理模式: 智能字幕提取
 🔧 OCR引擎: PaddleOCR (GPU)

 ⏳ 正在分析视频...
    ├─ 帧数: 4,500
    ├─ 时长: 02:30
    ├─ 分辨率: 1920x1080
    └─ FPS: 30

 🔍 正在提取字幕...
    ├─ [████████░░░░░░░░] 45% (2,025/4,500帧)
    ├─ 已检测字幕: 127 条
    └─ 当前帧: #2025 @ 01:07.5

 ⏱️ 预计剩余时间: 01:23

 ✅ 提取完成！
    ├─ SRT: ./subs/video.srt (127 条字幕)
    ├─ VTT: ./subs/video.vtt
    └─ JSON: ./subs/video.json (含帧对应数据)
```

---

## 4. Features & Interactions

### 4.1 核心功能

#### 视频导入
- **拖拽导入**：拖拽视频文件到窗口，自动识别格式
- **支持格式**：MP4, MKV, AVI, MOV, WebM
- **自动分析**：导入后自动检测分辨率、FPS、总帧数

#### ROI 区域选择
- **可视化选择**：在视频预览区拖拽选择字幕区域
- **预设管理**：内置常见预设（底部、顶部、左字幕、右字幕）
- **多ROI**：支持同时选择多个区域
- **精细调整**：输入精确坐标或拖动边缘调整

#### 字幕提取
- **引擎选择**：PaddleOCR（推荐）、EasyOCR、Tesseract
- **多语言**：中文、英文、日文、韩文等
- **置信度过滤**：设置最小置信度，自动过滤低质量识别
- **场景检测**：智能跳过相似帧，提升速度

#### 帧-字幕对应
- **时间戳记录**：每条字幕记录起始帧号、结束帧号
- **缩略图**：每条字幕关联首帧缩略图
- **预览跳转**：点击字幕跳转到对应帧位置
- **逐帧导航**：键盘 ←/→ 逐帧移动，实时OCR预览

#### 字幕编辑
- **内联编辑**：直接修改识别错误的文字
- **时间调整**：拖拽调整字幕起止时间
- **合并/拆分**：合并相邻相似字幕，拆分过长字幕
- **批量操作**：多选批量删除、移动、对齐

#### 导出格式
| 格式 | 说明 | 帧对应 |
|------|------|--------|
| SRT | SubRip - 最通用 | ❌ |
| WebVTT | Web视频字幕 | ❌ |
| ASS | Advanced SubStation Alpha | ❌ |
| SSA | SubStation Alpha | ❌ |
| JSON | 结构化数据（完整帧对应） | ✅ |
| TXT | 纯文本 | ❌ |
| LRC | 歌词格式 | ❌ |
| SBV | YouTube字幕 | ❌ |
| CSV | Excel表格 | ✅ |

### 4.2 CLI 模式

```bash
# 基本用法
hardsubx-cli extract <video_file>

# 指定输出
hardsubx-cli extract video.mp4 -o ./subs

# 指定格式
hardsubx-cli extract video.mp4 --format srt,vtt,json

# 指定ROI
hardsubx-cli extract video.mp4 --roi bottom

# 自定义OCR
hardsubx-cli extract video.mp4 --ocr paddleocr --lang ch,en

# 仅预览（不保存）
hardsubx-cli preview video.mp4 --frame 1500

# 获取帮助
hardsubx-cli --help
hardsubx-cli extract --help
```

### 4.3 交互细节

| 操作 | 响应 |
|------|------|
| 拖入视频 | 边框高亮 → 显示进度环 → 加载完成 |
| 选择ROI | 蓝色半透明遮罩 → 拖拽调整 → 实时预览效果 |
| 开始提取 | 进度条 + 帧计数器 + 实时字幕列表更新 |
| 点击字幕 | 播放头跳转到对应位置 + 高亮显示 |
| 悬停字幕 | 显示缩略图 + 置信度 + 帧范围 |
| 编辑字幕 | 双击进入编辑模式 → ESC取消 / Enter确认 |

---

## 5. Component Inventory

### 5.1 顶部工具栏 (ToolBar)
- **外观**：深色背景 $bg-surface，底部细线分隔
- **内容**：Logo、项目名、文件操作按钮、视图切换、设置图标
- **状态**：按钮 hover 时背景微亮

### 5.2 左侧边栏 (SidePanel)
- **文件列表**：可折叠，显示已导入视频文件
- **处理进度**：环形进度 + 百分比 + 当前阶段
- **ROI预设**：图标按钮组 + 激活态高亮
- **OCR设置**：引擎下拉 + 语言选择 + 阈值滑块

### 5.3 视频预览区 (VideoPreview)
- **外观**：16:9容器，居中显示，黑色背景
- **字幕叠加**：半透明背景条，位置对应ROI
- **控制栏**：播放/暂停、进度条、时间显示
- **状态**：
  - 空状态：虚线边框 + 拖拽提示图标
  - 加载中：中心旋转加载动画
  - 播放中：右下角迷你控制栏

### 5.4 右侧字幕面板 (SubtitlePanel)
- **字幕列表**：滚动区域，每项显示序号、时间、预览文字
- **时间轴**：横向时间轴，可拖拽选择范围
- **帧详情**：选中字幕时显示关联帧的缩略图序列
- **操作栏**：编辑、删除、导出选中

### 5.5 状态栏 (StatusBar)
- **外观**：$bg-surface，顶部细线，文字 $text-muted
- **内容**：帧号 | FPS | 分辨率 | OCR引擎 | 内存使用

### 5.6 对话框
- **设置对话框**：标签页式（通用/OCR/快捷键/主题）
- **导出对话框**：格式勾选 + 选项配置 + 预览
- **关于对话框**：Logo + 版本 + 许可证

---

## 6. Technical Architecture

### 6.1 技术栈

| 层级 | 技术 |
|------|------|
| **桌面框架** | Tauri 2.x |
| **前端框架** | Vue 3 + TypeScript |
| **样式** | SCSS + CSS Variables |
| **状态管理** | Pinia |
| **UI组件** | Headless UI + 自定义组件 |
| **视频处理** | WebCodecs API / Native |
| **OCR引擎** | Tesseract.js (WASM) / PaddleOCR (Native) |
| **构建工具** | Vite |
| **包管理** | pnpm |

### 6.2 项目结构

```
hardsubx/
├── src/                          # Vue 前端源码
│   ├── assets/                  # 静态资源
│   │   ├── icons/              # SVG 图标
│   │   ├── images/             # 图片资源
│   │   └── styles/            # 全局样式
│   │       ├── _variables.scss
│   │       ├── _mixins.scss
│   │       ├── _reset.scss
│   │       └── global.scss
│   │
│   ├── components/             # Vue 组件
│   │   ├── common/           # 通用组件
│   │   │   ├── Button.vue
│   │   │   ├── Icon.vue
│   │   │   ├── Tooltip.vue
│   │   │   └── ...
│   │   │
│   │   ├── layout/           # 布局组件
│   │   │   ├── ToolBar.vue
│   │   │   ├── SidePanel.vue
│   │   │   ├── VideoPreview.vue
│   │   │   ├── SubtitlePanel.vue
│   │   │   └── StatusBar.vue
│   │   │
│   │   ├── video/            # 视频相关
│   │   │   ├── VideoPlayer.vue
│   │   │   ├── ROISelector.vue
│   │   │   ├── Timeline.vue
│   │   │   └── FrameNavigator.vue
│   │   │
│   │   └── subtitle/         # 字幕相关
│   │       ├── SubtitleList.vue
│   │       ├── SubtitleItem.vue
│   │       ├── SubtitleEditor.vue
│   │       └── SubtitleExporter.vue
│   │
│   ├── composables/           # Vue Composables
│   │   ├── useVideoPlayer.ts
│   │   ├── useOCREngine.ts
│   │   ├── useROIManager.ts
│   │   └── useSubtitleStore.ts
│   │
│   ├── stores/               # Pinia Stores
│   │   ├── project.ts        # 项目状态
│   │   ├── subtitles.ts     # 字幕数据
│   │   └── settings.ts      # 设置
│   │
│   ├── views/               # 页面视图
│   │   ├── MainView.vue     # 主视图
│   │   └── SettingsView.vue  # 设置页
│   │
│   ├── services/            # 服务层
│   │   ├── tauri/          # Tauri IPC 调用
│   │   └── ocr/           # OCR 处理
│   │
│   ├── types/             # TypeScript 类型
│   │   ├── subtitle.ts
│   │   ├── video.ts
│   │   └── roi.ts
│   │
│   ├── App.vue
│   └── main.ts
│
├── src-tauri/               # Rust 后端
│   ├── src/
│   │   ├── main.rs
│   │   ├── lib.rs
│   │   ├── commands/       # Tauri 命令
│   │   │   ├── video.rs    # 视频处理
│   │   │   ├── ocr.rs      # OCR 调用
│   │   │   └── export.rs   # 导出功能
│   │   │
│   │   ├── core/          # 核心逻辑
│   │   │   ├── video_processor.rs
│   │   │   ├── scene_detector.rs
│   │   │   └── subtitle_aligner.rs
│   │   │
│   │   └── utils/         # 工具函数
│   │
│   ├── Cargo.toml
│   └── tauri.conf.json
│
├── cli/                      # CLI 源码
│   ├── src/
│   │   └── main.rs
│   └── Cargo.toml
│
├── package.json
├── pnpm-lock.yaml
├── vite.config.ts
├── tsconfig.json
├── .env.example
├── SPEC.md
└── README.md
```

### 6.3 数据模型

```typescript
// 字幕条目
interface SubtitleItem {
  id: string;
  index: number;              // 字幕序号
  startTime: number;          // 开始时间（秒）
  endTime: number;            // 结束时间（秒）
  startFrame: number;          // 开始帧号
  endFrame: number;           // 结束帧号
  text: string;               // 识别的文字
  confidence: number;         // 置信度 0-1
  thumbnailUrls: string[];    // 关联缩略图
  roi: ROI;                  // 来源区域
  language?: string;          // 语言
}

// ROI 区域
interface ROI {
  id: string;
  name: string;
  type: 'top' | 'bottom' | 'left' | 'right' | 'custom';
  rect: { x: number; y: number; width: number; height: number };
  enabled: boolean;
}

// 项目
interface Project {
  id: string;
  name: string;
  videoPath: string;
  videoMeta: VideoMeta;
  rois: ROI[];
  subtitles: SubtitleItem[];
  createdAt: Date;
  updatedAt: Date;
}
```

### 6.4 Tauri IPC 命令

```rust
// 视频处理
#[tauri::command]
async fn extract_frames(path: String, roi: ROI, options: ExtractOptions) -> Result<Vec<Frame>, Error>;

#[tauri::command]
async fn get_video_metadata(path: String) -> Result<VideoMeta, Error>;

// OCR
#[tauri::command]
async fn process_ocr(frame: Frame, config: OCRConfig) -> Result<OCRResult, Error>;

// 字幕对齐
#[tauri::command]
async fn align_subtitles(frames: Vec<Frame>, texts: Vec<String>) -> Result<Vec<SubtitleItem>, Error>;

// 导出
#[tauri::command]
async fn export_subtitles(subtitles: Vec<SubtitleItem>, format: ExportFormat, output: String) -> Result<String, Error>;
```

---

## 7. CLI 架构

### 7.1 命令结构

```
hardsubx-cli
├── extract     # 提取字幕
├── preview    # 预览帧
├── info       # 视频信息
└── version    # 版本信息
```

### 7.2 Tauri CLI 子项目

```toml
# src-tauri/Cargo.toml
[[bin]]
name = "hardsubx-cli"
path = "cli/src/main.rs"

[dependencies]
clap = "4.0"           # 命令行解析
anyhow = "1.0"         # 错误处理
```

---

## 8. Implementation Status

### ✅ Phase 1: 基础框架 (已完成)
- [x] 项目初始化（Tauri + Vue + TypeScript）
- [x] 样式系统搭建（SCSS + CSS Variables）
- [x] 基础布局组件 (ToolBar, SidePanel, VideoPreview, SubtitleList, StatusBar)
- [x] CLI 脚手架 (hardsubx-cli)
- [x] Pinia 状态管理 (project, subtitle, settings stores)
- [x] TypeScript 类型定义 (video, subtitle types)

### ✅ Phase 2: 核心功能 (已完成)
- [x] 视频导入与播放 (useVideoPlayer composable)
- [x] ROI 可视化选择器 (ROISelector component)
- [x] Tesseract.js OCR 集成 (useOCREngine composable)
- [x] 字幕列表与编辑 (SubtitleList component)
- [x] 帧-字幕对应数据模型
- [x] 文件导出功能 (useFileOperations composable)
- [x] Rust 文件操作命令

### ✅ Phase 3: 高级功能 (已完成)
- [x] 场景检测优化 (跳过相似帧)
- [x] 批处理支持 (useBatchProcessor composable)
- [x] 字幕提取器 (useSubtitleExtractor composable)
- [x] ASS/SSA/LRC/SBV/CSV 多种字幕格式
- [x] OCR 引擎架构 (支持扩展)

### 🚧 Phase 4: 打磨发布 (已完成)
- [x] 设置页面 (SettingsView)
- [x] 键盘快捷键 (useKeyboardShortcuts)
- [x] 时间轴组件 (Timeline)
- [x] 主题系统 (dark/light) - CSS Variables
- [x] 通用 UI 组件 (Button, Modal, Tooltip, Loading)
- [x] 快捷键帮助面板
- [x] 关于对话框
- [x] 导出对话框
- [x] 文档完善 (README, CONTRIBUTING, CHANGELOG)
- [x] GitHub 模板 (Issue, PR, FUNDING, SECURITY)
- [ ] 安装包构建 (CI/CD) - 需推送 tag 触发

---

## 9. Changelog

### v3.0.0 (2026-03-21/22)
- 🔥 完全重构，从 Python PyQt 迁移到 Tauri + Vue + TypeScript
- ✨ 全新的深色科技风格 UI 设计
- ⚡ 添加 CLI 工具支持
- 📦 支持客户端和命令行两种使用方式
- 🌈 支持 dark/light 主题切换
- ⌨️ 完整的键盘快捷键支持
- 📋 批量处理功能
- 🎬 时间轴组件和帧导航
- 🔧 增强 ffprobe 集成获取真实视频元数据
- 🎯 实现 ffmpeg 场景检测
- 📄 修复 ASS 导出格式支持

### v3.0.1 (2026-03-22)
- 🐛 修复组件导出路径错误 (SubtitleList)
- 🔧 增强 Rust 后端 ffprobe 集成
- 🎬 添加 Tauri 桌面应用构建到 CI/CD
- ⚡ 改进 Toolbar 文件操作集成
- 🎯 添加 `extract_frame_at_time` Tauri 命令
