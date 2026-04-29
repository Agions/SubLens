# SubLens 代码重构规划

> 生成日期：2026-04-29
> 当前状态：193 测试全绿，CI 通过
> 路径：`/root/.openclaw/workspace/SubLens`

---

## 一、架构问题诊断

### 1.1 目录结构概览

```
src/
├── core/           # 纯业务逻辑（无 Vue 依赖）
│   ├── SubtitlePipeline.ts     (325行) — 字幕后处理管道
│   ├── SubtitleExporter.ts     (260行) — 格式导出引擎
│   ├── SceneDetector.ts        (133行) — 场景变化检测
│   └── ConfidenceCalibrator.ts (215行) — 置信度校准
├── composables/    # Vue 组合式函数
│   ├── useSubtitleExtractor.ts (313行) — 提取主流程（最臃肿）
│   ├── useOCREngine.ts         (351行) — OCR 引擎封装
│   ├── useBatchProcessor.ts    (311行) — 批处理
│   ├── useSubtitleList.ts      (197行) — 列表 UI 状态
│   ├── useVideoPlayer.ts       (203行) — 播放器封装
│   └── ... (13个 composable)
├── stores/         # Pinia 状态管理
│   ├── subtitle.ts (约180行)
│   ├── project.ts (约140行)
│   └── settings.ts
├── types/          # TypeScript 类型定义
└── components/    # Vue 组件
```

### 1.2 架构分层评估

| 层级 | 状态 | 说明 |
|------|------|------|
| `core/` | ✅ 清晰 | 纯函数/类，无 Vue 依赖，职责单一 |
| `stores/` | ⚠️ 基本合理 | subtitle store 略大（180+ 行），但 O(1) 索引 map 优化是好设计 |
| `composables/` | ⚠️ 需要治理 | 部分 composable 过于臃肿，承担了过多职责 |
| `types/` | ✅ 清晰 | SubtitleLite 与 SubtitleItem 分离设计合理 |
| `components/` | 未分析 | 本次规划聚焦 src/ 内部重构 |

### 1.3 识别出的架构问题

#### 问题 A：useSubtitleExtractor 过于臃肿（P0）

**位置：** `src/composables/useSubtitleExtractor.ts`（313 行）

**问题描述：**
- 直接实例化 `SubtitlePipeline`、`SceneDetector`，而非通过接口/依赖注入
- 管道参数（jitterMinDuration, splitMaxGap, similarMaxGap 等）全部硬编码，无法从外部配置
- `_isRoiRegionLikelyEmpty` 函数游离在模块顶层（未归入任何 class/namespace），与导出 composable 混在一起
- `startExtraction()` 函数超过 120 行，混合了循环控制、OCR 调用、管道执行、store 更新多种职责

```typescript
// 问题代码示例
pipeline = new SubtitlePipeline({
  jitterMinDuration: 0.3,      // 硬编码
  splitMaxGap: 1.5,            // 硬编码
  similarMaxGap: 0.5,           // 硬编码
  splitSimilarityThreshold: opts.mergeThreshold,
  similarSimilarityThreshold: opts.mergeThreshold,
})
```

**影响范围：** 是提取流程的唯一入口，任何参数调整都需要修改此文件。

---

#### 问题 B：composables 层缺乏清晰接口（P1）

**位置：** `src/composables/useOCREngine.ts`、`useSubtitleExtractor.ts`

**问题描述：**
- `useOCREngine` 导出了 11 个接口/函数（包括内部工具 `_mergeOCRResults`），对外接口过多
- `_mergeOCRResults` 在 `.util.test.ts` 中导出，但 `mergeOCRResults` 是 composable 实例方法，两者职责重叠
- `safeExtractROI` 逻辑较长（40+ 行），属于"图像处理"而非"引擎管理"，应提取为独立工具

```typescript
// useOCREngine 导出过多
export interface OCRResult { ... }
export interface OCRProcessingOptions { ... }
export function _mergeOCRResults(...) { ... }  // 游离工具函数
export function useOCREngine() { ... }
```

**影响范围：** 其他 composable 和组件可能直接依赖这些内部函数，形成隐性耦合。

---

#### 问题 C：useSubtitleList 与 subtitleStore 职责重叠（P1）

