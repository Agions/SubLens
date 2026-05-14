---
title: OCR 引擎详解
---

# OCR 引擎详解

## 引擎概览

| 引擎 | 精度 | 速度 | 语言 | 硬件需求 | 推荐场景 |
|:---|:---:|:---:|:---:|:---:|:---:|
| **PaddleOCR** | ★★★ | 快（GPU） | 80+ | GPU 2GB+ | 高精度生产使用 |
| **EasyOCR** | ★★★ | 中 | 80+ | GPU 4GB+ | 多语言混合字幕 |
| **Tesseract.js** | ★★ | 快 | 100+ | 仅 CPU | 快速预览、零配置 |

## Tesseract.js

基于 Tesseract 5.0 的 WebAssembly 移植版，OCR 在浏览器中执行，无需安装任何本地依赖。

**优点：**
- 零配置，即装即用
- 离线可用（WASM 打包在应用中）
- CPU 运行，无 GPU 环境要求

**缺点：**
- CPU 密集，大视频处理慢
- 对倾斜/艺术字体识别效果一般

**适用场景：** 快速测试、小段视频、服务器环境（无 GPU）

```typescript
import { createWorker } from 'tesseract.js'

const worker = await createWorker('eng')
const { data: { text } } = await worker.recognize(imageData)
await worker.terminate()
```

## EasyOCR

基于 PyTorch 的深度学习 OCR，支持 80+ 语言，可搭配 GPU 加速。

**优点：**
- 深度学习模型，识别精度高
- 支持 GPU 加速（CUDA）
- 对艺术字体、倾斜字幕效果好

**缺点：**
- 需要本地安装 Python + PyTorch
- GPU 显存需求较高（~4GB）
- 首次启动模型下载耗时

**适用场景：** 高精度需求的生产提取、多语言混合字幕

**安装：**

```bash
# Python 环境
pip install easyocr
```

## PaddleOCR

百度开源的 PP-OCRv4 深度学习 OCR，精度与速度兼顾。

**优点：**
- PP-OCRv4 最新模型，精度优秀
- GPU 加速效果好（2GB+ 显存）
- 中文识别效果特别好

**缺点：**
- 需要本地 Python 环境
- 配置相对复杂

**适用场景：** 中文视频字幕提取、高精度商业应用

**安装：**
```bash
pip install paddlepaddle-gpu  # GPU 版本
pip install paddleocr
```

详见 [PaddleOCR 安装指南](https://github.com/Agions/SubLens/tree/main/docs/guide/ocr-engines)。

## 引擎选择建议

```
初次使用 → Tesseract.js（零配置）
中文视频 → PaddleOCR（中文优化）
多语言混合 → EasyOCR（语言支持最广）
有 GPU 算力 → PaddleOCR / EasyOCR（速度更快）
```

## 置信度与质量信号

每条识别结果附带质量信号（Quality Signals），用于后处理校准：

| 信号 | 说明 | 降权幅度 |
|:---|:---|:---:|
| `mixed_language` | 混语种文本（如中日韩混排）| -0.10 |
| `ultra_short` | 少于 3 个字符 | -0.15 |
| `repeated_chars` | 连续重复字符 | -0.20 |
| `bracket_mismatch` | 括号/引号不匹配（中文）| -0.05 |
| `uppercase_ratio` | 拉丁字母大写占比过高 | -0.05 |

## 多轮 OCR

开启「多轮 OCR」后，同一帧会识别多次，系统取所有结果中置信度最高的文本。

- **轮数设置**：1~3 轮（默认 1）
- **选择策略**：`max(confidence)` 或 `voting`（多数投票）
- **性能影响**：轮数 × 耗时

## 引擎性能对比数据

> 测试条件：1080p 视频，底部 ROI，GPU 为 RTX 3060

| 引擎 | 帧处理速度 | 准确率（测试集）|
|:---|:---|:---|
| Tesseract.js | ~8 fps (CPU) | 91.2% |
| EasyOCR | ~45 fps (GPU) | 96.8% |
| PaddleOCR | ~62 fps (GPU) | 97.5% |
