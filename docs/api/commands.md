---
title: SubLens API 命令总览
---

# Tauri 命令总览

## 概览

SubLens 后端通过 Tauri IPC 暴露 11 个命令给前端调用。

## 命令列表

### video 模块

#### `get_video_metadata`

获取视频文件的元数据（时长、分辨率、帧率、码率等）。

```typescript
const meta = await invoke<VideoMetadata>('get_video_metadata', {
  path: '/path/to/video.mp4'
})
```

**参数：**

| 参数 | 类型 | 说明 |
|:---|:---|:---|
| `path` | `string` | 视频文件绝对路径 |

**返回值：** `VideoMetadata`

| 字段 | 类型 | 说明 |
|:---|:---|:---|
| `duration` | `number` | 时长（秒） |
| `width` | `number` | 像素宽度 |
| `height` | `number` | 像素高度 |
| `fps` | `number` | 帧率 |
| `bitrate` | `number` | 码率（bps）|
| `codec` | `string` | 视频编码 |

**内部实现：** 三层降级策略：`ffprobe` → `ffmpeg` → 文件大小估算

---

#### `extract_frame_at_time`

在指定时间点提取一帧画面，返回 Base64 PNG。

```typescript
const base64 = await invoke<string>('extract_frame_at_time', {
  path: '/path/to/video.mp4',
  timeSeconds: 10.5
})
```

**参数：**

| 参数 | 类型 | 说明 |
|:---|:---|:---|
| `path` | `string` | 视频文件绝对路径 |
| `timeSeconds` | `number` | 时间点（秒，支持小数）|

**返回值：** `string` — Base64 编码的 PNG 图像数据

---

### file 模块

#### `open_file_dialog`

打开原生文件选择对话框。

```typescript
const result = await invoke<string | null>('open_file_dialog', {
  filters: [
    { name: 'Video', extensions: ['mp4', 'mkv', 'avi', 'mov'] }
  ],
  multiple: false
})
```

#### `save_file_dialog`

打开原生保存文件对话框。

```typescript
const result = await invoke<string | null>('save_file_dialog', {
  defaultPath: 'subtitles.srt',
  filters: [
    { name: 'Subtitle', extensions: ['srt'] }
  ]
})
```

#### `get_file_info`

获取文件信息（大小、修改时间等）。

```typescript
const info = await invoke<FileInfo>('get_file_info', {
  path: '/path/to/file.txt'
})
```

#### `read_text_file`

读取文本文件内容。

```typescript
const content = await invoke<string>('read_text_file', {
  path: '/path/to/file.txt'
})
```

#### `write_text_file`

写入文本文件。

```typescript
await invoke('write_text_file', {
  path: '/path/to/output.srt',
  content: '字幕内容...'
})
```

---

### scene 模块

#### `detect_scenes`

检测视频中的场景切换点。

```typescript
const scenes = await invoke<SceneChange[]>('detect_scenes', {
  path: '/path/to/video.mp4',
  threshold: 0.3
})
```

**参数：**

| 参数 | 类型 | 默认值 | 说明 |
|:---|:---|:---|:---|
| `path` | `string` | — | 视频路径 |
| `threshold` | `number` | `0.3` | 场景检测灵敏度（0.0~1.0）|

**返回值：** `SceneChange[]`

```typescript
interface SceneChange {
  index: number    // 帧序号
  time: number     // 时间戳（秒）
  type: 'cut' | 'fade' | 'dissolve'
}
```

---

### system 模块

#### `check_system_dependencies`

检查系统依赖（ffmpeg、ffprobe、tesseract）的安装状态。

```typescript
const deps = await invoke<SystemDeps>('check_system_dependencies')
```

**返回值：**

```typescript
interface SystemDeps {
  ffmpeg: { available: boolean; version?: string; path?: string }
  ffprobe: { available: boolean; version?: string; path?: string }
  tesseract: { available: boolean; version?: string; path?: string }
}
```

#### `get_tesseract_languages`

获取已安装的 Tesseract 语言包列表。

```typescript
const langs = await invoke<string[]>('get_tesseract_languages')
```

---

### export 模块

#### `export_subtitles`

将字幕导出为指定格式。

```typescript
const filePath = await invoke<string>('export_subtitles', {
  subtitles: [
    { index: 1, startTime: 1.0, endTime: 4.5, text: '字幕文本', confidence: 0.95 }
  ],
  format: 'srt',
  outputPath: '/path/to/output.srt'
})
```

**参数：**

| 参数 | 类型 | 说明 |
|:---|:---|:---|
| `subtitles` | `SubtitleItem[]` | 字幕条目数组 |
| `format` | `ExportFormat` | 导出格式（`srt`/`vtt`/`ass`/...）|
| `outputPath` | `string` | 输出文件路径 |

**支持格式：** `srt` `vtt` `ass` `ssa` `lrc` `sbv` `json` `csv` `txt`

---

## 错误处理

所有命令在失败时返回 `TauriError`。建议用 try-catch 包装：

```typescript
import { invoke } from '@tauri-apps/api/core'

async function safeExtractFrame(path: string, time: number) {
  try {
    return await invoke<string>('extract_frame_at_time', { path, timeSeconds: time })
  } catch (e) {
    console.error('帧提取失败:', e)
    return null
  }
}
```
