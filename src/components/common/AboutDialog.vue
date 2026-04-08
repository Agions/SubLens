<script setup lang="ts">
import Modal from '@/components/common/Modal.vue'

interface Props {
  open: boolean
}

defineProps<Props>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'update:open', value: boolean): void
}>()

const version = '3.0.0'
const buildDate = new Date().toLocaleDateString('zh-CN', {
  year: 'numeric',
  month: 'long',
  day: 'numeric'
})

const features = [
  '🎬 视频字幕提取',
  '🔍 Tesseract.js OCR',
  '📋 多格式导出',
  '⌨️ 键盘快捷键',
  '🌈 主题切换',
  '📦 桌面 + CLI 双模式'
]

function close() {
  emit('close')
  emit('update:open', false)
}
</script>

<template>
  <Modal :open="open" title="关于 HardSubX" size="md" @close="close">
    <div class="about-content">
      <div class="about-header">
        <div class="app-icon">🎬</div>
        <div class="app-info">
          <h2 class="app-name">HardSubX</h2>
          <p class="app-version">版本 {{ version }}</p>
          <p class="app-date">构建于 {{ buildDate }}</p>
        </div>
      </div>

      <div class="app-desc">
        <p>专业的视频字幕提取工具，基于 Tauri + Vue 3 + TypeScript 构建。</p>
      </div>

      <div class="features-list">
        <h4 class="features-title">功能特点</h4>
        <ul>
          <li v-for="feature in features" :key="feature">{{ feature }}</li>
        </ul>
      </div>

      <div class="tech-stack">
        <h4 class="tech-title">技术栈</h4>
        <div class="tech-badges">
          <span class="badge">Tauri 2.x</span>
          <span class="badge">Vue 3</span>
          <span class="badge">TypeScript</span>
          <span class="badge">Rust</span>
          <span class="badge">SCSS</span>
          <span class="badge">Pinia</span>
        </div>
      </div>

      <div class="links-section">
        <a href="https://github.com/Agions/HardSubX" target="_blank" class="link-item">
          <span class="link-icon">🐛</span>
          <span class="link-text">问题反馈</span>
        </a>
        <a href="https://github.com/Agions/HardSubX/releases" target="_blank" class="link-item">
          <span class="link-icon">📦</span>
          <span class="link-text">发布版本</span>
        </a>
        <a href="https://github.com/Agions/HardSubX/discussions" target="_blank" class="link-item">
          <span class="link-icon">💬</span>
          <span class="link-text">讨论区</span>
        </a>
      </div>

      <div class="copyright">
        <p>© 2026 Agions. All rights reserved.</p>
        <p>MIT License</p>
      </div>
    </div>
  </Modal>
</template>

<style lang="scss" scoped>
.about-content {
  display: flex;
  flex-direction: column;
  gap: $space-5;
}

.about-header {
  display: flex;
  align-items: center;
  gap: $space-4;
}

.app-icon {
  width: 64px;
  height: 64px;
  @include flex-center;
  font-size: 48px;
  background: linear-gradient(135deg, $primary-dim, $accent-dim);
  border-radius: $radius-xl;
}

.app-info {
  .app-name {
    font-size: $text-2xl;
    font-weight: 700;
    background: linear-gradient(135deg, $primary, $accent);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  
  .app-version {
    font-family: $font-display;
    font-size: $text-sm;
    color: $text-secondary;
    margin-top: $space-1;
  }
  
  .app-date {
    font-size: $text-xs;
    color: $text-muted;
  }
}

.app-desc {
  padding: $space-3;
  background: $bg-elevated;
  border-radius: $radius-md;
  
  p {
    font-size: $text-sm;
    color: $text-secondary;
    line-height: 1.6;
  }
}

.features-list {
  h4 {
    font-size: $text-sm;
    font-weight: 600;
    color: $text-secondary;
    margin-bottom: $space-2;
  }
  
  ul {
    list-style: none;
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: $space-2;
  }
  
  li {
    font-size: $text-sm;
    color: $text-primary;
    padding: $space-2;
    background: $bg-elevated;
    border-radius: $radius-sm;
  }
}

.tech-stack {
  h4 {
    font-size: $text-sm;
    font-weight: 600;
    color: $text-secondary;
    margin-bottom: $space-2;
  }
}

.tech-badges {
  display: flex;
  flex-wrap: wrap;
  gap: $space-2;
}

.badge {
  padding: $space-1 $space-3;
  background: $primary-dim;
  color: $primary;
  font-size: $text-xs;
  font-weight: 500;
  border-radius: $radius-full;
}

.links-section {
  display: flex;
  gap: $space-3;
  justify-content: center;
}

.link-item {
  display: flex;
  align-items: center;
  gap: $space-1;
  padding: $space-2 $space-3;
  background: $bg-elevated;
  border-radius: $radius-md;
  text-decoration: none;
  transition: all $transition-fast;
  
  &:hover {
    background: $bg-overlay;
  }
  
  .link-icon {
    font-size: 14px;
  }
  
  .link-text {
    font-size: $text-sm;
    color: $text-secondary;
  }
}

.copyright {
  text-align: center;
  padding-top: $space-3;
  border-top: 1px solid $border;
  
  p {
    font-size: $text-xs;
    color: $text-muted;
    
    &:first-child {
      margin-bottom: $space-1;
    }
  }
}
</style>
