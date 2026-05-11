# OCR 引擎

SubLens 支持三种 OCR 引擎，可根据场景自由切换。

## 引擎对比

| 引擎 | 技术 | 推荐场景 | GPU 支持 |
|:---|:---|:---|:---|
| **EasyOCR** | PyTorch | 自然场景字幕，首选 | ✅ |
| **PaddleOCR** | PP-OCRv5 | GPU 用户追求极限精度 | ✅ |
| **Tesseract.js** | LSTM + WASM | 无 Python 环境，快速上手 | ❌ |

## EasyOCR（推荐）

基于 PyTorch 的深度学习 OCR，字幕场景精度优秀。

```bash
# 自动通过 pnpm tauri dev 安装
# 无需额外配置
```

## PaddleOCR

百度飞桨 OCR，GPU 用户极限精度首选。

```bash
# NVIDIA CUDA
conda install cudatoolkit=11.8 -c nvidia
pip install paddlepaddle-gpu
```

## Tesseract.js

纯 WebAssembly 实现，无需 Python 环境，适合快速测试。

- **优点**：零配置，跨平台
- **缺点**：精度不如 EasyOCR 和 PaddleOCR

## 引擎选择建议

| 场景 | 推荐引擎 |
|------|---------|
| 一般硬字幕 | EasyOCR |
| 动漫/低分辨率 | PaddleOCR |
| 无 Python 环境 | Tesseract.js |
| 追求极限精度 | PaddleOCR + GPU |
