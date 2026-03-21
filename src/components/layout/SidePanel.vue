<script setup lang="ts">
import { ref } from 'vue'

const activeSection = ref<'files' | 'progress' | 'roi' | 'ocr'>('files')

const roiPresets = [
  { id: 'bottom', name: '底部字幕', icon: '⬇️' },
  { id: 'top', name: '顶部字幕', icon: '⬆️' },
  { id: 'left', name: '左侧字幕', icon: '⬅️' },
  { id: 'right', name: '右侧字幕', icon: '➡️' },
  { id: 'center', name: '中心字幕', icon: '⭕' },
]

const ocrEngines = [
  { id: 'paddle', name: 'PaddleOCR', recommended: true },
  { id: 'easy', name: 'EasyOCR', recommended: false },
  { id: 'tesseract', name: 'Tesseract', recommended: false },
]

const selectedEngine = ref('paddle')
const selectedPreset = ref('bottom')
</script>

<template>
  <aside class="side-panel">
    <!-- Section Tabs -->
    <div class="section-tabs">
      <button
        v-for="section in ['files', 'progress', 'roi', 'ocr'] as const"
        :key="section"
        :class="['tab', { active: activeSection === section }]"
        @click="activeSection = section"
      >
        {{ section === 'files' ? '📁' : section === 'progress' ? '📊' : section === 'roi' ? '🎯' : '🔧' }}
      </button>
    </div>
    
    <!-- Files Section -->
    <div v-if="activeSection === 'files'" class="section">
      <h3 class="section-title">文件列表</h3>
      <div class="empty-state">
        <span class="empty-icon">📂</span>
        <p class="empty-text">拖拽视频文件到这里</p>
        <p class="empty-hint">支持 MP4, MKV, AVI, MOV, WebM</p>
      </div>
    </div>
    
    <!-- Progress Section -->
    <div v-if="activeSection === 'progress'" class="section">
      <h3 class="section-title">处理进度</h3>
      <div class="progress-area">
        <div class="progress-ring">
          <svg viewBox="0 0 100 100">
            <circle class="ring-bg" cx="50" cy="50" r="45" />
            <circle class="ring-fill" cx="50" cy="50" r="45" 
              stroke-dasharray="283" stroke-dashoffset="0" />
          </svg>
          <span class="progress-text">0%</span>
        </div>
        <div class="progress-info">
          <span class="progress-label">等待处理</span>
          <span class="progress-detail">已提取 0 条字幕</span>
        </div>
      </div>
    </div>
    
    <!-- ROI Section -->
    <div v-if="activeSection === 'roi'" class="section">
      <h3 class="section-title">字幕区域</h3>
      <div class="roi-presets">
        <button
          v-for="preset in roiPresets"
          :key="preset.id"
          :class="['preset-btn', { active: selectedPreset === preset.id }]"
          @click="selectedPreset = preset.id"
        >
          <span class="preset-icon">{{ preset.icon }}</span>
          <span class="preset-name">{{ preset.name }}</span>
        </button>
      </div>
    </div>
    
    <!-- OCR Section -->
    <div v-if="activeSection === 'ocr'" class="section">
      <h3 class="section-title">OCR 设置</h3>
      <div class="ocr-settings">
        <div class="setting-group">
          <label class="setting-label">OCR 引擎</label>
          <div class="engine-list">
            <button
              v-for="engine in ocrEngines"
              :key="engine.id"
              :class="['engine-btn', { active: selectedEngine === engine.id }]"
              @click="selectedEngine = engine.id"
            >
              <span class="engine-name">{{ engine.name }}</span>
              <span v-if="engine.recommended" class="engine-badge">推荐</span>
            </button>
          </div>
        </div>
        
        <div class="setting-group">
          <label class="setting-label">识别语言</label>
          <div class="lang-chips">
            <span class="chip active">中文</span>
            <span class="chip">英文</span>
            <span class="chip">日文</span>
            <span class="chip">韩文</span>
          </div>
        </div>
        
        <div class="setting-group">
          <label class="setting-label">置信度阈值</label>
          <input type="range" min="0" max="100" value="70" class="threshold-slider" />
          <span class="threshold-value">70%</span>
        </div>
      </div>
    </div>
  </aside>
</template>

