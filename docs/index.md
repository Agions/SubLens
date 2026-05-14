---
layout: home

hero:
  name: "SubLens"
  text: "智能视频字幕提取工具"
  tagline: "基于 Tauri + Vue 3 + Rust，从视频中提取硬编码字幕"
  actions:
    - theme: brand
      text: 快速开始 →
      link: /guide/getting-started
    - theme: alt
      text: 查看架构
      link: /guide/architecture
    - theme: alt
      text: GitHub
      link: https://github.com/Agions/SubLens

features:
  - icon: 🤖
    title: 多引擎 OCR
    details: 支持 PaddleOCR、EasyOCR、Tesseract.js，80+ 语言识别，GPU 加速
  - icon: ✨
    title: 五阶段后处理
    details: normalize → filterJitter → mergeSplit → mergeSimilar → computeEndTime
  - icon: 📦
    title: 12 种导出格式
    details: SRT · VTT · ASS · SSA · JSON · CSV · TXT · LRC · SBV · MD · STL · TTML
  - icon: 🎬
    title: 智能场景检测
    details: 直方图 + 卡方检验，自动跳过无字幕帧，减少无效 OCR
  - icon: 🎯
    title: ROI 区域预设
    details: 底部 · 顶部 · 左侧 · 右侧 · 中间 · 自定义，一键切换
  - icon: 🔧
    title: 纯 Rust 后端
    details: Tokio 异步 I/O，FFmpeg 帧提取，12 格式导出，无外部运行时依赖
---
