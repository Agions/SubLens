# 安装与运行

## 环境要求

| 依赖 | 版本 | 说明 |
|:---|:---|:---|
| Node.js | 18+ | 前端构建 |
| Rust | 1.70+ | Tauri 后端 |
| pnpm | 8+ | 包管理器 |
| FFmpeg | 最新 | 视频帧提取 |

## 安装

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

## 目录结构

```
SubLens/
├── src/                              # Vue 3 前端
│   ├── components/                   # Vue 组件
│   ├── composables/                  # 组合式函数（15 个）
│   ├── stores/                       # Pinia stores（3 个）
│   ├── core/                         # 核心业务逻辑
│   │   ├── Pipeline.ts              # 4 阶段 OCR 后处理
│   │   ├── SceneDetect.ts           # 场景检测
│   │   ├── Exporter.ts              # 12 格式导出
│   │   └── Calibrator.ts            # 置信度校准
│   ├── utils/                        # 工具函数
│   ├── themes/                       # OKLCH 主题
│   └── types/                        # 类型定义
├── src-tauri/src/                    # Rust 后端
│   └── commands/                     # 11 个活跃命令
│       ├── video.rs                  # FFmpeg 帧提取
│       ├── scene.rs                  # 场景检测
│       ├── export.rs                 # 格式写入
│       ├── file.rs                   # 文件对话框
│       └── system.rs                 # 系统诊断
└── scripts/
    └── scene_detect.py              # 场景检测脚本
```

## 首次提取

### 1. 打开视频

点击工具栏 **Open**，或直接将视频文件拖入窗口。

**支持格式：** MP4 · MKV · AVI · MOV · WebM · M4V · WMV · FLV · 3GP

### 2. 选择字幕区域（ROI）

选择一个预设或拖动定义字幕区域：

| 预设 | 适用场景 |
|:---|:---|
| **Bottom** | 大多数硬字幕 |
| **Top** | 片头/片尾字幕 |
| **Left / Right** | 双语字幕 |
| **Center** | 对话叠加字幕 |
| **Custom** | 自由选择 |

### 3. 配置 OCR

| 设置 | 推荐值 | 说明 |
|:---|:---|:---|
| **OCR 引擎** | EasyOCR | 字幕场景精度最优 |
| **语言** | 选择字幕对应语言 | 多语字幕可多选 |
| **置信度阈值** | 70% | 根据效果调整，越低越宽松 |
| **多轮 OCR** | 启用 | 复杂字幕效果更好 |
| **文本后处理** | 启用 | 输出更干净 |
| **字幕合并** | 启用（相似度 80%）| 自动去重 |

### 4. 开始提取

点击 **Start Extraction**，进度显示在 **Progress** 标签页。

### 5. 导出

点击字幕面板的 **Export**，选择导出格式。帧级精确编辑推荐 **JSON**，通用播放推荐 **SRT**。
