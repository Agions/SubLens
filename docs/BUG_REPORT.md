# SubLens Bug Report

> QA Reviewer: claw (subagent)
> Date: 2026-04-29
> Project: SubLens — /root/.openclaw/workspace/SubLens
> Test Baseline: 193 tests passing

---

## P0 — 严重问题（需立即修复）

### P0-1: `useSubtitleExtractor.ts` — cleaned.map 内嵌 .find 导致潜在 O(n²) 退化

**文件:** `src/composables/useSubtitleExtractor.ts`
**行号:** ~220–235

**代码片段:**
```typescript
const rawIndex = new Map(rawSubs.map(r => [`${r.startTime}#${r.text}`, r]))
subtitleStore.setSubtitles(
  cleaned.map((s, i) => {
    const match = rawIndex.get(`${s.startTime}#${s.text}`)
      ?? rawSubs.find(r => Math.abs(r.startTime - s.startTime) < 0.1 && r.text === s.text)
    return { ... }
  })
)
```

**问题描述:**
- `rawIndex` Map 查询为 O(1)，但 fallback 的 `.find()` 是 O(n)
- 当 `startTime#text` 键冲突时（多条字幕时间+文本相同），fallback 会被触发
- 多次冲突累积导致整体复杂度退化为 O(n²)
- 实际风险中等：大多数字幕 startTime 不同，Map 命中率高；但批量提取长视频时风险上升

**严重程度:** 中等 — 大多数情况下性能可接受，但边界情况会退化

**修复建议:**
```typescript
// 方案 A：只用 Map 查询，不降级到 .find()
// 如果 rawSubs 中有重复 startTime#text 键，先去重再建 Map
const deduped = rawSubs.filter((r, i) =>
  rawSubs.findIndex(r2 => `${r2.startTime}#${r2.text}` === `${r.startTime}#${r.text}`) === i
)
const rawIndex = new Map(deduped.map(r => [`${r.startTime}#${r.text}`, r]))
// 移除 .find() fallback，直接用 rawIndex.get()

// 方案 B：改用 Set 建立精确匹配，跳过模糊匹配
const rawSet = new Set(rawSubs.map(r => `${r.startTime}#${r.text}`))
const match = rawSet.has(`${s.startTime}#${s.text}`) ? rawIndex.get(`${s.startTime}#${s.text}`) : undefined
```

---

### P0-2: `stores/subtitle.ts` — applyFieldEdit 使用 as 断言无运行时类型守卫

**文件:** `src/stores/subtitle.ts`
**行号:** ~183–192

**代码片段:**
```typescript
function applyFieldEdit(sub: SubtitleItem, field: EditableField, value: EditableValue) {
  if (field === 'text' && typeof value === 'string') {
    sub.text = value
    sub.edited = true
  } else if (field === 'startTime' && typeof value === 'number') {
    sub.startTime = value
  } else if (field === 'endTime' && typeof value === 'number') {
    sub.endTime = value
  }
  // ⚠️ 如果类型不匹配，什么都不做，静默失败
}
```

**问题描述:**
- `as` 断言（TypeScript）在编译后被完全擦除，无运行时效果
- 如果调用方传入类型错误的 value（例如 `'text'` 字段但 value 是 `number`），函数**静默忽略**，不报错、不抛异常
- `undo`/`redo` 操作依赖 `applyFieldEdit`，若历史记录中有类型错误的数据，会静默失效
- 用户体验差：修改不生效但无任何提示

**严重程度:** 中等 — 类型不匹配时静默失败，用户可能以为保存了修改

**修复建议:**
```typescript
function applyFieldEdit(sub: SubtitleItem, field: EditableField, value: EditableValue) {
  if (field === 'text') {
    if (typeof value !== 'string') {
      console.error(`[SubtitleStore] applyFieldEdit: expected string for 'text', got ${typeof value}`)
      return
    }
    sub.text = value
    sub.edited = true
  } else if (field === 'startTime') {
    if (typeof value !== 'number') {
      console.error(`[SubtitleStore] applyFieldEdit: expected number for 'startTime', got ${typeof value}`)
      return
    }
    sub.startTime = value
  } else if (field === 'endTime') {
    if (typeof value !== 'number') {
      console.error(`[SubtitleStore] applyFieldEdit: expected number for 'endTime', got ${typeof value}`)
      return
    }
    sub.endTime = value
  } else {
    console.error(`[SubtitleStore] applyFieldEdit: unknown field '${field}'`)
  }
}
```

---

### P0-3: `useSubtitleExtractor.ts` — ROI 检测和场景检测在 try 外部，异常无法捕获

**文件:** `src/composables/useSubtitleExtractor.ts`
**行号:** ~148–160

**代码片段:**
```typescript
// ── ROI 预检测：跳过全黑/低方差帧（无字幕概率高）───
if (isRoiRegionLikelyEmpty(frameData, roi)) {  // ⚠️ try 外部
  prevFrameData = frameData
  continue
}

