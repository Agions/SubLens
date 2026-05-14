---
title: SubLens Pipeline
---

# Pipeline — OCR 后处理管道

## 概述

`Pipeline.ts` 是 SubLens 的核心字幕后处理引擎，将 OCR 原始输出转换为干净、可导出的高质量字幕。

设计原则：**纯函数、无副作用、可独立测试、可配置**。

## 管道结构

```
RawSubtitle[] (OCR 原始输出)
    │
    ▼ Stage 0: normalize
    │  · CRLF / CR → LF
    │  · trim 首尾空白
    │  · 压缩连续空行（3+ → 1）
    │
    ▼ Stage 1: filterJitter
    │  · 短时间（< 0.3s）+ 低置信度（< 0.5）→ 视为噪声
    │  · 三连相同文本 → 合并
    │  · 相邻高相似度（> 0.9）→ 吸收合并
    │
    ▼ Stage 2: mergeSplit
    │  · 场景跳跃导致字幕分裂
    │  · gap ≤ 1.5s + 相似度 ≥ 0.85 → 合并
    │
    ▼ Stage 3: mergeSimilar
    │  · 时间接近（gap ≤ 0.5s）+ 相似度 ≥ 0.80 → 合并
    │
    ▼ Stage 4: computeEndTime
       · 根据下一条字幕的 startTime 精确截断 endTime
       · 最后一条保留原始 endTime

CleanSubtitle[] (可导出输出)
```

## 使用方式

```typescript
import { Pipeline, DEFAULT_PIPELINE_OPTIONS } from '@/core/Pipeline'

// 默认配置
const pipeline = new Pipeline()
const cleaned = pipeline.process(rawSubtitles)

// 自定义配置
const customPipeline = new Pipeline({
  jitterMinDuration: 0.5,           // 调高：过滤更多噪声
  jitterMinConfidence: 0.6,
  splitGapThreshold: 1.5,          // 调整合并阈值
  splitSimilarityThreshold: 0.9,   // 调高：更少合并
  similarGapThreshold: 0.5,
  similarSimilarityThreshold: 0.85,
})

// 单独运行某阶段（调试）
const afterDenoise = pipeline.processStage(rawSubtitles, 1)
```

## 配置选项

| 选项 | 类型 | 默认值 | 说明 |
|:---|:---|:---|:---|
| `jitterMinDuration` | `number` | `0.3` | 最短字幕时长（秒），低于此值视为噪声 |
| `jitterMinConfidence` | `number` | `0.5` | 最低置信度，低于此值结合短时长视为噪声 |
| `splitGapThreshold` | `number` | `1.5` | 分裂合并的最大时间间隔（秒）|
| `splitSimilarityThreshold` | `number` | `0.85` | 分裂合并的相似度阈值 |
| `similarGapThreshold` | `number` | `0.5` | 相似合并的最大时间间隔（秒）|
| `similarSimilarityThreshold` | `number` | `0.80` | 相似合并的相似度阈值 |
| `normalizeOptions` | `NormalizeOptions` | 见下 | 文本规范化选项 |

## 相似度算法

使用 Levenshtein 距离计算文本相似度：

```typescript
function similarity(a: string, b: string): number {
  const distance = levenshtein(a, b)
  return 1 - distance / Math.max(a.length, b.length)
}
```

## 输出类型

```typescript
interface CleanSubtitle {
  index: number        // 序号
  startTime: number    // 开始时间（秒）
  endTime: number      // 结束时间（秒）
  text: string         // 清洗后文本
  confidence: number   // 加权置信度
  signals: string[]   // 质量信号（用于调试）
}
```

## 性能数据

> 测试条件：10,000 条 RawSubtitle（模拟 2 小时视频）

| 阶段 | 平均耗时 | 内存增量 |
|:---|:---|:---|
| Stage 0 normalize | ~2ms | ~0.1MB |
| Stage 1 filterJitter | ~5ms | ~0.1MB |
| Stage 2 mergeSplit | ~15ms | ~0.2MB |
| Stage 3 mergeSimilar | ~12ms | ~0.2MB |
| Stage 4 computeEndTime | ~1ms | ~0MB |
| **总计** | **~35ms** | **~0.6MB** |

## 测试

```bash
pnpm test src/core/Pipeline.ts
```
