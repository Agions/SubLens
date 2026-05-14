# SubLens 架构文档

## 1. 系统概览

SubLens 是一款基于 Tauri 2.x 的桌面字幕提取工具，前端 Vue 3 + TypeScript，后端 Rust + Tokio。核心设计原则：**前端承担计算密集型 OCR，后端专注系统级 I/O**。

### 1.1 数据流向

```
Video File
    │
    ├─[Rust: video.rs]─► ffprobe / ffmpeg ─► Base64 PNG frame
    │
    ├─[Rust: scene.rs]─► scene_detect.py ─► SceneChange[]
    │
    └─[Vue WASM: EasyOCR/Tesseract.js]──► RawSubtitle[]
          │
          ├─[TS: Pipeline.ts Stage 0-4]──► CleanSubtitle[]
          ├─[TS: Calibrator.ts]──────────► CalibratedSubtitle[]
          └─[Rust: export.rs]────────────► SRT/VTT/ASS/JSON/CSV…
```

### 1.2 前端 / 后端职责划分

| 职责 | 位置 | 说明 |
|:---|:---|:---|
| OCR 识别 | 前端 WASM | EasyOCR（PyTorch）、Tesseract.js（WASM）、PaddleOCR（Native）|
| 字幕后处理 | 前端 TS | Pipeline.ts、Calibrator.ts，纯函数无副作用 |
| 帧提取 | 后端 Rust | `extract_frame_at_time`，返回 Base64 PNG |
| 元数据读取 | 后端 Rust | `get_video_metadata`，ffprobe → ffmpeg → 文件估算三层降级 |
| 场景检测（前端）| 前端 TS | `SceneDetect.ts`，直方图 + 卡方，纯 JS |
| 场景检测（后端）| 后端 Rust | `scene.rs`，调用 `scene_detect.py`（scenedetect 库）|
| 字幕导出 | 后端 Rust | `export.rs`，12 格式，支持异步写入 |
| 系统诊断 | 后端 Rust | `system.rs`，ffmpeg / ffprobe / tesseract 版本检测 |

---

## 2. 前端架构（Vue 3 + TypeScript）

### 2.1 目录结构

```
src/
├── components/          # Vue SFC 组件（展示层）
│   ├── common/          # Button、Modal、Tooltip
│   ├── layout/          # ToolBar、SidePanel、VideoPreview
│   │   └── tabs/        # Files / Progress / ROI / OCR / Export / Settings
│   ├── video/           # ROISelector、Timeline
│   └── subtitle/        # SubtitleList、ExportDialog
├── composables/         # 组合式函数（逻辑层）
│   ├── useSubtitleList.ts
│   ├── useVideoPlayer.ts
│   ├── useOCREngine.ts
│   ├── useExtractor.ts
│   └── useBatchProcessor.ts
├── stores/              # Pinia 状态管理（数据层）
│   ├── subtitle.ts
│   ├── project.ts
│   └── settings.ts
└── core/               # 纯业务逻辑（可 Tree-shake，可独立测试）
    ├── Pipeline.ts
    ├── Exporter.ts
    ├── SceneDetect.ts
    ├── Calibrator.ts
    └── index.ts
```

### 2.2 核心模块

#### Pipeline.ts — OCR 后处理管道

五阶段纯函数管道，设计目标：**零依赖、独立测试、可配置**。

```
RawSubtitle[]
  │
  ▼ Stage 0: normalize
  │  · CRLF → LF
  │  · trim 每行首尾空白
  │  · 压缩连续换行
  │
  ▼ Stage 1: filterJitter
  │  · 短时间 + 低置信度 → 视为噪声
  │  · 三连相同 → 合并；相邻高相似 → 吸收
  │
  ▼ Stage 2: mergeSplit
  │  · 场景跳跃导致字幕分裂
  │  · gap ≤ 1.5s + 相似度 ≥ 0.85 → 合并
  │
  ▼ Stage 3: mergeSimilar
  │  · 时间接近（gap ≤ 0.5s）+ 相似度 ≥ 0.80 → 合并
  │
  ▼ Stage 4: computeEndTime
     · 根据下一条字幕的 startTime 精确截断 endTime
     · 最后一条保留原始 endTime

CleanSubtitle[]
```

**性能优化**：
- Levenshtein 距离结果三级缓存（`SimilarityCache` 实例级 → `textSimilarity` 函数级 → LRU trim）
- 每阶段最多一次 `O(n log n)` 排序

#### Calibrator.ts — 置信度校准

多信号加权模型，识别 OCR 误识模式：

```
信号类型：
  惩罚 (-weight)          奖励 (+weight)
  ──────────────          ─────────────
  混语脚本                字符多样性
  短文本 < 3字            句子完整结尾
  重复字符                合理字幕长度
  孤立 CJK 字符
  引号不平衡
  大写误识
  尾随逗号

→ 输出: calibrated_confidence ∈ [0.0, 1.0]
```

#### SceneDetect.ts — 前端场景检测