// ── 场景变化检测 ──────────────────────────────────
if (prevFrameData && !sceneDetector.detect(prevFrameData, frameData)) {  // ⚠️ try 外部
  prevFrameData = frameData
  continue
}

// ── OCR 识别 ─────────────────────────────────────
try {
  // ... OCR 操作 ...
} catch (e) {
  console.error(`[Extractor] Frame ${frameIndex} OCR failed:`, e)
}
```

**问题描述:**
- `isRoiRegionLikelyEmpty` 计算 ROI 区域像素方差，若 `roi` 配置错误（如 width=0, height=0）或 `frameData` 数据损坏，会抛出异常
- `sceneDetector.detect` 若内部计算出错，同样无法被 catch 捕获
- 异常会冒泡到提取循环外，导致整个提取任务崩溃
- `try-catch` 仅包裹了 OCR 部分，其他两个关键步骤无保护

**严重程度:** 高 — 配置错误或边界数据可导致提取任务直接崩溃

**修复建议:**
```typescript
// ── ROI 预检测 ───────────────────────────────────
let skipRoiCheck = false
try {
  if (isRoiRegionLikelyEmpty(frameData, roi)) {
    prevFrameData = frameData
    continue
  }
} catch (e) {
  console.warn(`[Extractor] ROI check failed for frame ${frameIndex}, skipping:`, e)
  skipRoiCheck = true
}

if (!skipRoiCheck) {
  // ── 场景变化检测 ──────────────────────────────────
  try {
    if (prevFrameData && !sceneDetector.detect(prevFrameData, frameData)) {
      prevFrameData = frameData
      continue
    }
  } catch (e) {
    console.warn(`[Extractor] Scene detection failed for frame ${frameIndex}, skipping:`, e)
  }
}
```

---

## P1 — 中等问题（应尽快修复）

### P1-1: `SubtitleExporter.ts` — 五个时间戳函数重复调用 _decompose

**文件:** `src/core/SubtitleExporter.ts`
**行号:** ~20–67

**代码片段:**
```typescript
function tsSRT(seconds: number): string { const { h, m, s, remainder } = _decompose(seconds); ... }
function tsVTT(seconds: number): string { const { h, m, s, remainder } = _decompose(seconds); ... }
function tsASS(seconds: number): string { const { h, m, s, remainder } = _decompose(seconds); ... }
function tsSBV(seconds: number): string { const { h, m, s, remainder } = _decompose(seconds); ... }
function tsSSA(seconds: number): string { const { h, m, s, remainder } = _decompose(seconds); ... }
```

**问题描述:**
- 每个格式化函数都独立调用 `_decompose(seconds)`，分解逻辑重复 5 次
- `_decompose` 是纯函数，可直接缓存或预计算
- 代码重复，不利于后续统一修改分解逻辑

**严重程度:** 低 — 功能正确，但代码质量和维护性差

**修复建议:**
```typescript
// 提取共用的 pad 函数
const pad2 = (n: number) => n.toString().padStart(2, '0')
const pad3 = (n: number) => n.toString().padStart(3, '0')

