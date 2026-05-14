<template>
  <div class="home-wrapper">

    <!-- Stats Bar -->
    <div class="stats-bar">
      <div class="stat-item">
        <span class="stat-value">12</span>
        <span class="stat-label">导出格式</span>
      </div>
      <div class="stat-divider"></div>
      <div class="stat-item">
        <span class="stat-value">5</span>
        <span class="stat-label">Pipeline 阶段</span>
      </div>
      <div class="stat-divider"></div>
      <div class="stat-item">
        <span class="stat-value">3</span>
        <span class="stat-label">OCR 引擎</span>
      </div>
      <div class="stat-divider"></div>
      <div class="stat-item">
        <span class="stat-value">80+</span>
        <span class="stat-label">支持语言</span>
      </div>
    </div>

    <!-- Code Demo Section -->
    <div class="code-demo-section">
      <div class="section-label">// 工作原理</div>
      <h2 class="section-title">三步完成字幕提取</h2>

      <div class="workflow-cards">
        <div class="workflow-card">
          <div class="workflow-num">01</div>
          <div class="workflow-content">
            <h3>导入视频</h3>
            <p>选择视频文件，后端自动解析元数据（时长、分辨率、帧率）</p>
            <div class="workflow-code">
              <pre><code>await invoke&lt;VideoMetadata&gt;('get_video_metadata', {
  path: '/path/to/video.mp4'
})
// → { duration: 7200, fps: 29.97, width: 1920, height: 1080 }</code></pre>
            </div>
          </div>
        </div>

        <div class="workflow-card">
          <div class="workflow-num">02</div>
          <div class="workflow-content">
            <h3>ROI + OCR</h3>
            <p>选择字幕区域，前端 WASM 执行 OCR，后端提取帧画面</p>
            <div class="workflow-code">
              <pre><code>// 提取单帧
const frame = await invoke&lt;string&gt;('extract_frame_at_time', {
  path: '/path/to/video.mp4',
  timeSeconds: 10.5
})
// → "iVBORw0KGgoAAAANSUhEUgAAAAE..." (Base64 PNG)

// 前端 OCR（WASM 执行）
const rawSubs = await engine.recognize(frame, roi)</code></pre>
            </div>
          </div>
        </div>

        <div class="workflow-card">
          <div class="workflow-num">03</div>
          <div class="workflow-content">
            <h3>后处理 + 导出</h3>
            <p>五阶段 Pipeline 清洗，12 种格式导出</p>
            <div class="workflow-code">
              <pre><code>// Pipeline 后处理
const cleaned = new Pipeline().process(rawSubs)

// 导出 SRT
await invoke&lt;string&gt;('export_subtitles', {
  subtitles: cleaned,
  format: 'srt',
  outputPath: '/path/to/output.srt'
})</code></pre>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Architecture Section -->
    <div class="arch-section">
      <div class="section-label">// 技术架构</div>
      <h2 class="section-title">前端计算，后端 I/O</h2>

      <div class="arch-diagram">
        <div class="arch-layer arch-frontend">
          <div class="arch-layer-label">Frontend — Vue 3 + TypeScript</div>
          <div class="arch-modules">
            <div class="arch-module">EasyOCR<br/><span>PyTorch / WASM</span></div>
            <div class="arch-module">Tesseract.js<br/><span>WASM</span></div>
            <div class="arch-module accent">Pipeline.ts<br/><span>五阶段后处理</span></div>
            <div class="arch-module accent">Calibrator.ts<br/><span>置信度校准</span></div>
            <div class="arch-module">SceneDetect.ts<br/><span>直方图卡方</span></div>
          </div>
        </div>
        <div class="arch-connector">
          <div class="connector-line">Tauri IPC</div>
        </div>
        <div class="arch-layer arch-backend">
          <div class="arch-layer-label">Backend — Rust + Tokio</div>
          <div class="arch-modules">
            <div class="arch-module">video.rs<br/><span>元数据 · 帧提取</span></div>
            <div class="arch-module">scene.rs<br/><span>场景检测</span></div>
            <div class="arch-module">export.rs<br/><span>12 格式导出</span></div>
            <div class="arch-module">system.rs<br/><span>依赖诊断</span></div>
            <div class="arch-module">file.rs<br/><span>文件对话框</span></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Tech Stack -->
    <div class="tech-stack">
      <div class="section-label">// 技术栈</div>
      <h2 class="section-title">现代桌面应用技术选型</h2>

      <div class="stack-grid">
        <div class="stack-card">
          <div class="stack-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
          </div>
          <div class="stack-info">
            <h4>Tauri 2.x</h4>
            <p>Rust 原生桌面框架，体积小、安全、执行快</p>
          </div>
        </div>
        <div class="stack-card">
          <div class="stack-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z"/></svg>
          </div>
          <div class="stack-info">
            <h4>Vue 3 + Pinia</h4>
            <p>组合式 API 响应式状态管理，组件化 UI</p>
          </div>
        </div>
        <div class="stack-card">
          <div class="stack-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
          </div>
          <div class="stack-info">
            <h4>Rust + Tokio</h4>
            <p>Tokio 异步运行时，所有 I/O 操作非阻塞</p>
          </div>
        </div>
        <div class="stack-card">
          <div class="stack-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/></svg>
          </div>
          <div class="stack-info">
            <h4>TypeScript</h4>
            <p>严格模式，零 any 类型，全链路类型安全</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Format Showcase -->
    <div class="format-section">
      <div class="section-label">// 导出格式</div>
      <h2 class="section-title">12 种格式，覆盖所有场景</h2>

      <div class="format-grid">
        <div class="format-card primary"><div class="format-name">SRT</div><div class="format-desc">最通用，所有播放器支持</div></div>
        <div class="format-card primary"><div class="format-name">VTT</div><div class="format-desc">HTML5 视频标准</div></div>
        <div class="format-card"><div class="format-name">ASS</div><div class="format-desc">高级样式，动漫压制</div></div>
        <div class="format-card"><div class="format-name">JSON</div><div class="format-desc">结构化数据，程序处理</div></div>
        <div class="format-card"><div class="format-name">CSV</div><div class="format-desc">Excel / Sheets 直开</div></div>
        <div class="format-card"><div class="format-name">LRC</div><div class="format-desc">歌词同步，音乐播放</div></div>
        <div class="format-card secondary"><div class="format-name">SSA</div><div class="format-desc">SubStation Alpha</div></div>
        <div class="format-card secondary"><div class="format-name">SBV</div><div class="format-desc">YouTube 字幕</div></div>
        <div class="format-card secondary"><div class="format-name">TXT</div><div class="format-desc">纯文本</div></div>
        <div class="format-card secondary"><div class="format-name">MD</div><div class="format-desc">Markdown</div></div>
        <div class="format-card muted"><div class="format-name">STL</div><div class="format-desc">广播级</div></div>
        <div class="format-card muted"><div class="format-name">TTML</div><div class="format-desc">W3C 标准</div></div>
      </div>
    </div>

    <!-- CTA -->
    <div class="home-cta">
      <h2>开始提取字幕</h2>
      <p>开源免费，MIT 许可证</p>
      <div class="cta-actions">
        <a href="/guide/getting-started" class="cta-primary">快速开始 →</a>
        <a href="https://github.com/Agions/SubLens" class="cta-secondary">GitHub ★ Star</a>
      </div>
    </div>

  </div>
