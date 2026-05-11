# SubLens 文件命名规范

## 1. 概述

本规范定义 SubLens 项目的文件命名约定，确保跨前端（Vue 3 / TypeScript）和后端（Rust / Tauri）的命名一致性、可读性和可维护性。

## 2. 目录结构

```
SubLens/
├── src/                              # Vue 3 前端
│   ├── components/                   # Vue 组件
│   │   ├── common/                   # 通用组件
│   │   │   ├── Button.vue
│   │   │   ├── Modal.vue
│   │   │   ├── Tooltip.vue
│   │   │   └── Shortcuts.vue
│   │   ├── layout/                   # 布局组件
│   │   │   ├── Video.vue            # 视频预览
│   │   │   ├── Toolbar.vue          # 工具栏
│   │   │   ├── Panel.vue            # 侧边面板容器
│   │   │   ├── Batch.vue            # 批量处理视图
│   │   │   ├── Settings.vue         # 设置视图
│   │   │   ├── StatusBar.vue        # 状态栏
│   │   │   └── AboutDialog.vue
│   │   ├── video/                    # 视频相关
│   │   │   ├── ROISelector.vue
│   │   │   └── Timeline.vue
│   │   └── subtitle/                 # 字幕相关
│   │       ├── List.vue
│   │       ├── Card.vue
│   │       ├── SubExport.vue
│   │       ├── ListFooter.vue
│   │       ├── BatchBar.vue
│   │       └── ConfFilter.vue
│   ├── composables/                  # 组合式函数（use 前缀）
│   │   ├── useExtractor.ts           # 提取流程协调
│   │   ├── useOCREngine.ts          # OCR 引擎抽象
│   │   ├── useOCR.ts                # OCR 引擎选择
│   │   ├── useSubList.ts            # 字幕列表
│   │   ├── usePlayer.ts             # 播放控制
│   │   ├── useROI.ts                # ROI 管理
│   │   ├── useProgress.ts           # 进度跟踪
│   │   ├── useBatchProcessor.ts     # 批量处理
│   │   ├── useSettings.ts           # 设置管理
│   │   ├── useTheme.ts              # 主题切换
│   │   ├── useHotkeys.ts            # 快捷键
│   │   ├── usePreprocessor.ts       # 图像预处理
│   │   ├── useFile.ts               # 文件操作
│   │   ├── useNotification.ts       # 通知
│   │   └── useVideoMetadata.ts      # 视频元数据
│   ├── core/                         # 核心业务逻辑（无 use 前缀）
│   │   ├── Pipeline.ts              # 字幕处理流水线
│   │   ├── SceneDetect.ts           # 场景检测
│   │   ├── Exporter.ts              # 导出器
│   │   ├── Calibrator.ts            # 置信度校准
│   │   └── index.ts
│   ├── stores/                        # Pinia stores
│   │   ├── project.ts               # 视频状态、ROI
│   │   ├── subtitle.ts              # 字幕列表、导出格式
│   │   └── settings.ts              # 主题、语言、OCR 偏好
│   ├── utils/                         # 工具函数
│   │   ├── time.ts                  # 时间格式化
│   │   ├── math.ts                  # 数学工具
│   │   ├── confidence.ts             # 置信度工具
│   │   └── constants.ts              # 常量
│   ├── themes/                        # 主题
│   │   └── index.ts                 # 主题配置
│   └── types/                         # 类型定义
│       ├── subtitle.ts              # 字幕类型
│       └── video.ts                 # 视频相关类型
├── src-tauri/src/                    # Rust 后端
│   ├── commands/                     # Tauri IPC 命令
│   │   ├── video.rs                # FFmpeg 帧提取、元数据
│   │   ├── ocr_engine.rs           # 占位（OCR 已移至前端）
│   │   ├── scene.rs                 # 场景检测
│   │   ├── export.rs               # 格式写入
│   │   ├── file.rs                 # 文件对话框
│   │   ├── system.rs               # 系统依赖诊断
│   │   ├── types.rs                # 共享类型
│   │   └── utils.rs                # 命令工具函数
│   ├── scripts/
│   │   └── scene_detect.py         # 场景检测脚本
│   ├── main.rs
│   └── lib.rs
└── tests/                            # 测试文件（随被测文件）
```

