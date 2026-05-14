---
title: SubLens 开发者指南
---

# SubLens 开发者指南

## 1. 环境搭建

### 1.1 前置依赖

| 依赖 | 版本 | 安装 |
|:---|:---|:---|
| Node.js | 18+ | `nvm install 18` |
| pnpm | 8+ | `npm i -g pnpm` |
| Rust | 1.70+ | `rustup install stable` |
| FFmpeg | 最新 | `apt install ffmpeg` 或 `brew install ffmpeg` |
| Tesseract | 最新 | `apt install tesseract-ocr` 或 `brew install tesseract` |

### 1.2 初始化项目

```bash
git clone https://github.com/Agions/SubLens.git
cd SubLens
pnpm install
```

### 1.3 开发命令

```bash
# 前端热重载开发（Rust 后端自动编译）
pnpm tauri dev

# 仅前端开发（mock Tauri 调用）
pnpm vite

# 生产构建
pnpm tauri build

# 前端类型检查
pnpm vue-tsc --noEmit

# ESLint
pnpm lint

# 测试
pnpm test
```

### 1.4 Rust 工具链

```bash
# 查看 Rust 版本
rustc --version   # 需要 1.70+

# 检查 Tauri CLI
cargo tauri --version

# Rustfmt 格式化
cargo fmt

# Rust Lint
cargo clippy -- -D warnings
```

---

## 2. 项目结构速查

```
SubLens/
├── src/                        # Vue 前端
│   ├── components/            # UI 组件
│   ├── composables/           # 组合式函数
│   ├── stores/                # Pinia store
│   └── core/                  # 纯业务逻辑（可独立测试）
│
├── src-tauri/                  # Rust 后端
│   ├── src/
│   │   ├── main.rs            # 入口，调用 lib::run()
│   │   ├── lib.rs             # Tauri Builder 配置 + 命令注册
│   │   └── commands/          # IPC 命令
│   │       ├── mod.rs
│   │       ├── video.rs       # get_video_metadata, extract_frame_at_time
│   │       ├── export.rs      # 9 格式字幕导出
│   │       ├── scene.rs       # 场景检测
│   │       ├── file.rs        # 文件对话框
│   │       ├── system.rs      # 系统依赖检查
│   │       ├── utils.rs       # 工具函数
│   │       └── types.rs       # 共享类型
│   └── tauri.conf.json        # Tauri 配置
│
└── docs/                       # Docsify 在线文档
    ├── README.md               # 封面（Docsify 自动读取）
    ├── _sidebar.md             # 侧边导航
    ├── index.html              # Docsify 入口
    ├── architecture.md
    ├── developer-guide.md
    └── changelog.md
```

---

## 3. 添加新命令（Rust 后端）

### 3.1 创建模块

在 `src-tauri/src/commands/` 下新建文件，例如 `hello.rs`：

```rust
//! Hello world command module.

#[tauri::command]
pub async fn greet(name: String) -> String {
    format!("Hello, {}!", name)
}
```

### 3.2 注册模块

在 `commands/mod.rs` 添加：

```rust
pub mod hello;
```

### 3.3 暴露命令（lib.rs）

在 `src-tauri/src/lib.rs` 添加公开导出：

```rust
pub use commands::hello::greet;
```

并在 `generate_handler!` 中注册：

```rust
invoke_handler(tauri::generate_handler![
    // ... existing commands ...
    commands::hello::greet,
])
```

### 3.4 前端调用

```typescript
import { invoke } from '@tauri-apps/api/core'
const greeting = await invoke<string>('greet', { name: 'SubLens' })
```

---

## 4. 前端核心模块开发

### 4.1 Pipeline 自定义配置

```typescript
import { Pipeline, DEFAULT_PIPELINE_OPTIONS } from '@/core/Pipeline'

const pipeline = new Pipeline({
  jitterMinDuration: 0.5,       // 调高：过滤更多噪声
  splitSimilarityThreshold: 0.9, // 调高：更少合并
})

const cleaned = pipeline.process(rawSubtitles)

// 单独运行某阶段（调试）
const afterDenoise = pipeline.processStage(rawSubtitles, 1)
```

### 4.2 添加新导出格式

