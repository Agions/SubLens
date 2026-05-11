# Pipeline

四阶段 OCR 后处理管道，输入原始 OCR 结果，输出清洗后的字幕。

## 签名

```typescript
function processPipeline(
  subtitles: SubtitleItem[],
  options?: PipelineOptions
): Promise<SubtitleItem[]>
```

## 阶段

| 阶段 | 函数 | 说明 |
|:---|:---|:---|
| 0 | `normalize` | 文本正则化（CRLF 合并、全角/半角规范化）|
| 1 | `filterJitter` | 移除单帧 OCR 噪声 |
| 2 | `mergeSplit` | 合并因场景跳跃而分裂的相同字幕 |
| 3 | `mergeSimilar` | 合并时间接近的相似字幕 |
| 4 | `computeEndTime` | 根据下一条字幕计算精确 endTime |

## 示例

```typescript
import { processPipeline } from '@/core/Pipeline'

const cleaned = await processPipeline(rawOcrResults, {
  similarityThreshold: 0.8,
  maxGapSeconds: 1.5
})
```

## 选项

```typescript
interface PipelineOptions {
  /** Levenshtein 相似度阈值（默认 0.8）*/
  similarityThreshold?: number
  /** 字幕合并的最大时间间隔（秒，默认 1.5）*/
  maxGapSeconds?: number
  /** 是否启用抖动过滤（默认 true）*/
  enableJitterFilter?: boolean
  /** 是否启用分裂合并（默认 true）*/
  enableSplitMerge?: boolean
}
```

每阶段独立可测试，`textSimilarity` 结果按 (文本长度前缀 + 首尾各4字) 缓存，O(n log n) 复杂度。
