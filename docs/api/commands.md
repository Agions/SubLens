# Tauri 命令

SubLens 后端提供 11 个活跃 Tauri IPC 命令（Rust → 前端 Via `invoke`）。

## video {#video}

### get_video_metadata

获取视频元数据。

```typescript
const metadata = await invoke<VideoMetadata>('get_video_metadata', {
  path: '/path/to/video.mp4'
})
```

**参数：**

| 字段 | 类型 | 说明 |
|:---|:---|:---|
| `path` | `string` | 视频文件路径 |

**返回值：**

```typescript
interface VideoMetadata {
  fps: number
  width: number
  height: number
  duration: number
  codec: string
}
```

### extract_frame_at_time

提取指定时间的视频帧。

```typescript
const frameData = await invoke<number[]>('extract_frame_at_time', {
  path: '/path/to/video.mp4',
  timeSeconds: 12.5,
  format: 'rgb'
})
```

**参数：**

| 字段 | 类型 | 说明 |
|:---|:---|:---|
| `path` | `string` | 视频文件路径 |
| `timeSeconds` | `number` | 时间点（秒）|
| `format` | `string` | 像素格式（`rgb` 或 `rgba`）|

**返回值：** `number[]`（RGB/RGBA 像素数据）

---

## scene {#scene}

### detect_scenes

场景检测，返回场景切换点列表。

```typescript
const scenes = await invoke<SceneChange[]>('detect_scenes', {
  path: '/path/to/video.mp4',
  threshold: 0.3
})
```

**参数：**

| 字段 | 类型 | 说明 |
|:---|:---|:---|
| `path` | `string` | 视频文件路径 |
| `threshold` | `number` | 检测阈值（0.0–1.0），越小越敏感 |

**返回值：**

```typescript
interface SceneChange {
  startTime: number
  endTime: number
  frameIndex: number
}
```

---

## export {#export}

### export_subtitles

将字幕导出为指定格式。

```typescript
await invoke('export_subtitles', {
  subtitles: subtitleItems,
  format: 'srt',
  outputPath: '/path/to/output.srt',
  includeTimecodes: true
})
```

**参数：**

| 字段 | 类型 | 说明 |
|:---|:---|:---|
| `subtitles` | `SubtitleItem[]` | 字幕数据 |
| `format` | `string` | 格式名（`srt`/`vtt`/`ass`/`json`/...）|
| `outputPath` | `string` | 输出文件路径 |
| `includeTimecodes` | `boolean` | 是否包含时间码 |

---

## file {#file}

### open_file_dialog

打开文件选择对话框。

```typescript
const filePath = await invoke<string | null>('open_file_dialog', {
  filters: [{ name: 'Videos', extensions: ['mp4', 'mkv', 'avi'] }]
})
```

### save_file_dialog

打开文件保存对话框。

```typescript
const savePath = await invoke<string | null>('save_file_dialog', {
  defaultPath: 'subtitles.srt',
  filters: [{ name: 'SRT', extensions: ['srt'] }]
})
```

### read_text_file

读取文本文件内容。

```typescript
const content = await invoke<string>('read_text_file', {
  path: '/path/to/file.srt'
})
```

### write_text_file

写入文本文件。

```typescript
await invoke('write_text_file', {
  path: '/path/to/output.srt',
  content: 'file content...'
})
```

### get_file_info

获取文件信息。

```typescript
const info = await invoke<FileInfo>('get_file_info', {
  path: '/path/to/video.mp4'
})
```

**返回值：**

```typescript
interface FileInfo {
  size: number
  modified: string
  created: string
}
```

---

## system {#system}

### check_system_dependencies

检查系统依赖是否安装。

```typescript
const deps = await invoke<SystemDeps>('check_system_dependencies')
```

**返回值：**

```typescript
interface SystemDeps {
  ffmpeg: { available: boolean; version?: string }
  ffprobe: { available: boolean; version?: string }
  python: { available: boolean; version?: string }
}
```

### get_tesseract_languages

获取 Tesseract 支持的语言列表。

```typescript
const languages = await invoke<string[]>('get_tesseract_languages')
```