**位置：** `src/composables/useSubtitleList.ts`、`src/stores/subtitle.ts`

**问题描述：**
- `useSubtitleList` 重复实现了 `confidenceStats` 和 `totalCount`，这些已存在于 `subtitleStore`
- 分页逻辑 `displayCount` / `loadMore` / `hasMore` 与 store 分离，导致 UI 状态分散在两处
- 注释明确指出 "Search query and confidence filter are managed by subtitleStore directly"，但 `isFiltered` 计算属性仍重复计算了一次

```typescript
// useSubtitleList.ts 中重复的计算属性
const isFiltered = computed(() =>
  subtitleStore.searchQuery.trim() !== '' || subtitleStore.confidenceFilter !== 'all'
)
// confidenceStats 已在 subtitleStore 中存在
```

**影响范围：** UI 组件（SubtitleList.vue）需同时依赖 store 和 composable，增加了理解成本。

---

#### 问题 D：useVideoPlayer 职责界定模糊（P1）

**位置：** `src/composables/useVideoPlayer.ts`（203 行，方法不完整）

**问题描述：**
- `seekToFrame`、`togglePlay`、`setVolume` 等方法在代码中，但需要确认是否完整实现
- 播放器状态（isReady, isLoading, error）与 projectStore 有部分重叠（isPlaying）
- `captureFrame()` 返回 `ImageData`，但未处理跨域/CORS 场景（若未来需要）

```typescript
// 状态重复
// projectStore: isPlaying, currentFrame, volume, isMuted
// useVideoPlayer: isReady, isLoading, error, videoRef
```

---

#### 问题 E：BatchProcessor 强耦合 Tauri（P2）

**位置：** `src/composables/useBatchProcessor.ts`

**问题描述：**
- 直接使用 `import { invoke } from '@tauri-apps/api/core'`，无法在 Web 环境下测试
- 批处理核心逻辑与 Tauri 命令调用混合在一起
- 若未来支持 Web Workers 批处理，需大规模重写

---

#### 问题 F：SubtitleExporter 格式扩展方式冗余（P2）

**位置：** `src/core/SubtitleExporter.ts`

**问题描述：**
- FORMATTERS map 动态构建，每个格式函数直接内联
- 新增格式需要修改 Exporter 类本身，而不是通过配置扩展
- `getExporter()` 全局单例模式在小规模项目中合理，但未提供 `dispose()` 方法，存在隐式状态

```typescript
// 扩展格式需要修改源码
const FORMATTERS: Record<ExportFormat, (subs: SubtitleItem[]) => string> = {
  srt: formatSRT,
  vtt: formatVTT,
  // ... 新增格式需修改此处
}
```

---

#### 问题 G：ConfidenceCalibrator 语言检测不够健壮（P2）

**位置：** `src/core/ConfidenceCalibrator.ts`

**问题描述：**
- 语言检测依赖 `['ch', 'chi', 'ja', 'ko']` 字符串数组匹配，非类型安全
- CJK 字符范围 `\u4e00-\u9fff` 仅覆盖中文，不含中日韩统一表意文字扩展区
- 增强校准中 "trimmed" vs "text" 变量混用，可能导致边缘情况不一致

```typescript
// 非类型安全
if (['ch', 'chi', 'ja', 'ko'].includes(lang)) { ... }
// 扩展区未覆盖（如 㐀 U+3400 不在范围内）
```

---

## 二、重构优先级与任务清单

### P0 — 必须修复（架构性缺陷，影响扩展性）

---

#### 任务 P0-1：useSubtitleExtractor 管道配置外部化 + 职责拆分

**文件：** `src/composables/useSubtitleExtractor.ts`

**要改什么：**
1. 将硬编码的管道参数（jitterMinDuration=0.3, splitMaxGap=1.5, similarMaxGap=0.5）改为从 `projectStore.extractOptions` 读取，新增 `pipelineOptions` 字段到 ExtractOptions 类型
2. `_isRoiRegionLikelyEmpty` 提取为独立文件 `src/core/RoiDetector.ts`，class 化
3. `startExtraction()` 拆分为：
   - `_buildPipeline(opts)` — 构建管道
   - `_runExtractionLoop()` — 主循环（提取为私有方法）
   - `startExtraction()` 变为协调者（调用上述两个）
