---
title: 安装与运行
---

# 安装与运行

## 系统要求

| 要求 | 最低版本 | 推荐版本 |
|:---|:---|:---|
| Node.js | 18.0 | 20 LTS |
| Rust | 1.70 | 1.82+ (Tauri 2.x 需要) |
| pnpm | 8.0 | 9.0 |
| FFmpeg | 最新 | 最新稳定版 |
| Tesseract | 5.0 | 最新稳定版 |

## 前置依赖安装

### FFmpeg

```bash
# macOS
brew install ffmpeg

# Ubuntu / Debian
sudo apt update && sudo apt install ffmpeg

# Windows (via winget)
winget install Gyan.FFmpeg
```

### Tesseract OCR

```bash
# macOS
brew install tesseract tesseract-lang

# Ubuntu / Debian
sudo apt install tesseract-ocr tesseract-ocr-all

# Windows
# 下载地址: https://github.com/UB-Mannheim/tesseract/wiki
```

验证安装：

```bash
ffmpeg -version
tesseract --version
```

## 项目初始化

```bash
git clone https://github.com/Agions/SubLens.git
cd SubLens
pnpm install
```

## 开发模式

```bash
pnpm tauri dev
```

首次运行会编译 Rust 后端（约 2-3 分钟），之后前端热重载，Rust 修改后自动增量编译。

> **Tip:** 前端单独开发（无需 Tauri）：`pnpm vite`，端口 5173

## 生产构建

```bash
pnpm tauri build
```

构建产物位于 `src-tauri/target/release/bundle/`：

| 平台 | 产物 |
|:---|:---|
| macOS | `.app` / `.dmg` |
| Linux | `.AppImage` / `.deb` |
| Windows | `.exe` / `.msi` |

## 前端开发工具

```bash
# 类型检查
pnpm type-check

# ESLint 检查
pnpm lint

# 自动修复格式问题
pnpm lint:fix

# 单元测试
pnpm test

# 测试 Watch 模式
pnpm test:watch
```

## Rust 开发工具

```bash
# 格式化
cargo fmt

# Lint
cargo clippy -- -D warnings

# 运行测试
cargo test --manifest-path src-tauri/Cargo.toml
```

## 下一步

- [首次提取操作流程](./first-extraction)
- [OCR 引擎详解](./ocr-engines)
- [ROI 区域选择](./roi)