纯 TypeScript 实现，不依赖 Python：

- **算法**：RGB 直方图（48 计数器）+ 卡方距离（χ²）
- **复杂度**：O(n) 时间，48 计数器内存
- **适用**：轻量级预览，快速跳帧定位
- **鲁棒性**：对光照渐变有较好容忍度

---

## 3. 后端架构（Rust + Tauri）

### 3.1 命令模块一览

```
commands/
├── mod.rs           # 模块声明 + 公开导出
├── types.rs         # ROI、SceneChange、SubtitleItem、ExportFormat 等共享类型
├── utils.rs         # 工具函数（TempFileGuard、find_script、run_command_with_timeout）
├── video.rs         # get_video_metadata、extract_frame_at_time
├── ffmpeg.rs        # FFmpeg/ffprobe 输出解析（内部模块，供 video/scene 使用）
├── export.rs        # export_subtitles 入口
├── export_fmt.rs   # 12 格式具体实现（SRT/VTT/ASS/SSA/JSON/CSV/TXT/LRC/SBV/MD/STL/TTML）
├── timestamp.rs     # 时间戳格式化（SRT/VTT/SBV 等使用逗号分隔毫秒的格式）
├── scene.rs         # detect_scenes（调用 scene_detect.py）
├── file.rs          # 对话框、文件读写
├── system.rs        # check_system_dependencies、get_tesseract_languages
└── ocr.rs          # 占位文件（OCR 已移至前端 WASM，无实际命令）
```

### 3.2 video.rs — 元数据与帧提取

#### 元数据获取（三层降级）

```
get_video_metadata(path)
  │
  ├─[1] ffprobe -print_format json -show_format -show_streams
  │    ✓ 精确 duration / fps / resolution / codec
  │    ✗ ffprobe 不可用
  │
  ├─[2] ffmpeg -i <path> -f null -
  │    ✓ 从 stderr 解析 duration / stream info
  │    ✗ ffmpeg 不可用
  │
  └─[3] 文件大小 + 扩展名估算
       · bitrate 经验值（mp4=2Mbps, mkv=3Mbps…）
       · 返回默认值 1920×1080 @ 30fps
       · 打印警告，建议安装 ffmpeg
```

#### 帧提取流程

```
extract_frame_at_time(path, timestamp_secs, crop_filter?)
  │
  ├─ canonicalize 路径（防止路径遍历）
  ├─ 生成临时文件: sublens_frame_{timestamp_ms}_{uuid}.png
  ├─ TempFileGuard 注册析构（函数返回时自动清理）
  │
  └─ ffmpeg -ss {ts} -i {path} -vframes 1 [-vf {crop}] {temp}.png
       │
       └─► Base64 PNG data URI
```

**安全措施**：
- `-nostdin`：禁用交互模式（避免 CI 无终端死锁）
- `-y`：自动覆盖输出文件（避免 prompt 阻塞）
- 临时文件位于 `std::env::temp_dir()`，仅 temp 目录内清理

### 3.3 export.rs — 十二格式导出

#### 格式分类

| 家族 | 格式 | 时间戳函数 |
|:---|:---|:---|
| Timed text | SRT, VTT, SBV | `export_timed_entries` + `format_timestamp_{srt/vtt/sbv}` |
| Advanced subtitle | ASS, SSA | `export_ass_family` + `escape_ass_text` |
| Lyric sync | LRC | 专用 `export_as_lrc` |
| Data | JSON, CSV | 结构化序列化 |
| Plain text | TXT | 行拼接 |

#### 核心设计

- **`export_timed_entries<F>`**：泛型高阶函数，注入时间戳格式化逻辑，实现 SRT / VTT / SBV 代码复用
- **`export_ass_family`**：ASS / SSA 差异仅在 header template 和 dialogue prefix，合并实现
- **RFC 4180 CSV**：嵌入引号转义、字段引用逻辑
- **ASS 逃逸**：`\` → `\\`, `{` → `\{`, `}` → `\}`, `,` → `\,`, `\N` = 硬换行

### 3.4 utils.rs — 工具函数

| 函数 | 类型 | 说明 |
|:---|:---|:---|
| `TempFileGuard` | RAII struct | 析构时自动删除临时文件 |
| `uuid_v4()` | free function | 生成随机 UUID 字符串 |
| `find_python_binary()` | async | 从 PATH 查找 python3（缓存结果）|
| `find_script(name)` | free function | 查找 `scene_detect.py`（bundled dev 三路径探测，缓存结果）|
| `run_command_with_timeout()` | async | 带超时的命令执行 |
| `parse_fps_from_fraction()` | free function | 解析 `"30000/1001"` → `29.97` |
| `parse_stream_from_ffmpeg_output()` | free function | 从 ffmpeg stderr 提取 W/H/FPS |
| `parse_duration_from_ffmpeg_output()` | free function | 从 ffmpeg stderr 提取 duration |

**缓存策略**：
- `CACHED_PYTHON`：`LazyLock<Result<PathBuf>>` — 进程级缓存
- `SCRIPT_CACHE`：`LazyLock<Mutex<HashMap>>` — 脚本路径缓存

### 3.5 scene.rs — 场景检测

```
detect_scenes(video_path, config)
  │
  ├─ get_video_metadata(video_path)  → fps
  │
  └─ detect_scenes_scenedetect(video_path, threshold, min_scene_len)
       │
       ├─ find_python_binary()
       ├─ find_script("scene_detect.py")
       └─ python scene_detect.py {path} {threshold} {min_scene_len}
            │
            └─► Vec<f64> (timestamps)
                 │
                 └─► Vec<SceneChange> { frame_index, timestamp, similarity }