4. SceneDetector 实例不再在 composable 内 new，改为从 core 工厂函数获取
5. 增加 `pipelineOptions` 到 ExtractOptions 类型，默认为 DEFAULT_PIPELINE_OPTIONS

**为什么改：**
- 当前参数硬编码，每次调整需改源码，无法通过 UI 配置
- 300+ 行函数难以测试，拆分后每段逻辑可独立单元测试

**验收标准：**
- [ ] `ExtractOptions` 新增 `pipelineOptions?: Partial<PipelineOptions>` 字段
- [ ] `_isRoiRegionLikelyEmpty` 迁移至 `src/core/RoiDetector.ts`，原有引用不破坏
- [ ] `startExtraction()` 内联代码不超过 80 行
- [ ] 新增 `RoiDetector` 单元测试覆盖率 > 80%
- [ ] 193 个现有测试全部通过

---

#### 任务 P0-2：useSubtitleList 与 subtitleStore 职责去重

**文件：** `src/composables/useSubtitleList.ts`、`src/stores/subtitle.ts`

**要改什么：**
1. `useSubtitleList` 删除 `totalCount`、`filteredCount`、`isFiltered`、`lowConfCount` — 这些已在 subtitleStore 的 computed 中存在
2. 分页逻辑（displayCount/loadMore/hasMore）保留在 composable，这是 UI 特有状态，合理
3. 若 SubtitleList.vue 组件同时注入了 store 和 composable，统一为只注入 store（composable 作为 store 的 UI 封装层）
4. 删除注释 `# NOTE: Search query and confidence filter are managed by subtitleStore directly`，改为明确说明哪些状态是 composable 独有的

**为什么改：**
- 重复计算属性增加维护成本，两个数据源可能不同步
- 组件开发时需要理解两套数据源，增加了认知负担

**验收标准：**
- [ ] `useSubtitleList` 导出项减少 ≥ 4 个（删除冗余 computed）
- [ ] `totalCount`、`filteredCount`、`isFiltered`、`lowConfCount` 不再出现于 useSubtitleList
- [ ] 使用 useSubtitleList 的组件（如 SubtitleList.vue）仍正常渲染
- [ ] 193 个现有测试全部通过

---

### P1 — 应该修复（代码质量/可维护性）

---

#### 任务 P1-1：useOCREngine 接口收敛

**文件：** `src/composables/useOCREngine.ts`

**要改什么：**
1. 将导出项精简为只暴露 `useOCREngine` composable，删除顶级的 `export interface OCRResult`、`export interface OCRProcessingOptions`（改为文件内部类型）
2. `_mergeOCRResults` 重命名为 `mergeOCRResultsGrid`，与 composable 实例方法 `mergeOCRResults` 明确区分
3. `safeExtractROI` 提取为 `src/utils/imageUtils.ts` — 通用图像处理工具，不依赖 composable 状态
4. 将 `applyPreprocessing` 移出 useOCREngine，作为独立函数

**为什么改：**
- 过多的顶级导出污染了模块命名空间，其他文件可能直接引用内部类型
- `safeExtractROI` 是纯图像处理逻辑，与 OCR 引擎生命周期无关

**验收标准：**
- [ ] useOCREngine 顶级导出 ≤ 2 个（useOCREngine 默认导出 + getOCRError 类型）
- [ ] `safeExtractROI` 移至 `src/utils/imageUtils.ts`
- [ ] `_mergeOCRResults` 重命名，测试文件同步更新
- [ ] 193 个现有测试全部通过

---

#### 任务 P1-2：useVideoPlayer 状态与 projectStore 分离

**文件：** `src/composables/useVideoPlayer.ts`、`src/stores/project.ts`

**要改什么：**
1. 审查 `isReady`、`isLoading`、`error` 与 projectStore 的 `isPlaying` 是否重叠
2. 若 isLoading 等状态只在 composable 内部使用，保留；若需要全局访问，迁移到 projectStore
3. `captureFrame()` 增加错误处理（ImageData 为空时的降级处理）
4. 补全缺失的方法实现（检查 seekToFrame, setVolume 等是否有完整实现）

