# SceneDetect

基于量化 RGB 直方图 + 卡方距离的场景检测算法。

## 签名

```typescript
function detectSceneChanges(
  frames: ImageData[],
  threshold?: number
): SceneChange[]
```

## 算法

1. 每帧计算 RGB 16-bin × 3-channel = 48 计数器直方图
2. 帧间直方图使用卡方距离（χ²）比较
3. 距离超过阈值判定为场景切换
4. 对光照渐变鲁棒（渐变产生平滑距离曲线，不会突变）

**复杂度：** O(n) 时间，O(48) 内存（固定48计数器）

## 示例

```typescript
import { detectSceneChanges } from '@/core/SceneDetect'

const scenes = detectSceneChanges(videoFrames, 0.3)
```

## 参数

| 参数 | 类型 | 默认值 | 说明 |
|:---|:---|:---|:---|
| `frames` | `ImageData[]` | — | 视频帧数据 |
| `threshold` | `number` | `0.3` | 检测阈值（0.0–1.0）|

## 返回值

```typescript
interface SceneChange {
  startTime: number
  endTime: number
  frameIndex: number
}
```