1. 在 `export.rs` 添加格式变体：

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ExportFormat {
    // ... existing ...
    #[serde(rename = "md")]
    MD,  // 新增 Markdown 格式
}

fn export_as_md(subtitles: &[SubtitleItem]) -> String {
    subtitles.iter()
        .map(|sub| format!("[{}] {}\n", sub.start_time, sub.text))
        .collect::<Vec<_>>()
        .join("\n")
}
```

2. 在 `export_subtitles` 的 `match` 分支添加：

```rust
ExportFormat::MD => export_as_md(&subtitles),
```

3. 前端同步更新 `ExportFormat` 类型定义。

---

## 5. 调试

### 5.1 Rust 日志

```bash
# 启用 tracing 日志（开发模式）
RUST_LOG=debug pnpm tauri dev
```

### 5.2 前端断点

```bash
# Vite 开发服务器（端口 5173）
pnpm vite

# Chrome DevTools: F12 → Sources → 找到对应 .ts 文件打断点
```

### 5.3 Tauri IPC 调试

```typescript
// 在前端添加日志包装
import { invoke } from '@tauri-apps/api/core'

async function invokeDebug<T>(cmd: string, args: Record<string, unknown>) {
  console.log(`[Tauri] invoking ${cmd}`, args)
  const result = await invoke<T>(cmd, args)
  console.log(`[Tauri] ${cmd} =>`, result)
  return result
}
```

### 5.4 FFmpeg 调试

```bash
# 手动测试帧提取
ffmpeg -ss 10.5 -i input.mp4 -vframes 1 output.png

# 检查视频元数据
ffprobe -v quiet -print_format json -show_format -show_streams input.mp4
```

---

## 6. 测试

### 6.1 前端单元测试

```bash
pnpm test               # 运行所有测试
pnpm test -- --watch   # Watch 模式
pnpm test src/core/Pipeline.ts  # 测试特定文件
```

### 6.2 Rust 测试

```bash
cargo test --manifest-path src-tauri/Cargo.toml
```

### 6.3 集成测试（字幕导出）

```bash
# 手动验证导出文件
cargo run --manifest-path src-tauri/Cargo.toml --example export_test
```

---

## 7. 构建与发布

### 7.1 生产构建

```bash
pnpm tauri build
```

产物位于 `src-tauri/target/release/bundle/`：
- macOS: `.app` / `.dmg`
- Linux: `.AppImage` / `.deb`
- Windows: `.exe` / `.msi`

## 9. 版本管理

版本在 `package.json` 和 `src-tauri/Cargo.toml` 中必须保持同步：

```bash
# package.json
"version": "3.6.0"

# src-tauri/Cargo.toml
version = "3.6.0"
```

发布流程：更新版本 → git tag → GitHub Actions 自动构建 → Draft Release。详细 Release 工作流见 `.github/workflows/release.yml`。

### GitHub Actions 工作流

`.github/workflows/` 下有 3 个 workflow 文件，其中 `ci.yml` 内含 **3 个并行 job**：

| Workflow | 触发 | Job | 说明 |
|:---|:---|:---|:---|
| `ci.yml` | PR / push | `quality` | vue-tsc + ESLint + Vitest |
| `ci.yml` | PR / push | `build` | Tauri 生产构建 |
| `ci.yml` | PR / push | `rust-test` | cargo test（lib + bins）|
| `docs.yml` | push (main) | — | VitePress → GitHub Pages |
| `release.yml` | Git tag | — | Tauri 发布构建 |

### 质量门禁标准

本地预览文档（VitePress）：

```bash
pnpm docs:build    # 构建到 docs/.vitepress/dist/
# 或开发模式热重载
pnpm vitepress dev docs
```

---

## 8. 常见问题

### Q: `pnpm tauri dev` 报 "Rust 1.75.0 too old for Tauri 2.x"？

A: Tauri 2.x 需要 Rust 1.82+。升级 Rust：
```bash
rustup update stable
rustc --version  # 确认 >= 1.82
```

### Q: OCR 引擎初始化失败？

A: 检查 Tesseract 是否安装：
```bash
tesseract --version
```
如果使用 EasyOCR，确保 `node_modules/easyocr` 正确安装。

### Q: 帧提取返回空图片？

A: 检查 ffmpeg 是否可用：
```bash
ffmpeg -version
```
确认视频路径不包含特殊字符（引号、`$`、反引号）。

### Q: 场景检测报错 "scene_detect.py not found"？

A: 确保 `scene_detect.py` 位于 `src-tauri/scripts/` 目录，且 Python 在 PATH 中：
```bash
python3 --version
```

### Q: 前端 `invoke` 调用报错 "command not found"？

A: 确认命令已在 `lib.rs` 的 `generate_handler!` 中注册。

---

## 10. CI/CD 工作流

### GitHub Actions 工作流

`.github/workflows/` 下有 3 个 workflow 文件，其中 `ci.yml` 内含 **3 个并行 job**：

| Workflow | 触发 | Job | 说明 |
|:---|:---|:---|:---|
| `ci.yml` | PR / push | `quality` | vue-tsc + ESLint + Vitest |
| `ci.yml` | PR / push | `build` | Tauri 生产构建 |
| `ci.yml` | PR / push | `rust-test` | cargo test（lib + bins）|
| `docs.yml` | push (main) | — | VitePress → GitHub Pages |
| `release.yml` | Git tag | — | Tauri 发布构建 |

**质量门禁标准：**
- `vue-tsc --noEmit` 必须通过
- ESLint `pnpm lint` 必须通过（允许 `--fix` 自动修复）
- Vitest 测试套件全部通过

### 本地模拟 CI

```bash
# 质量检查（CI 第一路）
pnpm type-check && pnpm lint

