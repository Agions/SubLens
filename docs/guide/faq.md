---
title: 常见问题
---

# 常见问题

## 安装与运行

### Q: `pnpm install` 失败？

**A:** 常见原因及解决方案：

```bash
# Node 版本过低
nvm install 18 && nvm use 18

# pnpm 版本过低
npm i -g pnpm@9

# 清理缓存重试
pnpm store prune && pnpm install
```

### Q: `pnpm tauri dev` 报错 "Rust 1.75.0 too old for Tauri 2.x"？

**A:** Tauri 2.x 要求 Rust 1.82+。升级 Rust：

```bash
rustup update stable
rustup default stable
rustc --version  # 确认 >= 1.82
```

### Q: Windows 下找不到 FFmpeg？

**A:** 确保 FFmpeg 在 PATH 中：

```powershell
# 使用 winget 安装（自动加入 PATH）
winget install Gyan.FFmpeg

# 手动添加 PATH 后重启终端
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","User") + ";C:\path\to\ffmpeg"
```

---

## OCR 相关

### Q: Tesseract.js 识别结果全是乱码？

**A:** 检查语言包是否正确加载：

1. 打开「设置」→「OCR 语言」
2. 确认已勾选对应语言（如 `chi_sim` 简体中文）
3. 重启提取任务

### Q: EasyOCR 初始化失败？

**A:** 检查 PyTorch 和 CUDA 版本：

```bash
python -c "import torch; print(torch.cuda.is_available())"
# True 表示 GPU 可用
```

### Q: PaddleOCR 返回空结果？

**A:** 检查 ROI 设置是否正确，确保字幕区域在选择范围内。

### Q: 如何提升识别精度？

1. **调低帧采样间隔**：减少漏检（但增加处理时间）
2. **开启多轮 OCR**：取多次结果的最优值
3. **手动微调 ROI**：排除 LOGO、水印干扰区域
4. **选择合适引擎**：中文视频用 PaddleOCR，英文用 EasyOCR

---

## 视频处理

### Q: 视频加载失败？

**A:** 支持格式：MP4 · MKV · AVI · MOV · WebM · M4V · WMV · FLV · 3GP

如果视频使用特殊编码，尝试转码：

```bash
ffmpeg -i input.mkv -c:v libx264 -c:a aac output.mp4
```

### Q: 帧提取返回黑屏/空图片？

**A:** 原因及排查：

1. **ffmpeg 路径问题**：确认 ffmpeg 在 PATH 中
   ```bash
   ffmpeg -version
   ```
2. **视频损坏**：用 VLC 或 ffprobe 检查
   ```bash
   ffprobe -v error input.mp4
   ```
3. **路径含特殊字符**：避免路径中包含 `$`、反引号、引号

### Q: 场景检测把所有帧都标记为变化？

**A:** 降低场景检测灵敏度：

- 调高「场景阈值」滑块
- 对纪录片、动画等镜头变化少的内容效果更好

---

## 导出问题

### Q: ASS 格式字幕在播放器中不显示样式？

**A:** 部分播放器（如 VLC）需开启 ASS 样式支持：
- VLC：`Preferences → Subtitles → Subtitle effects → Enable`
- mpv：默认支持 ASS

### Q: 导出文件乱码？

**A:** 字符编码问题。尝试：

1. 用「编码」选项选择 `UTF-8 with BOM`
2. 使用 VLC 播放检查是否正常
3. Windows 用户用记事本「另存为」改为 UTF-8

### Q: SRT 时间轴和视频不同步？

**A:** 常见原因：

1. **视频帧率非 25fps**：在设置中指定正确帧率
2. **视频带章节标记**：某些播放器从章节开始计时
3. **时间戳格式错误**：确认使用逗号（`,`）而非句号（`.`）分隔毫秒

---

## 性能问题

### Q: 处理大视频（2小时+）很慢？

**A:** 优化建议：

1. **增加 ROI 精确度**：减少需要处理的像素数
2. **调高帧采样间隔**：如从每帧改为每 2/3/5 帧
3. **开启场景检测**：跳过无字幕的镜头
4. **使用 GPU 引擎**：PaddleOCR/EasyOCR 配合 GPU

### Q: 内存占用越来越高？

**A:** SubLens 目前在内存中保留所有识别结果，计划支持流式处理。工作区限制：

- 关闭其他占用内存的应用
- 分段处理超长视频（剪成多个小文件）

---

## 其他

### Q: 快捷键失灵？

**A:** 确保焦点在主窗口上，而非输入框内。点击视频预览区重试。

### Q: 项目文件保存在哪里？

**A:** 项目配置在 `~/.sublens/`：
- `settings.json` — 用户设置
- `roi-presets.json` — ROI 预设
- `logs/` — 运行日志

### Q: 如何回滚到旧版本？

```bash
# 查看可用版本
git tag

# 切换到指定版本
git checkout v3.5.0
```