## 3. 命名规则

### 3.1 Vue 组件

| 类型 | 规则 | 示例 |
|------|------|------|
| 页面级组件 | `PascalCase.vue`，无特殊后缀 | `Batch.vue`, `Settings.vue`, `Panel.vue` |
| Tab 子组件 | `PascalCase.vue`，无 Tab 后缀 | `Files.vue`, `OCR.vue`, `Export.vue` |
| 通用组件 | `PascalCase.vue` | `Modal.vue`, `Button.vue`, `Tooltip.vue` |
| 业务组件 | `PascalCase.vue` | `Card.vue`, `ConfFilter.vue`, `BatchBar.vue` |

### 3.2 Composables（组合式函数）

| 类型 | 规则 | 示例 |
|------|------|------|
| Composables | `usePascalCase.ts`，必须 use 前缀 | `useSettings.ts`, `useOCREngine.ts` |

### 3.3 Core（核心业务模块）

| 类型 | 规则 | 示例 |
|------|------|------|
| 核心模块 | `PascalCase.ts`，无 use 前缀，简洁 | `Pipeline.ts`, `SceneDetect.ts`, `Exporter.ts`, `Calibrator.ts` |

**说明：** Core 模块是核心业务逻辑类，不是 React Hooks，也不是 Vue Composables，统一用简洁命名以区分。

### 3.4 Stores（Pinia 状态管理）

| 类型 | 规则 | 示例 |
|------|------|------|
| Stores | `camelCase.ts`，noun | `project.ts`, `subtitle.ts`, `settings.ts` |

### 3.5 Utils（工具函数）

| 类型 | 规则 | 示例 |
|------|------|------|
| 工具模块 | `camelCase.ts`，noun | `time.ts`, `math.ts`, `confidence.ts`, `constants.ts` |

### 3.6 Types（类型定义）

| 类型 | 规则 | 示例 |
|------|------|------|
| 类型文件 | `camelCase.ts`，noun | `subtitle.ts`, `video.ts` |

### 3.7 Rust 模块

| 类型 | 规则 | 示例 |
|------|------|------|
| 命令模块 | `snake_case.rs`，noun | `video.rs`, `scene.rs`, `file.rs` |
| 共享类型 | `types.rs` | `types.rs` |
| 工具函数 | `utils.rs` | `utils.rs` |
| 占位模块 | `ocr_engine.rs` | 占位（OCR 已移至前端） |

## 4. 测试文件命名

测试文件跟随被测文件，使用 `.test.ts` / `.test.rs` 后缀：

```
Pipeline.ts         → Pipeline.test.ts
SceneDetect.ts      → SceneDetect.test.ts
Exporter.ts        → Exporter.test.ts
useSubList.ts      → SubList.test.ts
useOCREngine.ts    → useOCREngine.test.ts
```

## 5. 命名决策理由

### 为什么 Composables 用 `use` 前缀？

1. **Vue 生态约定**：Composables 在 Vue 文档和社区中广泛使用 `use` 前缀（如 `useRoute`, `useStore`）
2. **与 React Hooks 区分**：避免与 React 的 `useXxx` Hooks 混淆
3. **语义清晰**：一眼可辨认这是组合式函数，而非普通工具函数

### 为什么 Core 模块不用 `use` 前缀？

1. **语义差异**：`Pipeline.ts`、`SceneDetect.ts` 是核心业务类/模块，不是"组合函数"
2. **命名简洁性**：核心模块被频繁引用，简洁命名减少冗余
3. **与 Composables 的区分**：通过目录隔离（`core/` vs `composables/`）和命名风格差异双重区分

### 为什么 Tab 组件去掉 `Tab` 后缀？

1. **父组件 `Panel.vue` 已明确这是 Tab 容器**，子组件无需自述类型
2. **路径已区分**：`tabs/Files.vue` vs `Settings.vue`，语境清晰
3. **与 Vue 生态一致**：主流项目（Vue Router, Pinia）也不在文件名加类型后缀

## 6. 规范执行

- **新文件**：严格遵循上述规范
- **存量文件**：逐步重构，优先处理明显不一致的命名
- **CI 检查**：考虑加入命名规范检查（如 `ls-lint` 或自定义脚本）