</template>

<style scoped>
.home-wrapper {
  max-width: 1100px;
  margin: 0 auto;
  padding: 0 24px 80px;
}

.stats-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0;
  padding: 20px 32px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  margin: 48px 0 64px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 0 32px;
}

.stat-value {
  font-size: 1.75rem;
  font-weight: 590;
  color: #10b981;
  letter-spacing: -0.03em;
  line-height: 1;
}

.stat-label {
  font-size: 12px;
  font-weight: 400;
  color: #8a8f98;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  white-space: nowrap;
}

.stat-divider {
  width: 1px;
  height: 36px;
  background: rgba(255, 255, 255, 0.08);
}

.section-label {
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  font-weight: 500;
  color: #10b981;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin-bottom: 12px;
}

.section-title {
  font-size: 1.75rem !important;
  font-weight: 590 !important;
  letter-spacing: -0.03em !important;
  color: #f7f8f8 !important;
  line-height: 1.2 !important;
  margin-bottom: 40px !important;
}

.code-demo-section { margin: 0 0 80px; }

.workflow-cards { display: flex; flex-direction: column; gap: 24px; }

.workflow-card {
  display: flex;
  gap: 28px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 12px;
  padding: 28px;
  transition: border-color 0.2s;
}

.workflow-card:hover { border-color: rgba(16, 185, 129, 0.25); }

.workflow-num {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  font-weight: 500;
  color: #10b981;
  letter-spacing: 0.05em;
  padding-top: 4px;
  min-width: 28px;
}

.workflow-content h3 {
  font-size: 1rem !important;
  font-weight: 590 !important;
  color: #f7f8f8 !important;
  letter-spacing: -0.01em !important;
  margin-bottom: 8px !important;
}

.workflow-content p {
  font-size: 13.5px !important;
  color: #8a8f98 !important;
  margin-bottom: 14px !important;
  line-height: 1.5 !important;
}

.workflow-code {
  background: #0f1011;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 8px;
  overflow: hidden;
}

.workflow-code pre {
  margin: 0 !important;
  padding: 16px 20px !important;
  font-family: 'JetBrains Mono', monospace !important;
  font-size: 12.5px !important;
  line-height: 1.65 !important;
  color: #d0d6e0 !important;
  background: transparent !important;
  overflow-x: auto;
}

.workflow-code code {
  font-family: inherit !important;
  background: transparent !important;
  color: inherit !important;
  font-size: inherit !important;
  white-space: pre;
}

.arch-section { margin: 0 0 80px; }

.arch-diagram {
  display: flex;
  flex-direction: column;
  background: rgba(255, 255, 255, 0.01);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 16px;
  overflow: hidden;
}