// 统一的 decomposition + 各格式独特后处理
function _decompose(seconds: number) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  const remainder = seconds % 1
  return { h, m, s, remainder }
}

const _FORMATTERS = {
  srt: (d: ReturnType<typeof _decompose>) => `${pad2(d.h)}:${pad2(d.m)}:${pad2(d.s)},${pad3(Math.floor(d.remainder * 1000))}`,
  vtt: (d: ReturnType<typeof _decompose>) => `${pad2(d.h)}:${pad2(d.m)}:${pad2(d.s)}.${pad3(Math.floor(d.remainder * 1000))}`,
  ass: (d: ReturnType<typeof _decompose>) => `${d.h}:${pad2(d.m)}:${pad2(d.s)}.${pad2(Math.floor(d.remainder * 100))}`,
  sbv: (d: ReturnType<typeof _decompose>) => `${pad2(d.h)}:${pad2(d.m)}:${pad2(d.s)},${String(Math.floor(d.remainder * 1000)).padStart(3, '0')}`,
  ssa: (d: ReturnType<typeof _decompose>) => `${pad2(d.h)}:${pad2(d.m)}:${pad2(d.s)}:${pad2(Math.floor(d.remainder * 30))}`,
} as const

function formatTimestamp(seconds: number, format: keyof typeof _FORMATTERS): string {
  return _FORMATTERS[format](_decompose(seconds))
}
```

---

### P1-2: `SubtitleExporter.ts` — _ASS_ESCAPE_MAP 每条字幕重建一次

**文件:** `src/core/SubtitleExporter.ts`
**行号:** ~73–76, ~99–103

**代码片段:**
```typescript
const _ASS_ESCAPE_MAP = new Map([
  [/\\/g, '\\\\'],
  [/\{/g, '\\{'],
  [/\}/g, '\\}'],
  [/,/g, '\\,'],
  [/\n/g, '\\N'],
])

function formatASS(subs: SubtitleItem[]): string {
  ...
  const events = subs.map(sub => {
    let text = sub.text
    for (const [pattern, replacement] of _ASS_ESCAPE_MAP) {  // 每次迭代都重建？— 不，此处 Map 在函数作用域内，每调用一次 formatASS 重建一次
      text = text.replace(pattern, replacement)
    }
    ...
  })
}
```

**问题描述:**
- `_ASS_ESCAPE_MAP` 定义在 `formatASS` 函数内部（每次调用重建）
- `formatSSA` 也使用 `.replace(/,/g, '\\,')`，但没有统一
- 每条字幕都执行 5 次 `String.replace()`，而非预编译正则或共享 Map

**严重程度:** 低 — Map 很小(5项)，正则可复用，批量导出时 CPU 浪费

**修复建议:**
```typescript
// 模块级常量（只创建一次）
const _ASS_ESCAPE_REGEXPS: Array<[RegExp, string]> = [
  [/\\/g, '\\\\'],
  [/\{/g, '\\{'],
  [/\}/g, '\\}'],
  [/,/g, '\\,'],
  [/\n/g, '\\N'],
]

function formatASS(subs: SubtitleItem[]): string {
  ...
  const events = subs.map(sub => {
    let text = sub.text
    for (const [pattern, replacement] of _ASS_ESCAPE_REGEXPS) {
      text = text.replace(pattern, replacement)
    }
    ...
  })
}
```

---

### P1-3: `useSubtitleList.ts` — 置信度阈值 0.85/0.60 为魔法数字

**文件:** `src/composables/useSubtitleList.ts`
**行号:** ~134–156

**代码片段:**
```typescript
function getConfidenceLevel(confidence: number): 'high' | 'mid' | 'low' {
  if (confidence >= 0.85) return 'high'      // ⚠️ 魔法数字
  if (confidence >= 0.60) return 'mid'      // ⚠️ 魔法数字
  return 'low'
}

