# SubLens 文件命名规范

## 1. 概述

本规范定义 SubLens 项目的文件命名约定，确保跨前端（Vue3/TypeScript）和后端（Rust/Tauri）的命名一致性、可读性和可维护性。

## 2. 目录结构

```
SubLens/
├── src/                              # Vue3 前端
│   ├── components/                   # Vue 组件
│   │   ├── layout/                   # 布局组件
│   │   │   ├── Video.vue            # 视频预览
│   │   │   ├── Toolbar.vue          # 工具栏
│   │   │   ├── Panel.vue            # 侧边面板容器
│   │   │   ├── Batch.vue            # 批量处理视图
│   │   │   ├── Settings.vue         # 设置视图
│   │   │   ├── StatusBar.vue        # 状态栏
│   │   │   └── tabs/                # Tab 子组件（无 Tab 后缀）
│   │   │       ├── Files.vue        # ← 无后缀
│   │   │       ├── OCR.vue
│   │   │       ├── Progress.vue
│   │   │       ├── ROI.vue
│   │   │       └── Export.vue
│   │   ├── common/                  # 通用组件
│   │   ├── video/                   # 视频相关
│   │   └── subtitle/                # 字幕相关
│   ├── composables/                 # 组合式函数（use 前缀）
│   │   ├── useSettings.ts           # ← use 前缀
│   │   ├── useBatchProcessor.ts
│   │   ├── useOCREngine.ts
│   │   ├── useExport.ts
│   │   ├── useFile.ts
│   │   ├── useNotification.ts
│   │   ├── useOCR.ts
│   │   ├── useProgress.ts
│   │   ├── useROI.ts
│   │   ├── useSystemCheck.ts
│   │   ├── useTheme.ts
│   │   ├── useVideoMetadata.ts
│   │   └── index.ts
│   ├── core/                        # 核心业务逻辑（无 use 前缀，简洁）
│   │   ├── Pipeline.ts              # 字幕处理流水线
│   │   ├── SceneDetect.ts           # 场景检测
│   │   ├── Exporter.ts              # 导出器
│   │   ├── Calibrator.ts            # 置信度校准
│   │   └── index.ts
│   ├── stores/                      # Pinia stores
│   │   ├── project.ts
│   │   ├── subtitle.ts
│   │   ├── settings.ts
│   │   └── index.ts
│   ├── utils/                       # 工具函数
│   │   ├── time.ts
│   │   ├── math.ts
│   │   ├── confidence.ts
│   │   ├── constants.ts
│   │   └── index.ts
│   └── types/                       # 类型定义
│       ├── subtitle.ts
│       ├── video.ts
│       └── index.ts
├── src-tauri/src/                   # Rust 后端
│   ├── commands/                    # Tauri 命令
│   │   ├── video.rs                 # 视频处理命令
│   │   ├── ocr_engine.rs            # OCR 引擎命令
│   │   ├── scene.rs                 # 场景检测命令
│   │   ├── export.rs                # 导出命令
│   │   ├── file.rs                  # 文件操作命令
│   │   ├── system.rs                # 系统检查命令
│   │   ├── types.rs                 # 共享类型
│   │   ├── utils.rs                 # 命令工具函数
│   │   └── mod.rs
│   ├── main.rs
│   └── lib.rs
└── tests/                           # 测试文件（随被测文件）
```

## 3. 命名规则

### 3.1 Vue 组件

| 类型 | 规则 | 示例 |
|------|------|------|
| 页面级组件 | `PascalCase.vue`，无特殊后缀 | `Batch.vue`, `Settings.vue`, `Panel.vue` |
| Tab 子组件 | `PascalCase.vue`，**无 Tab 后缀** | `Files.vue`, `OCR.vue`, `Export.vue` |
| 通用组件 | `PascalCase.vue` | `Modal.vue`, `Button.vue`, `Toast.vue` |
| 业务组件 | `PascalCase.vue` | `Card.vue`, `ConfFilter.vue`, `BatchBar.vue` |

**⚠️ 已废弃命名（需重命名）：**
- ❌ `SettingsTab.vue` → ✅ `Settings.vue`

### 3.2 Composables（组合式函数）

| 类型 | 规则 | 示例 |
|------|------|------|
| Composables | `usePascalCase.ts`，**必须 use 前缀** | `useSettings.ts`, `useOCREngine.ts` |

**⚠️ 已废弃命名（需重命名）：**
- ❌ `Extractor.ts` → ✅ `useExtractor.ts`
- ❌ `Hotkeys.ts` → ✅ `useHotkeys.ts`
- ❌ `Player.ts` → ✅ `usePlayer.ts`
- ❌ `Preprocessor.ts` → ✅ `usePreprocessor.ts`
- ❌ `SubList.ts` → ✅ `useSubList.ts`

### 3.3 Core（核心业务模块）

| 类型 | 规则 | 示例 |
|------|------|------|
| 核心模块 | `PascalCase.ts`，**无 use 前缀**，简洁 | `Pipeline.ts`, `SceneDetect.ts`, `Exporter.ts`, `Calibrator.ts` |

**说明：** Core 模块是核心业务逻辑类，不是 React Hooks，统一用简洁命名以区分。

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
| 命令模块 | `snake_case.rs`，noun | `video.rs`, `ocr_engine.rs`, `scene.rs` |
| 共享类型 | `types.rs` | `types.rs` |
| 工具函数 | `utils.rs` | `utils.rs` |

## 4. 测试文件命名

测试文件**跟随被测文件**，使用 `.test.ts` / `.test.rs` 后缀：

```
Extractor.ts → Extractor.test.ts
Pipeline.ts → Pipeline.test.ts
useOCREngine.ts → useOCREngine.test.ts
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

## 6. 待修复清单

| 文件 | 问题 | 修复操作 |
|------|------|----------|
| `SettingsTab.vue` | 残留 Tab 后缀 | 重命名为 `Settings.vue` |
| `Extractor.ts` | composable 缺少 use 前缀 | 重命名为 `useExtractor.ts` |
| `Hotkeys.ts` | composable 缺少 use 前缀 | 重命名为 `useHotkeys.ts` |
| `Player.ts` | composable 缺少 use 前缀 | 重命名为 `usePlayer.ts` |
| `Preprocessor.ts` | composable 缺少 use 前缀 | 重命名为 `usePreprocessor.ts` |
| `SubList.ts` | composable 缺少 use 前缀 | 重命名为 `useSubList.ts` |

## 7. 规范执行

- **新文件**：严格遵循上述规范
- **存量文件**：逐步重构，优先处理明显不一致的命名
- **CI 检查**：考虑加入命名规范检查（如 `ls-lint` 或自定义脚本）
