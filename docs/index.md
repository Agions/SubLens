---
layout: home
title: SubLens — 智能视频字幕提取工具
titleTemplate: false
---
hero:
  name: SubLens
  text: 智能视频字幕提取
  tagline: 从视频中提取硬编码字幕，输出 SRT · VTT · ASS · JSON 等 12 种格式。基于 Tauri 2.x + Vue 3 + Rust 构建，前端 OCR，后端纯异步 I/O。
  actions:
    - theme: brand
      text: 快速开始 →
      link: /guide/getting-started
    - theme: alt
      text: 查看架构设计
      link: /architecture
    - theme: alt
      text: GitHub
      link: https://github.com/Agions/SubLens

features:
  - icon: 🎯
    title: 多引擎 OCR
    details: PaddleOCR · EasyOCR · Tesseract.js，80+ 语言，GPU 加速，智能切换
  - icon: ⚡
    title: 五阶段后处理
    details: normalize → filterJitter → mergeSplit → mergeSimilar → computeEndTime，流水线清洗
  - icon: 📦
    title: 12 种导出格式
    details: SRT · VTT · ASS · SSA · JSON · CSV · TXT · LRC · SBV · MD · STL · TTML
  - icon: 🎬
    title: 智能场景检测
    details: 直方图 + 卡方检验，自动跳过无字幕帧，减少 60% 无效 OCR
  - icon: 🔧
    title: 纯 Rust 后端
    details: Tokio 异步 I/O，所有 I/O 操作非阻塞，零外部运行时依赖
  - icon: 🛡️
    title: 置信度校准
    details: 混语 · 短文本 · 重复字符自动降权，可视化质量信号
---

<HomeHero />