function getConfidenceHeatmap(confidence: number): string {
  if (confidence >= 0.85) { ... }            // ⚠️ 魔法数字
  else if (confidence >= 0.60) { ... }       // ⚠️ 魔法数字
  ...
}
```

**问题描述:**
- `getConfidenceLevel` 在 `types/video.ts` 已有导出函数 `getConfidenceLevel`（同名），造成命名冲突/覆盖风险
- 0.85 / 0.60 魔法数字分散在 `useSubtitleList.ts` 和 `types/video.ts` 两处
- 若业务调整阈值，需修改多个文件，容易遗漏

**严重程度:** 低 — 功能正确，但存在重复定义和维护风险

**修复建议:**
```typescript
import { getConfidenceLevel as getConfLevel, CONFIDENCE_HIGH, CONFIDENCE_MID } from '@/types/video'
// 直接复用，不用重复定义
// 如果需要额外 heatmap 逻辑，可基于已导入的常量计算
```

---

## P2 — 轻微问题（建议改进）

### P2-1: `ConfidenceCalibrator.ts` — 0.85 硬编码为 factor，不可配置

**文件:** `src/core/ConfidenceCalibrator.ts`
**行号:** ~58, ~152

**代码片段:**
```typescript
const factor = 0.85  // text too short penalty
quality *= factor
```

**问题描述:**
- `0.85` 硬编码，与 `CONFIDENCE_HIGH` 值相同但无关联
- 无法通过配置调整短文本惩罚力度

### P2-2: `SubtitlePipeline.ts` — LRU 淘汰逻辑有 bug（删除两个元素但只 shift 一次）

**文件:** `src/core/SubtitlePipeline.ts`
**行号:** ~57–60

**代码片段:**
```typescript
if (this._map.size > 3000) {
  const oldest = this._order.shift()
  if (oldest) { this._map.delete(oldest); this._order.shift() }  // ⚠️ 第二次 shift 前无判空
  this._map.delete(this._order.shift()!)  // ⚠️ 无判空，可能删除 undefined
  this._order.shift()
}
```

**问题描述:**
- 第二次和第三次 `this._order.shift()` 未检查 `oldest` 是否存在
- 若 `_order` 队列突然变空，会删除 `undefined` 并导致 `Map` 状态不一致
- 实际上 `shift()` 在空数组上返回 `undefined`，`Map.delete(undefined)` 是无害的，但逻辑不清晰

### P2-3: `SubtitleExporter.ts` — formatSSA 和 formatASS 文本转义逻辑不一致

**文件:** `src/core/SubtitleExporter.ts`

**问题描述:**
- `formatASS` 使用 `_ASS_ESCAPE_MAP`（5 条规则）处理文本
- `formatSSA` 仅处理 `,` 转义，缺少 `\{`, `\}`, `\N` 等处理
- 两者都输出 SSA/ASS 格式但转义逻辑不同，可能导致某些特殊字符导出出错

---

## 修复优先级建议

| 优先级 | 问题 | 理由 |
|--------|------|------|
| P0-3 | ROI/场景检测异常不可捕获 | 可直接导致提取崩溃，需立即修复 |
| P0-2 | applyFieldEdit 静默失败 | 影响用户编辑体验，需立即修复 |
| P0-1 | O(n²) 退化 | 边界情况触发概率中等，建议快速修复 |
| P1-3 | 魔法数字重复定义 | 代码质量问题，尽快统一 |
| P1-2 | ESCAPE_MAP 每调用重建 | 性能轻微影响，建议改进 |
| P1-1 | 时间戳函数重复 | 代码质量问题，建议改进 |
| P2-2 | LRU 淘汰 bug | 边界情况，可能无害但需清理 |
| P2-1 | 0.85 硬编码 | 配置化建议，优先级低 |
| P2-3 | SSA/ASS 转义不一致 | 边缘 case，建议评审 |

---

*Report generated by claw (SubLens QA subagent)*
