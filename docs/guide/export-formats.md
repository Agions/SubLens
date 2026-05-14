# 导出格式

## 支持的格式

SubLens 支持 12 种字幕格式导出：

| 格式 | 文件扩展名 | 兼容性 | 特点 |
|:---|:---|:---|:---|
| **SRT** | `.srt` | ★★★ | 最通用，几乎所有播放器支持 |
| **VTT** | `.vtt` | ★★★ | HTML5 视频标准，支持样式 |
| **ASS** | `.ass` | ★★ | Advanced SubStation Alpha，支持高级样式 |
| **SSA** | `.ssa` | ★★ | SubStation Alpha，ASS 前身 |
| **LRC** | `.lrc` | ★★★ | 歌词格式，同步歌词播放器 |
| **SBV** | `.sbv` | ★★ | YouTube 字幕格式 |
| **JSON** | `.json` | ★★ | 结构化数据，程序处理友好 |
| **CSV** | `.csv` | ★★★ | Excel / Sheets 可直接打开 |
| **TXT** | `.txt` | ★★★ | 纯文本，无时间信息 |
| **MD** | `.md` | ★★ | Markdown，含时间戳标题 |
| **STL** | `.stl` | ★ | Spruce Subtitle File，广播级 |
| **TTML** | `.ttml` | ★ | Timed Text Markup Language，W3C 标准 |

## SRT（默认推荐）

```srt
1
00:00:01,000 --> 00:00:04,500
这是第一条字幕

2
00:00:05,200 --> 00:00:08,800
这是第二条字幕
```

- 简单易读，文本编辑器可直接编辑
- 被几乎所有视频播放器支持
- 无样式支持

## VTT（Web 推荐）

```vtt
WEBVTT

00:00:01.000 --> 00:00:04.500
这是第一条字幕

00:00:05.200 --> 00:00:08.800
这是第二条字幕
```

- HTML5 `<video>` 原生支持
- 支持 CSS 样式标注
- Web 嵌入视频首选

## ASS（高级样式）

```ass
[Script Info]
Title: SubLens Export

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, Bold, Alignment
Style: Default,Arial,20,&H00FFFFFF,0,2

[Events]
Format: Layer, Start, End, Style, Text
Dialogue: 0,0:00:01.00,0:00:04.50,Default,0,0,0,,第一条字幕
Dialogue: 0,0:00:05.20,0:00:08.80,Default,0,0,0,,第二条字幕
```

- 支持字体颜色、大小、位置、旋转
- 支持卡拉OK效果
- 适用于 anime / 弹幕视频压制

## LRC（歌词同步）

```lrc
[00:01.00] 这是第一条字幕
[00:05.20] 这是第二条字幕
```

- 音乐播放器歌词同步
- 适合将字幕作为学习笔记

## JSON（程序处理）

```json
{
  "format": "SRT",
  "tool": "SubLens",
  "exportedAt": "2026-05-11T10:30:00.000Z",
  "subtitles": [
    {
      "index": 1,
      "startTime": 1.0,
      "endTime": 4.5,
      "text": "这是第一条字幕",
      "confidence": 0.95
    }
  ]
}
```

- 保留完整元数据
- 方便后续程序处理或转换

## CSV（数据分析）

```csv
index,start_time,end_time,text,confidence
1,1.0,4.5,这是第一条字幕,0.95
2,5.2,8.8,这是第二条字幕,0.88
```

- Excel / Google Sheets 直接打开
- 适合数据分析和二次处理

## 导出选项

| 选项 | 说明 | 适用格式 |
|:---|:---|:---|
| `includeTimecode` | 是否包含时间码 | 所有格式 |
| `includeConfidence` | 是否包含置信度 | JSON, CSV |
| `encoding` | 文件编码 | SRT, VTT, ASS, TXT |
| `formatVersion` | 格式版本 | VTT (v1/v2), ASS (v4/v4+) |

## 批量导出

支持一次性导出多种格式：

1. 在导出面板勾选多个格式
2. 点击「导出全部」
3. 选择保存目录
4. 每个格式生成单独文件

文件命名规则：`{原视频名}_{格式}.{扩展名}`
