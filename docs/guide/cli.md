# CLI 参考

## 安装

```bash
# 方式一：npx（无需安装）
npx sublens-cli extract video.mp4 --output ./subs

# 方式二：本地构建
cd cli && pnpm install && pnpm build
node dist/extract.js

# 方式三：Cargo 安装（完整 Rust 后端）
cargo install --path src-tauri
sublens-cli extract video.mp4 --output ./subs
```

## 全局参数

| 参数 | 短 | 类型 | 默认值 | 说明 |
|:---|:---:|:---:|:---:|:---|
| `--help` | `-h` | flag | — | 显示帮助 |
| `--version` | `-v` | flag | — | 显示版本 |
| `--verbose` | — | flag | false | 详细输出 |
| `--config` | `-c` | path | — | 自定义配置文件 |

## extract — 提取字幕

```bash
sublens-cli extract <video> [options]
```

**位置参数**

| 参数 | 说明 |
|:---|:---|
| `<video>` | 输入视频文件路径 |

**选项**

| 选项 | 短 | 类型 | 默认值 | 说明 |
|:---|:---:|:---:|:---:|:---|
| `--output` | `-o` | path | `./subs` | 输出目录 |
| `--format` | `-f` | string | `srt` | 逗号分隔的格式列表 |
| `--roi` | — | string | `bottom` | ROI 预设或坐标 `x,y,w,h`（百分比）|
| `--ocr` | — | string | `tesseract` | 引擎：`paddle`、`easyocr`、`tesseract` |
| `--lang` | `-l` | string | `eng` | 语言，如 `ch,en`、`ja`、`kor` |
| `--confidence` | — | number | `70` | 最小置信度 0–100 |
| `--frame-interval` | — | number | `1` | 每隔 N 帧处理一次 |
| `--scene-threshold` | — | number | `0.3` | 场景变化灵敏度 |
| `--no-postprocess` | — | flag | false | 跳过文本后处理 |
| `--no-merge` | — | flag | false | 跳过字幕合并 |

**支持的格式：** `srt`、`vtt`、`ass`、`ssa`、`json`、`txt`、`lrc`、`sbv`、`csv`

**示例**

```bash
# 基本提取（输出 SRT）
sublens-cli extract video.mp4 --output ./subs

# 多格式输出
sublens-cli extract video.mp4 --format srt,vtt,json --output ./subs

# 中文+英文，PaddleOCR 引擎
sublens-cli extract video.mp4 --ocr paddle --lang ch,en --roi bottom

# 自定义 ROI 坐标（百分比）
sublens-cli extract video.mp4 --roi 0,85,100,15

# 高置信度阈值
sublens-cli extract video.mp4 --confidence 85

# 每 2 帧处理一次（更快，精度略低）
sublens-cli extract video.mp4 --frame-interval 2
```

**示例输出**

```
SubLens CLI v3.2.0 — Video Info
================================
File: video.mp4
Resolution: 1920x1080
Duration: 00:05:23
FPS: 30.00
Total frames: 9688

OCR Engine: tesseract (langs: eng+chi_sim)
ROI: bottom (0, 85, 100, 15)%
Frame interval: 1

Processing: 29% [2812/9688 frames]  ETA: 42s

Done. 47 subtitles extracted.
================================
Output: ./subs/
  video.srt  (47 entries)
  video.json (47 entries + frame mapping)
```

## preview — 预览帧

```bash
sublens-cli preview <video> [options]
```

| 选项 | 短 | 类型 | 默认值 | 说明 |
|:---|:---:|:---:|:---:|:---|
| `--frame` | `-f` | number | `0` | 要提取的帧号 |
| `--roi` | — | string | — | 在输出图像上绘制 ROI 矩形 |
| `--output` | `-o` | path | stdout | 保存预览图像 |

```bash
sublens-cli preview video.mp4 --frame 1500 --roi bottom
```

## info — 视频信息

```bash
sublens-cli info <video>
```

```
video.mp4
========================
Resolution: 1920x1080
Duration: 00:05:23.45
FPS: 30.00
Total frames: 9688
Audio: AAC 48kHz stereo
Codec: H.264 / AVC
```

## 退出码

| 代码 | 含义 |
|:---:|:---|
| `0` | 成功 |
| `1` | 一般错误 |
| `2` | 视频文件未找到 |
| `3` | OCR 引擎初始化失败 |
| `4` | 未找到字幕 |
| `5` | 输出目录不可写 |