**为什么改：**
- 避免同一状态在多处维护导致的不一致
- VideoPlayer 是核心组件，状态管理不清晰会引发难以调试的 bug

**验收标准：**
- [ ] `isReady`、`isLoading`、`error` 状态来源明确（不在两处同时定义）
- [ ] `captureFrame()` 在 ImageData 为空时返回 null 而非抛错
- [ ] useVideoPlayer 所有公共方法有完整实现（无 TODO）

---

#### 任务 P1-3：SubtitlePipeline 缓存 LRU 逻辑修复

**文件：** `src/core/SubtitlePipeline.ts`

**要改什么：**
LRU 淘汰逻辑存在 bug：当 `this._map.size > 3000` 时，连续 shift 了 4 次而不是正确淘汰一个元素。

```typescript
// 当前错误代码（line ~55）
if (this._map.size > 3000) {
  const oldest = this._order.shift()
  if (oldest) { this._map.delete(oldest); this._order.shift() }  // 删除 oldest 后又删了 _order[0]
  this._map.delete(this._order.shift()!)  // 删了 _order[0]（second oldest）
  this._order.shift()                     // 又删了 _order[0]（third oldest）
}
```

修正为正确 LRU：
```typescript
if (this._map.size > 3000) {
  const oldest = this._order.shift()
  if (oldest) {
    this._map.delete(oldest)
    this._order.shift() // 仅清理 order 中的对应位置
  }
}
```

**为什么改：**
- 这段代码在缓存满时删除了 3-4 个 entry，但 LRU 应该只淘汰 1 个最老的
- 修复后缓存行为正确，且 O(1) 操作不受影响

**验收标准：**
- [ ] SimilarityCache LRU 逻辑正确（每次只淘汰 1 个最老 entry）
- [ ] 缓存大小保持在 3000 ± 10 范围内（允许小量浮动）
- [ ] 193 个现有测试全部通过

---

#### 任务 P1-4：BatchProcessor 测试可分离性

**文件：** `src/composables/useBatchProcessor.ts`

**要改什么：**
1. 将 Tauri `invoke` 调用提取为抽象接口 `BatchBackend`（interface）
2. 提供 `NodeBatchBackend`（Tauri）和 `MockBatchBackend`（测试用）两个实现
3. 测试环境使用 MockBatchBackend，不依赖真实 Tauri 命令

**为什么改：**
- 当前批处理逻辑无法在 Node.js 或 Web 测试环境中独立运行
- 核心逻辑（ETA 计算、并发控制、状态管理）与后端通信解耦后，单元测试覆盖率可大幅提升

**验收标准：**
- [ ] 新增 `BatchBackend` interface，包含 `executeJob`, `cancelJob` 方法签名
- [ ] `useBatchProcessor` 接受 `BatchBackend` 作为可选参数，默认使用 Tauri 实现
- [ ] 核心逻辑可使用 MockBatchBackend 进行单元测试
- [ ] 193 个现有测试全部通过

---

### P2 — 可以改进（代码优化/长期健康）

---

#### 任务 P2-1：ConfidenceCalibrator 语言检测类型化

**文件：** `src/core/ConfidenceCalibrator.ts`

**要改什么：**
1. 新增 `type Script = 'chinese' | 'japanese' | 'korean' | 'latin' | 'other'`
2. 将 `lang: string` 参数改为 `lang: string, script: Script`，调用方传入 script 类型
3. 扩展 CJK 检测范围至 `\u4e00-\u9fff` 之外（使用 Unicode 区块判断）
4. `calibrateEnhanced` 中的 `trimmed` vs `text` 混用问题统一为一致使用 `trimmed`

**为什么改：**
- 当前字符串匹配 `['ch', 'chi', 'ja', 'ko']` 无法覆盖所有语言代码，容易遗漏
- CJK 检测范围不足会导致某些边缘中文字符未被正确处理

**验收标准：**
- [ ] 新增 `Script` 类型且为联合类型 `'chinese' | 'japanese' | 'korean' | 'latin' | 'other'`
- [ ] `calibrateEnhanced` 接受 `script` 参数，替代字符串语言码判断
- [ ] Unicode 扩展区 B（U+20000-U+2A6DF）纳入 CJK 检测
- [ ] `trimmed`/`text` 变量使用在 calibrateEnhanced 中无混用

