<!--docsify-disable-->
<section class="cover text-center">

<div class="cover-logo">
  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/>
  </svg>
</div>

<h1>Sub<span class="name-part-2">Lens</span></h1>
<p class="cover-subtitle">
  基于 Tauri + Vue 3 + Rust 的智能字幕提取工具<br />
  支持 12 种导出格式，前端 OCR，后端纯 Rust
</p>

<div class="cover-badges">
  <span class="badge"><span class="dot"></span>Vue 3 + TypeScript</span>
  <span class="badge"><span class="dot"></span>Rust + Tokio</span>
  <span class="badge"><span class="dot"></span>Tauri 2.x</span>
  <span class="badge"><span class="dot"></span>12 格式导出</span>
</div>

<div class="cover-stats">
  <div class="stat"><div class="val">12</div><div class="lab">导出格式</div></div>
  <div class="stat"><div class="val">5</div><div class="lab">Pipeline 阶段</div></div>
  <div class="stat"><div class="val">3</div><div class="lab">OCR 引擎</div></div>
</div>

<div class="cover-actions">
  <a href="architecture.html" class="btn-primary">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
    架构设计
  </a>
  <a href="developer-guide.html" class="btn-secondary">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
    开发指南
  </a>
  <a href="https://github.com/Agions/SubLens" class="btn-secondary" target="_blank">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
    GitHub
  </a>
</div>

<hr class="cover-hr" />

<div class="cover-features">
  <div class="feat">
    <div class="feat-icon">🎬</div>
    <div class="feat-title">智能帧提取</div>
    <p class="feat-desc">Rust 后端三层降级策略：ffprobe → ffmpeg → 文件估算，保证各类视频元数据获取</p>
  </div>
  <div class="feat">
    <div class="feat-icon">📝</div>
    <div class="feat-title">五阶段 Pipeline</div>
    <p class="feat-desc">normalize → filterJitter → mergeSplit → mergeSimilar → computeEndTime，流水线字幕清洗</p>
  </div>
  <div class="feat">
    <div class="feat-icon">🔍</div>
    <div class="feat-title">场景检测</div>
    <p class="feat-desc">前端 Histogram + Chi-Square（纯 JS，轻量）配后端 scenedetect Python（精确）</p>
  </div>
  <div class="feat">
    <div class="feat-icon">💾</div>
    <div class="feat-title">12 格式导出</div>
    <p class="feat-desc">SRT · VTT · ASS · SSA · LRC · SBV · JSON · CSV · TXT 及更多</p>
  </div>
</div>

<div class="cover-footer">
  SubLens · AGPL-3.0 · Made with 💚 by Agions
</div>

</section>
