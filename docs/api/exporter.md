---
title: SubLens Exporter
---

# Exporter — 多格式导出器

## 概述

`Exporter.ts` 负责将 `SubtitleItem[]` 序列化为 9 种不同的字幕文件格式。纯函数实现，无 I/O 依赖，可直接测试。

## 导出格式一览

| 格式 | 导出函数 | 文件扩展名 |
|:---|:---|:---|
| SRT | `exportSrt` | `.srt` |
| VTT | `exportVtt` | `.vtt` |
| ASS | `exportAss` | `.ass` |
| SSA | `exportSsa` | `.ssa` |
| LRC | `exportLrc` | `.lrc` |
| SBV | `exportSbv` | `.sbv` |
| JSON | `exportJson` | `.json` |
| CSV | `exportCsv` | `.csv` |
| TXT | `exportTxt` | `.txt` |

## 统一导出入口

```typescript
import { Exporter, ExportOptions } from '@/core/Exporter'

const options: ExportOptions = {
  format: 'srt',
  includeTimecode: true,
  includeConfidence: false,
  encoding: 'UTF-8',
}

const exporter = new Exporter()
const content = exporter.export(subtitles, options)
```

## 导出选项

```typescript
interface ExportOptions {
  format: ExportFormat
  includeTimecode?: boolean    // 默认: true
  includeConfidence?: boolean  // 默认: false（仅 JSON/CSV）
  encoding?: string            // 默认: 'UTF-8'
  title?: string               // 字幕标题（用于 ASS/SSA）
}
```

## 格式详解

### SRT

```typescript
const content = Exporter.exportSrt(subtitles, { includeTimecode: true })
```

时间格式：`HH:MM:SS,mmm`（逗号分隔毫秒）

### VTT

```typescript
const content = Exporter.exportVtt(subtitles)
```

包含 `WEBVTT` header，支持 CSS 样式注释。

### ASS/SSA

```typescript
const content = Exporter.exportAss(subtitles, {
  title: 'My Subtitle',
  style: {
    fontName: 'Arial',
    fontSize: 20,
    primaryColor: '#FFFFFF',
  }
})
```

ASS (Advanced SubStation Alpha) 支持：
- 字体、大小、颜色
- 粗体、斜体、下划线
- 字幕位置（对齐方式）
- 卡拉OK效果

### JSON

```typescript
const content = Exporter.exportJson(subtitles, {
  includeConfidence: true,
  title: 'Video Subtitle'
})
```

输出结构：

```json
{
  "format": "SRT",
  "tool": "SubLens",
  "version": "3.6.0",
  "exportedAt": "2026-05-11T10:30:00.000Z",
  "title": "Video Subtitle",
  "subtitles": [
    {
      "index": 1,
      "startTime": 1.0,
      "endTime": 4.5,
      "text": "字幕文本",
      "confidence": 0.95
    }
  ]
}
```

### CSV

```typescript
const content = Exporter.exportCsv(subtitles, {
  includeConfidence: true
})
```

输出为标准 CSV，首行为表头：`index,start_time,end_time,text,confidence`

## 辅助函数

### `getFormatDisplayName`

```typescript
Exporter.getFormatDisplayName('ass')  // → 'Advanced SubStation Alpha (ASS)'
```

### `getFormatExtension`

```typescript
Exporter.getFormatExtension('srt')  // → '.srt'
```

### `isFormatSupported`

```typescript
Exporter.isFormatSupported('pdf')  // → false
```

## 测试

```bash
pnpm test src/core/Exporter.ts
```
