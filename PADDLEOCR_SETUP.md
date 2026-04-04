# PaddleOCR 环境配置指南

## 前提要求

- Python 3.8+
- pip

## 安装步骤

### 1. 安装 PaddlePaddle (CPU 版本)

```bash
pip install paddlepaddle
```

### 2. 安装 PaddleOCR

```bash
pip install paddleocr
```

### 3. 验证安装

在项目目录下运行：

```bash
python src-tauri/scripts/paddle_ocr.py --check
```

预期输出：
```json
{"available": true, "paddle_version": "...", "ocr_version": "...", "message": "PaddleOCR is ready"}
```

### 4. 测试 OCR

```bash
# 用任意图片测试
python src-tauri/scripts/paddle_ocr.py --image /path/to/test.png --lang ch --gpu false
```

## 支持的语言

| Code | Language |
|------|----------|
| ch | 中文（简体）|
| en | 英语 |
| ja | 日语 |
| ko | 韩语 |
| fr | 法语 |
| de | 德语 |
| es | 西班牙语 |
| pt | 葡萄牙语 |
| it | 意大利语 |
| ru | 俄语 |
| ar | 阿拉伯语 |

## GPU 加速（可选）

如果你有 NVIDIA GPU：

```bash
pip install paddlepaddle-gpu
```

然后在 VisionSub UI 中切换到 PaddleOCR 引擎即可自动使用 GPU。

## 常见问题

**Q: `paddle_ocr.py --check` 返回 available=false**
- 确认 `python3 --version` 能运行
- 确认 `pip show paddlepaddle` 和 `pip show paddleocr` 有输出
- 如果在虚拟环境中，确保在同一个环境运行

**Q: 启动慢**
- PaddleOCR 首次运行会下载模型（约 150MB）
- 后续运行会缓存模型到 `~/.paddleocr/`
