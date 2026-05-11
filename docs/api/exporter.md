# Exporter

12 格式字幕导出器。

## 支持格式

`SRT` · `VTT` · `ASS` · `SSA` · `JSON` · `CSV` · `TXT` · `LRC` · `SBV` · `MD` · `STL` · `TTML`

## 签名

```typescript
function exportSubtitles(
  subtitles: SubtitleItem[],
  format: ExportFormat,
  options?: ExportOptions
): string
```

## 示例

```typescript
import { exportSubtitles } from '@/core/Exporter'

const srt = exportSubtitles(subtitles, 'srt', {
  includeTimecodes: true
})
```

## 选项

```typescript
interface ExportOptions {
  /** 是否包含时间码（默认 true）*/
  includeTimecodes?: boolean
  /** 时间格式（仅 ASS/SSA）*/
  timeFormat?: 'srt' | 'vtt' | 'frames'
  /** 字幕样式（仅 ASS/SSA）*/
  style?: SubtitleStyle
}
```

## 帧级导出

JSON 和 CSV 格式支持帧级精确映射：

```typescript
const json = exportSubtitles(subtitles, 'json')
// 输出包含 fps、frameIndex 等帧级信息
```