# Rust 检查
cargo clippy -- -D warnings

# 前端测试
pnpm test

# 完整构建
pnpm tauri build
```

---

## 11. 命名规范速查

详见 [architecture.md](./architecture) 完整规范。

### Rust

| 类型 | 规范 | 示例 |
|:---|:---|:---|
| 模块文件 | snake_case | `video_processor.rs` |
| 公开函数 | snake_case | `get_video_metadata` |
| 公开结构体/枚举 | PascalCase | `VideoMetadata`, `ExportFormat` |
| 私有函数 | snake_case | `extract_frame_ffmpeg` |
| 常量 | SCREAMING_SNAKE_CASE | `DEFAULT_TIMEOUT_SECS` |

### TypeScript / Vue

| 类型 | 规范 | 示例 |
|:---|:---|:---|
| 组件 | PascalCase | `SubtitleList.vue` |
| Composables | camelCase + `use` 前缀 | `useSubtitleList.ts` |
| 工具函数 | camelCase | `textSimilarity` |
| 类型/接口 | PascalCase | `PipelineOptions` |
| 常量 | SCREAMING_SNAKE_CASE | `DEFAULT_PIPELINE_OPTIONS` |

---

## 12. 文档结构

SubLens 使用 **VitePress** 作为文档系统，源码在 `docs/` 目录：

```
docs/
├── .vitepress/
│   └── config.ts       # VitePress 配置（导航 + 侧边栏）
├── guide/              # 用户指南（面向使用者）
│   ├── getting-started.md
│   ├── first-extraction.md
│   ├── ocr-engines.md
│   ├── roi.md
│   ├── export-formats.md
│   ├── keyboard-shortcuts.md
│   └── faq.md
├── api/               # API 参考（面向开发者）
│   ├── commands.md     # Tauri IPC 命令
│   ├── pipeline.md
│   ├── exporter.md
│   ├── scene-detect.md
│   └── calibrator.md
├── index.md           # 文档首页（VitePress Home）
└── architecture.md    # 架构设计文档
```

本地预览文档：

```bash
# VitePress dev server（需先安装依赖）
npx vitepress dev docs

# 或
cd docs && npx vitepress dev .
```

---

## 13. 贡献指南

1. Fork 仓库，创建分支：`git checkout -b feat/my-feature`
2. 遵循本文档的命名规范
3. 运行 `pnpm type-check` 确保类型检查通过
4. 运行 `pnpm lint:fix` 自动修复格式问题
5. Commit 遵循 [Conventional Commits](https://www.conventionalcommits.org/)：`feat:`, `fix:`, `docs:`, `refactor:`, `perf:`
6. Push 并提 PR
