---
title: SubLens SceneDetect
---

# SceneDetect — 场景检测

## 概述

SubLens 有两套场景检测实现：

| 实现 | 位置 | 引擎 | 适用场景 |
|:---|:---|:---|:---|
| **前端 TS** | `src/core/SceneDetect.ts` | 纯 JS 直方图 + 卡方检验 | 轻量预览、离线工作 |
| **后端 Rust** | `src-tauri/src/commands/scene.rs` | Python scenedetect 库 | 高精度生产检测 |

## 前端实现（SceneDetect.ts）

纯 JavaScript 实现，基于 **RGB 直方图（16 bins/通道）+ 卡方检验**。

### 核心算法

```typescript
// 1. 构建 RGB 直方图（每通道 16 bins，共 48 个计数器）
// R: bins[0-15], G: bins[16-31], B: bins[32-47]
function buildHistogram(frame: ImageData): Int32Array {
  const binCount = 16
  const hist = new Int32Array(binCount * 3)  // R, G, B
  for (let i = 0; i < frame.data.length; i += 4 * SAMPLE_STRIDE) {
    hist[Math.floor(frame.data[i]     / 256 * binCount)]++
    hist[binCount + Math.floor(frame.data[i + 1] / 256 * binCount)]++
    hist[binCount * 2 + Math.floor(frame.data[i + 2] / 256 * binCount)]++
  }
  return hist
}

// 2. 卡方检验比较两帧
function chiSquareTest(hist1: Int32Array, hist2: Int32Array): number {
  let chiSq = 0
  for (let i = 0; i < hist1.length; i++) {
    if (hist1[i] > 0) {
      chiSq += (hist2[i] - hist1[i]) ** 2 / hist1[i]
    }
  }
  return chiSq
}

// 3. 检测场景切换
function detectScenes(frames: ImageData[], threshold: number): number[] {
  const sceneIndices: number[] = [0]
  let prevHist = buildHistogram(frames[0])

  for (let i = 1; i < frames.length; i++) {
    const currHist = buildHistogram(frames[i])
    const chiSq = chiSquareTest(prevHist, currHist)

    if (chiSq > threshold) {
      sceneIndices.push(i)
    }
    prevHist = currHist
  }
  return sceneIndices
}
```

### 使用方式

```typescript
import { SceneDetector } from '@/core/SceneDetect'

const detector = new SceneDetector({
  threshold: 0.5,    // 卡方阈值（默认 0.5，越低越敏感）
  skipFrames: 1,     // 每隔 N 帧检测一次（默认 1）
})

const sceneIndices = detector.detect(videoElement)
// → [0, 48, 123, 189, ...]  场景切换的帧索引
```

### 阈值选择建议

| 视频类型 | 推荐阈值 | 说明 |
|:---|:---|:---|
| 电影/电视剧 | 0.3~0.5 | 镜头切换明显 |
| 综艺/访谈 | 0.5~0.7 | 包含大量静帧 + 字幕动画 |
| 纪录片 | 0.2~0.4 | 渐变和溶解较多 |
| 动画 | 0.4~0.6 | 场景切换规律 |

## 后端实现（scene.rs）

调用 `scene_detect.py`（基于 `scenedetect` 库），提供更高精度的场景检测。

```bash
# 直接调用
python scene_detect.py --input video.mp4 --threshold 30
```

Rust 命令：

```typescript
const scenes = await invoke<SceneChange[]>('detect_scenes', {
  path: '/path/to/video.mp4',
  threshold: 0.3
})
```

## 场景类型

| 类型 | 说明 | 检测方式 |
|:---|:---|:---|
| `cut` | 硬切 | 直方图突变 |
| `fade` | 淡入淡出 | 连续多帧小变化累积 |
| `dissolve` | 叠化 | 中等程度变化 |

## 性能对比

| 实现 | 10 分钟视频耗时 | 精度 |
|:---|:---|:---|
| 前端 TS | ~800ms | 90% |
| 后端 scenedetect | ~3s | 98% |

## 测试

```bash
pnpm test src/core/SceneDetect.ts
```
