# 导出格式

SubLens 支持 12 种字幕/文本导出格式。

## 格式总览

| 格式 | 帧映射 | 推荐场景 |
|:---|:---:|:---|
| **SRT** | — | 通用播放器 |
| **WebVTT** | — | Web 视频 |
| **ASS** | — | 动漫字幕，高级样式 |
| **SSA** | — | 传统字幕格式 |
| **JSON** | ✅ | 帧级精确编辑 |
| **CSV** | ✅ | 电子表格分析 |
| **TXT** | — | 纯文本 |
| **LRC** | — | 歌词同步 |
| **SBV** | — | YouTube 字幕 |
| **MD** | — | Markdown 文档 |
| **STL** | — | Spruce 字幕 |
| **TTML** | — | Timed Text ML |

## JSON（帧级精确）

```json
{
  "version": "3.6.0",
  "format": "json",
  "video": {
    "path": "video.mp4",
    "fps": 23.976
  },
  "subtitles": [
    {
      "index": 1,
      "startTime": 1.500,
      "endTime": 3.200,
      "text": "Hello, world!",
      "confidence": 0.95
    }
  ]
}
```

## SRT（通用推荐）

```
1
00:00:01,500 --> 00:00:03,200
Hello, world!

2
00:00:05,000 --> 00:00:07,800
This is SubLens.
```

## ASS（动漫/高级样式）

支持高级字幕样式：字体、颜色、位置、动画效果。

## CSV（数据分析）

```csv
index,start,end,text,confidence
1,1.500,3.200,"Hello, world!",0.95
2,5.000,7.800,"This is SubLens.",0.88
```

## 格式选择建议

| 用途 | 推荐格式 |
|------|---------|
| 通用播放器 | SRT |
| 帧级精确编辑 | JSON |
| 动漫字幕 | ASS |
| Web 嵌入 | WebVTT |
| 数据分析 | CSV / JSON |
| 歌词同步 | LRC |
| YouTube 导入 | SBV |