```

依赖 `scenedetect` Python 库，由前端用户安装。

---

## 4. 命名规范

### Rust 模块命名（snake_case）

```
commands/video.rs      ✓ 命令名词（video, export, scene）
commands/utils.rs      ✓ 工具类
commands/ocr.rs ✓ 占位说明
```

### Rust 标识符

| 类型 | 规范 | 示例 |
|:---|:---|:---|
| 模块 / 文件 | snake_case | `video_processor` |
| 公开函数 | snake_case | `get_video_metadata` |
| 公开结构体 | PascalCase | `VideoMetadata` |
| 公开枚举 | PascalCase | `ExportFormat` |
| 私有函数 | snake_case | `get_video_metadata_ffprobe` |
| 宏 | SCREAMING_SNAKE_CASE | `generate_handler!` |

### TypeScript / Vue

| 类型 | 规范 | 示例 |
|:---|:---|:---|
| 组件 | PascalCase | `SubtitleList.vue` |
| Composables | camelCase, `use` 前缀 | `useSubtitleList.ts` |
| 工具函数 | camelCase | `textSimilarity` |
| 类型 / 接口 | PascalCase | `PipelineOptions` |
| 常量 | SCREAMING_SNAKE_CASE | `DEFAULT_PIPELINE_OPTIONS` |

---

## 5. 前端 / 后端接口

### 5.1 Tauri 命令列表

| 命令 | 模块 | 输入 | 输出 |
|:---|:---|:---|:---|
| `get_video_metadata` | video | `{ path: string }` | `VideoMetadata` |
| `extract_frame_at_time` | video | `{ path, timestamp_secs }` | `string` (Base64 PNG) |
| `export_subtitles` | export | `{ subtitles, format, output_path }` | `string` (写出的路径) |
| `detect_scenes` | scene | `{ video_path, config }` | `SceneChange[]` |
| `check_system_dependencies` | system | — | `SystemCheckResult` |
| `get_tesseract_languages` | system | — | `string[]` |
| `open_file_dialog` | file | — | `string \| null` |
| `save_file_dialog` | file | — | `string \| null` |
| `read_text_file` | file | `{ path }` | `string` |
| `write_text_file` | file | `{ path, content }` | `void` |
| `get_file_info` | file | `{ path }` | `FileInfo` |

### 5.2 共享类型（TypeScript ↔ Rust）

```typescript
// src-tauri/src/commands/types.rs  →  TypeScript
interface ROI {
  x: number; y: number; width: number; height: number;
  position: 'bottom' | 'top' | 'left' | 'right' | 'center' | 'custom';
}

interface VideoMetadata {
  path: string;
  width: number; height: number;
  duration: number; fps: number; total_frames: number;
  codec: string;
}

enum ExportFormat {
  SRT = 'srt', WebVTT = 'vtt', ASS = 'ass', SSA = 'ssa',
  JSON = 'json', TXT = 'txt', LRC = 'lrc', SBV = 'sbv', CSV = 'csv'
}
```

---

## 6. 错误处理策略

### Rust 端

- 所有 `Result<T, String>` 返回 `String` 而非 `Box<dyn Error>`：便于 Tauri IPC 序列化
- 错误信息带上下文：`"ffprobe exited with error: " + stderr`
- 降级设计：metadata 三层降级（ffprobe → ffmpeg → 文件估算）

### 前端端

- OCR 引擎抽象接口 `OCREngine`：`init() → recognize(frame, roi) → Result<TextBlock[]>`
- 引擎失败切换：Tesseract.js（最快）→ EasyOCR（更高精度）
- 提取流程：`useExtractor.ts` 协调多引擎 + Pipeline 后处理，单步失败不中断全流程

---

## 7. 性能考量

| 优化点 | 策略 |
|:---|:---|
| 帧提取 | 后端 Rust + `tokio::process::Command`，30s 超时保护 |
| OCR 并行 | 批处理模式（`useBatchProcessor.ts`），多帧并行送入 WASM |
| 相似度计算 | 三级缓存（Pipeline 实例 / textSimilarity 函数 / 模块级 memo）|
| 大字幕列表 | Vue 虚拟滚动（1000+ 条不卡 UI）|
| 场景检测 | 前端轻量直方图（JS）优先，后端精确检测按需调用 |
| 脚本查找 | LazyLock 缓存，仅首次查找 |
