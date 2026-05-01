# 快速上手

## 环境要求 {#prerequisites}

| 依赖 | 版本 | 说明 |
|:---|:---|:---|
| Node.js | 18+ | 前端构建 |
| Rust | 1.70+ | Tauri 后端 |
| pnpm | 8+ | 包管理器 |
| FFmpeg | 最新 | 视频帧提取 |

## 安装 {#installation}

```bash
# 克隆仓库
git clone https://github.com/Agions/SubLens.git
cd SubLens

# 安装前端依赖
pnpm install

# 开发模式运行（Rust 后端首次自动编译）
pnpm tauri dev

# 构建生产包
pnpm tauri build
```

## OCR 引擎 {#ocr-engines}

SubLens 支持三种 OCR 引擎，可根据场景自由切换：

| 引擎 | 技术 | 推荐场景 |
|:---|:---|:---|
| **EasyOCR** | PyTorch | 自然场景字幕，推荐首选 |
| **PaddleOCR** | PP-OCRv5 深度学习 | GPU 用户追求极限精度 |
| **Tesseract.js** | LSTM + WASM | 无 Python 环境，快速上手 |

### GPU 加速（可选） {#gpu-acceleration}

NVIDIA GPU 可显著加速 PaddleOCR：

```bash
# NVIDIA CUDA
conda install cudatoolkit=11.8 -c nvidia
pip install paddlepaddle-gpu
```

## 首次提取 {#first-extraction}

### 第一步 — 打开视频

点击工具栏 **Open**，或直接将视频文件拖入窗口。

支持格式：**MP4** · **MKV** · **AVI** · **MOV** · **WebM** · **M4V** · **WMV** · **FLV** · **3GP**

### 第二步 — 选择字幕区域（ROI）

选择一个预设或拖动定义字幕区域：

| 预设 | 适用场景 |
|:---|:---|
| **Bottom** | 大多数硬字幕 |
| **Top** | 片头/片尾字幕 |
| **Left / Right** | 双语字幕 |
| **Center** | 对话叠加字幕 |
| **Custom** | 自由选择 |

### 第三步 — 配置 OCR

| 设置 | 推荐值 | 说明 |
|:---|:---|:---|
| **OCR 引擎** | EasyOCR 或 PaddleOCR | 字幕场景精度最优 |
| **语言** | 选择字幕对应语言 | 多语字幕可多选 |
| **置信度阈值** | 70% | 根据效果调整，越低越宽松 |
| **多轮 OCR** | 启用 | 复杂字幕效果更好 |
| **文本后处理** | 启用 | 输出更干净 |
| **字幕合并** | 启用（相似度 80%）| 自动去重 |

### 第四步 — 开始提取

点击 **Start Extraction**，进度显示在 **Progress** 标签页。

### 第五步 — 导出

点击字幕面板的 **Export**，选择导出格式。帧级精确编辑推荐 **JSON**，通用播放推荐 **SRT**。
