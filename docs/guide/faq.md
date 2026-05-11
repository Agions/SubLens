# 常见问题

## 安装与运行

### pnpm install 失败

```bash
# 清除缓存重试
pnpm store prune
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

### Rust 编译失败

```bash
# 确保 Rust 最新
rustup update
rustc --version  # >= 1.70
```

### FFmpeg 未找到

确保 FFmpeg 已安装并加入 PATH：

```bash
# macOS
brew install ffmpeg

# Ubuntu/Debian
sudo apt install ffmpeg

# Windows (winget)
winget install ffmpeg
```

## 提取效果

### 字幕识别不准确

1. **选择正确的语言**：OCR 引擎需要知道字幕语言才能准确识别
2. **调整 ROI**：确保 ROI 完整覆盖字幕区域
3. **降低置信度阈值**：从 70% 降到 50% 可显示更多候选字幕
4. **尝试其他引擎**：EasyOCR → PaddleOCR → Tesseract.js

### 字幕位置偏移

- 重新调整 ROI 区域
- 检查视频帧率是否正确（FPS 显示在状态栏）
- 部分视频需要手动微调 startTime

### 重复字幕过多

1. 启用 **字幕合并**（相似度 80%）
2. 提高 **置信度阈值** 到 80%
3. 检查 **多轮 OCR** 是否启用

## 导出问题

### 导出文件为空

1. 确认已提取到字幕（字幕列表非空）
2. 检查保存路径是否有写入权限
3. 尝试更换导出目录

### 时间轴偏移

ASS/SSA 格式使用毫秒精度，SRT 使用秒级精度。如需帧级精度，请使用 JSON 格式。

## 性能

### 提取速度慢

- **使用 GPU**：PaddleOCR + CUDA 加速可提升 5-10 倍
- **减少 ROI 区域**：只提取字幕区域，跳过画面主体
- **降低分辨率**：在设置中减小处理分辨率
- **关闭多轮 OCR**：速度最快但精度略降