.arch-layer { padding: 24px 28px; }

.arch-layer-label {
  font-size: 11px;
  font-weight: 590;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #62666d;
  margin-bottom: 16px;
}

.arch-frontend { background: rgba(16, 185, 129, 0.03); }
.arch-backend { background: rgba(99, 102, 241, 0.03); }

.arch-modules { display: flex; flex-wrap: wrap; gap: 10px; }

.arch-module {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 10px 16px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  color: #d0d6e0;
  text-align: center;
  line-height: 1.3;
  transition: all 0.15s;
}

.arch-module:hover {
  background: rgba(255, 255, 255, 0.07);
  border-color: rgba(255, 255, 255, 0.12);
}

.arch-module.accent {
  background: rgba(16, 185, 129, 0.08);
  border-color: rgba(16, 185, 129, 0.25);
  color: #34d399;
}

.arch-module span {
  font-size: 11px;
  font-weight: 400;
  color: #62666d;
  font-family: 'JetBrains Mono', monospace;
}

.arch-connector {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px;
  background: rgba(255, 255, 255, 0.02);
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.connector-line {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  color: #62666d;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.tech-stack { margin: 0 0 80px; }

.stack-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 16px;
}

.stack-card {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 20px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  transition: all 0.15s;
}

.stack-card:hover {
  border-color: rgba(16, 185, 129, 0.2);
  background: rgba(255, 255, 255, 0.03);
}

.stack-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(16, 185, 129, 0.1);
  border-radius: 8px;
  color: #10b981;
  flex-shrink: 0;
}

.stack-info h4 {
  font-size: 14px !important;
  font-weight: 590 !important;
  color: #f7f8f8 !important;
  margin-bottom: 6px !important;
  letter-spacing: -0.01em !important;
}

.stack-info p {
  font-size: 13px !important;
  color: #8a8f98 !important;
  line-height: 1.5 !important;
  margin: 0 !important;
}

.format-section { margin: 0 0 80px; }

.format-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 12px;
}

.format-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 18px 12px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 10px;
  text-align: center;
  transition: all 0.15s;
}

.format-card:hover {
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba(255, 255, 255, 0.1);
  transform: translateY(-1px);
}

.format-card.primary {
  background: rgba(16, 185, 129, 0.06);
  border-color: rgba(16, 185, 129, 0.2);
}

.format-card.primary:hover {
  background: rgba(16, 185, 129, 0.1);
  border-color: rgba(16, 185, 129, 0.35);
}

.format-card.secondary { opacity: 0.75; }
.format-card.muted { opacity: 0.5; }

.format-name {
  font-family: 'JetBrains Mono', monospace;
  font-size: 14px;
  font-weight: 500;
  color: #f7f8f8;
  letter-spacing: 0.02em;
}

.format-card.primary .format-name { color: #10b981; }

.format-desc {
  font-size: 11px;
  color: #62666d;
  line-height: 1.3;
}

.home-cta {
  text-align: center;
  padding: 64px 24px;
  background: radial-gradient(ellipse 60% 50% at 50% 100%, rgba(16, 185, 129, 0.07) 0%, transparent 70%);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.home-cta h2 {
  font-size: 2rem !important;
  font-weight: 590 !important;
  letter-spacing: -0.03em !important;
  color: #f7f8f8 !important;
  margin-bottom: 12px !important;
}

.home-cta p {
  font-size: 15px !important;
  color: #8a8f98 !important;
  margin-bottom: 28px !important;
}

.cta-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  flex-wrap: wrap;
}

.cta-primary {
  display: inline-flex;
  align-items: center;
  padding: 12px 28px;
  background: #10b981;
  color: #08090a;
  font-weight: 590;
  font-size: 14px;
  border-radius: 8px;
  text-decoration: none;
  transition: all 0.15s;
}

.cta-primary:hover {
  background: #34d399;
  transform: translateY(-1px);
  box-shadow: 0 4px 16px rgba(16, 185, 129, 0.3);
  color: #08090a;
  text-decoration: none;
}

.cta-secondary {
  display: inline-flex;
  align-items: center;
  padding: 12px 28px;
  background: transparent;
  color: #d0d6e0;
  font-weight: 400;
  font-size: 14px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  text-decoration: none;
  transition: all 0.15s;
}

.cta-secondary:hover {
  border-color: rgba(16, 185, 129, 0.3);
  color: #10b981;
  background: rgba(16, 185, 129, 0.05);
  text-decoration: none;
}

@media (max-width: 768px) {
  .stats-bar { flex-wrap: wrap; gap: 16px; padding: 16px; }
  .stat-divider { display: none; }
  .stat-item { padding: 8px 20px; }
  .workflow-card { flex-direction: column; gap: 12px; }
  .arch-modules { justify-content: center; }
  .format-grid { grid-template-columns: repeat(auto-fill, minmax(110px, 1fr)); }
  .section-title { font-size: 1.4rem !important; }
}
</style>
