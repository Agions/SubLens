# 快速上手

## 环境要求 {#prerequisites}

| Requirement | Version | Notes |
|:---|:---|:---|
| Node.js | 18+ | Frontend build |
| Rust | 1.70+ | Tauri backend |
| pnpm | 8+ | Package manager |
| FFmpeg | Latest | Video frame extraction |
| Git | Any | Source clone |

## 安装 {#installation}

```bash
# Clone the repository
git clone https://github.com/Agions/SubLens.git
cd SubLens

# Install frontend dependencies
pnpm install

# Run in development mode (Rust backend auto-builds on first run)
pnpm tauri dev

# Build production package
pnpm tauri build
```

## OCR 引擎 {#ocr-engines}

SubLens 支持三种 OCR 引擎：

| Engine | Technology | Accuracy | Speed | Languages |
|:---|:---|:---:|:---:|:---:|
| **PaddleOCR** | PP-OCRv5 Deep Learning | ⭐⭐⭐ Best | Fast | 80+ |
| **EasyOCR** | PyTorch | ⭐⭐ Good | Medium | 80+ |
| **Tesseract.js** | LSTM + WASM | ⭐⭐ Good | Fastest | 100+ |

推荐使用 **PaddleOCR**（精度最高），或 **Tesseract.js**（无需安装 Python 环境）。

### GPU 加速（可选） {#gpu-acceleration}

NVIDIA GPU 可显著加速 PaddleOCR：

```bash
# NVIDIA CUDA
conda install cudatoolkit=11.8 -c nvidia
pip install paddlepaddle-gpu
```

切换到 PaddleOCR 引擎后，SubLens UI 会自动使用 GPU（需已安装 GPU 版 PaddleOCR）。

## 首次提取 {#first-extraction}

### 第一步 — 打开视频

点击工具栏 **Open**，或直接将视频文件拖入窗口。

支持格式：**MP4** · **MKV** · **AVI** · **MOV** · **WebM**

### 第二步 — 选择字幕区域（ROI）

选择一个预设或拖动定义字幕区域：

| Preset | 适用场景 |
|:---|:---|
| **Bottom** | 大多数硬字幕 |
| **Top** | 片头/片尾字幕 |
| **Left / Right** | 双语字幕 |
| **Center** | 对话叠加字幕 |
| **Custom** | 自由选择 |

### 第三步 — 配置 OCR

| Setting | 推荐 |
|:---|:---|
| **OCR Engine** | PaddleOCR（精度最高） |
| **Languages** | 选择字幕对应语言 |
| **Confidence threshold** | 70% — 根据效果调整 |
| **Multi-pass OCR** | 启用（复杂字幕效果更好） |
| **Text post-processing** | 启用（输出更干净） |
| **Subtitle merge** | 启用（80% 相似度去重） |

### 第四步 — 开始提取

点击 **Start Extraction**，进度显示在 **Progress** 标签页。

### 第五步 — 导出

点击字幕面板的 **Export**，选择导出格式：

| Format | Frame-mapped | Best for |
|:---|:---:|:---|
| **SRT** | No | 通用字幕播放器 |
| **WebVTT** | No | Web 视频 |
| **ASS** | No | 动漫字幕（高级样式） |
| **JSON** | Yes | 帧级精确编辑 |
| **CSV** | Yes | 电子表格分析 |
| **TXT** | No | 纯文本 |