---

#### 任务 P2-2：SubtitleExporter 格式插件化改造

**文件：** `src/core/SubtitleExporter.ts`

**要改什么：**
1. 新增 `export interface FormatPlugin { format: ExportFormat; serialize: (subs: SubtitleItem[]) => string }`
2. Exporter 构造函数接受 `plugins?: FormatPlugin[]`，默认使用内置插件
3. `getExporter()` 增加 `dispose()` 方法用于释放单例
4. 内置格式（SRT/VTT/ASS/JSON 等）作为默认插件注册

**为什么改：**
- 当前扩展格式需修改 Exporter 类，新增插件化架构后可独立注册
- 单例无法重置，在测试场景下可能产生状态残留

**验收标准：**
- [ ] `FormatPlugin` 接口存在且 `SubtitleExporter` 接受插件数组
- [ ] 默认行为与修改前完全一致（内置格式全部可用）
- [ ] 新增格式只需注册插件，不修改 Exporter 源码
- [ ] `getExporter().dispose()` 可重置单例状态

---

#### 任务 P2-3：新增 `src/utils/` 目录，收纳游离工具函数

**文件：** `src/utils/imageUtils.ts`（新建）、`src/utils/timeUtils.ts`（新建）

**要改什么：**
1. `src/utils/imageUtils.ts` — 从 useOCREngine 迁移 `safeExtractROI`
2. `src/utils/timeUtils.ts` — 从 SubtitleExporter 迁移 `tsSRT`、`tsVTT`、`tsASS` 等时间格式化函数
3. 两个文件均导出纯函数，无副作用
4. 原有引用路径更新，不破坏现有功能

**为什么改：**
- SubtitleExporter 中的时间格式化函数是纯工具逻辑，与"导出"本身无关
- 工具函数分散在 composable/core 中导致可复用性差

**验收标准：**
- [ ] `src/utils/imageUtils.ts` 存在且 `safeExtractROI` 可从 utils 导入
- [ ] `src/utils/timeUtils.ts` 存在且包含 pad2/pad3/_decompose/tsSRT 等函数
- [ ] 原使用处更新 import 路径
- [ ] 193 个现有测试全部通过

---

## 三、执行路线图

### Phase 1：P0 修复（预计改动量：3 人日）

```
P0-1: useSubtitleExtractor 管道配置外部化 + 职责拆分
  ├─ ExtractOptions 新增 pipelineOptions
  ├─ RoiDetector class 抽取到 src/core/RoiDetector.ts
  ├─ startExtraction() 拆分为协调者 + 私有方法
  └─ 管道参数从 projectStore.extractOptions 读取

P0-2: useSubtitleList 与 subtitleStore 职责去重
  ├─ 删除 useSubtitleList 中的冗余 computed
  └─ 确认组件渲染正常

✅ 完成后：架构分层清晰，提取流程可配置
```

### Phase 2：P1 修复（预计改动量：2 人日）

```
P1-1: useOCREngine 接口收敛
  ├─ 清理顶级导出项
  ├─ safeExtractROI 移至 src/utils/imageUtils.ts
  └─ _mergeOCRResults 重命名

P1-2: useVideoPlayer 状态分离 + captureFrame 错误处理
  └─ 审查与 projectStore 重叠的状态

P1-3: SubtitlePipeline LRU 逻辑修复
  └─ 修正 SimilarityCache 淘汰算法

P1-4: BatchProcessor 测试可分离性
  └─ 抽象 BatchBackend 接口
```

### Phase 3：P2 改进（预计改动量：2 人日）

```
P2-1: ConfidenceCalibrator 语言检测类型化
P2-2: SubtitleExporter 格式插件化改造
P2-3: src/utils/ 目录建立 + 工具函数迁移
```

---

## 四、约束与原则

1. **测试覆盖率不退坡**：每次重构后运行完整测试套件，任何测试失败必须回退或修复
2. **渐进式提交**：每个任务单独 commit，commit message 遵循 `[refactor] <task-id> <描述>` 格式
3. **向后兼容**：类型变更（如 ExtractOptions 新增字段）需提供默认值，不破坏现有调用
4. **无功能变更**：本次重构是纯代码质量改善，不改变任何用户可见行为