<style lang="scss" scoped>
.side-panel {
  width: $sidebar-width;
  background: $bg-surface;
  border-right: 1px solid $border;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.section-tabs {
  display: flex;
  padding: $space-2;
  gap: $space-1;
  border-bottom: 1px solid $border;
  
  .tab {
    flex: 1;
    padding: $space-2;
    font-size: 16px;
    border-radius: $radius-md;
    opacity: 0.5;
    transition: all $transition-fast;
    
    &:hover {
      opacity: 0.8;
      background: $bg-overlay;
    }
    
    &.active {
      opacity: 1;
      background: $primary-dim;
    }
  }
}

.section {
  flex: 1;
  padding: $space-4;
  overflow-y: auto;
  @include custom-scrollbar;
}

.section-title {
  font-size: $text-sm;
  font-weight: 600;
  color: $text-secondary;
  margin-bottom: $space-4;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.empty-state {
  @include flex-center;
  flex-direction: column;
  padding: $space-8;
  border: 2px dashed $border;
  border-radius: $radius-lg;
  text-align: center;
  
  .empty-icon {
    font-size: 48px;
    margin-bottom: $space-3;
    opacity: 0.5;
  }
  
  .empty-text {
    font-size: $text-base;
    color: $text-secondary;
    margin-bottom: $space-2;
  }
  
  .empty-hint {
    font-size: $text-xs;
    color: $text-muted;
  }
}

.progress-area {
  @include flex-center;
  flex-direction: column;
  gap: $space-4;
}

.progress-ring {
  position: relative;
  width: 120px;
  height: 120px;
  
  svg {
    transform: rotate(-90deg);
  }
  
  .ring-bg {
    fill: none;
    stroke: $bg-overlay;
    stroke-width: 8;
  }
  
  .ring-fill {
    fill: none;
    stroke: $primary;
    stroke-width: 8;
    stroke-linecap: round;
    transition: stroke-dashoffset 0.3s ease;
  }
  
  .progress-text {
    position: absolute;
    inset: 0;
    @include flex-center;
    font-family: $font-display;
    font-size: $text-xl;
    font-weight: 600;
  }
}

.progress-info {
  text-align: center;
  
  .progress-label {
    display: block;
    font-size: $text-base;
    color: $text-primary;
    margin-bottom: $space-1;
  }
  
  .progress-detail {
    font-size: $text-sm;
    color: $text-muted;
  }
}

.roi-presets {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: $space-2;
}

.preset-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: $space-1;
  padding: $space-3;
  background: $bg-elevated;
  border: 1px solid $border;
  border-radius: $radius-md;
  transition: all $transition-fast;
  
  &:hover {
    border-color: $border-light;
    background: $bg-overlay;
  }
  
  &.active {
    border-color: $primary;
    background: $primary-dim;
  }
  
  .preset-icon {
    font-size: 24px;
  }
  
  .preset-name {
    font-size: $text-xs;
    color: $text-secondary;
  }
}

.ocr-settings {
  display: flex;
  flex-direction: column;
  gap: $space-5;
}

.setting-group {
  .setting-label {
    display: block;
    font-size: $text-sm;
    color: $text-secondary;
    margin-bottom: $space-2;
  }
}

.engine-list {
  display: flex;
  flex-direction: column;
  gap: $space-2;
}

.engine-btn {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: $space-3;
  background: $bg-elevated;
  border: 1px solid $border;
  border-radius: $radius-md;
  transition: all $transition-fast;
  
  &:hover {
    border-color: $border-light;
  }
  
  &.active {
    border-color: $primary;
    background: $primary-dim;
  }
  
  .engine-badge {
    font-size: $text-xs;
    padding: 2px 6px;
    background: $success;
    color: white;
    border-radius: $radius-sm;
  }
}

.lang-chips {
  display: flex;
  flex-wrap: wrap;
  gap: $space-2;
}

.chip {
  padding: $space-1 $space-3;
  background: $bg-elevated;
  border: 1px solid $border;
  border-radius: $radius-full;
  font-size: $text-sm;
  cursor: pointer;
  transition: all $transition-fast;
  
  &:hover {
    border-color: $border-light;
  }
  
  &.active {
    border-color: $primary;
    background: $primary-dim;
    color: $primary;
  }
}

.threshold-slider {
  width: 100%;
  height: 4px;
  appearance: none;
  background: $bg-overlay;
  border-radius: $radius-full;
  outline: none;
  
  &::-webkit-slider-thumb {
    appearance: none;
    width: 16px;
    height: 16px;
    background: $primary;
    border-radius: 50%;
    cursor: pointer;
    box-shadow: $shadow-glow-primary;
  }
}

.threshold-value {
  display: block;
  text-align: right;
  font-size: $text-sm;
  font-family: $font-display;
  color: $text-secondary;
  margin-top: $space-1;
}
</style>
