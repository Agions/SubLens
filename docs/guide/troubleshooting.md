# 故障排除

## 系统检查

SubLens 内置系统诊断工具：**Settings → System Check**

可检测以下依赖是否正确安装：

| 依赖 | 用途 | 检测命令 |
|:---|:---|:---|
| FFmpeg | 视频解码、帧提取 | `ffmpeg -version` |
| Tesseract | OCR 引擎 | `tesseract --version` |
| Python | PaddleOCR 运行时 | `python3 --version` |
| PaddleOCR | 高精度 OCR | `python3 -c "from paddleocr import PaddleOCR"` |

---

## 常见错误

### "No subtitles found"

**原因**：ROI 区域选择不正确，或视频无硬字幕。

**解决**：

1. 确认字幕确实在视频画面内（不是软字幕）
2. 尝试不同的 ROI 预设（Bottom / Top / Custom）
3. 降低置信度阈值到 50%
4. 确认 OCR 语言与字幕语言匹配

### "OCR engine initialization failed"

**原因**：指定的 OCR 引擎未安装或路径错误。

**解决**：

- **Tesseract**：Ubuntu/Debian 上运行 `sudo apt install tesseract-ocr`
- **PaddleOCR**：`pip install paddleocr`
- **EasyOCR**：`pip install easyocr`

### "ffmpeg not found"

```bash
# Linux (Ubuntu/Debian)
sudo apt install ffmpeg

# macOS
brew install ffmpeg

# Windows (Scoop)
scoop install ffmpeg
```

### "Permission denied"（Linux/macOS）

```bash
chmod +x SubLens          # 赋予执行权限
xattr -cr ./SubLens       # macOS Gatekeeper 白名单
```

### "pkg-config: gobject-2.0 was not found"

```bash
# Ubuntu/Debian
sudo apt install libglib2.0-dev

# Fedora
sudo dnf install glib2-devel
```

---

## 日志获取

GUI 内日志路径：

- **Windows**：`%APPDATA%\SubLens\logs\`
- **macOS**：`~/Library/Logs/SubLens/`
- **Linux**：`~/.config/SubLens/logs/`

CLI 日志（debug 模式）：

```bash
sublens-cli extract video.mp4 --verbose 2>&1 | tee debug.log
```

---

## 性能问题

### 内存占用过高

- 增大 **Frame interval**（帧间隔），默认 1 帧
- 关闭 **Multi-pass OCR**（内存密集）
- 降低视频分辨率（720p 而非 1080p）

### UI 卡顿

SubLens 在提取过程中 UI 保持响应（Rust 后端已异步化）。如遇卡顿，可能是：

- 系统内存不足（建议 8GB+）
- 视频文件过大（> 2GB）
- 后台应用过多
