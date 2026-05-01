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

## JSON 格式（帧级精确）

JSON 格式包含帧级映射信息，适合精确编辑：

```json
{
  "tool": "SubLens",
  "version": "3.5.0",
  "video": {
    "path": "video.mp4",
    "fps": 30.0,
    "frameCount": 9688
  },
  "subtitles": [
    {
      "index": 1,
      "startFrame": 150,
      "endFrame": 210,
      "startTime": 5.0,
      "endTime": 7.0,
      "text": "Hello, World!",
      "confidence": 0.95
    }
  ]
}
```

## LRC 格式（歌词同步）

```lrc
[ti:SubLens Export]
[ar:SubLens]
[al:Subtitle Export]
[by:SubLens v3.0]
[offset:0]

[00:05.00]Hello, World!
[00:07.00]欢迎使用 SubLens
```

## 多格式批量导出

```bash
sublens-cli extract video.mp4 --format srt,vtt,ass,json,csv --output ./exports
```

或使用 GUI：在 **Export** 标签页勾选需要的格式，点击 **Export**。
