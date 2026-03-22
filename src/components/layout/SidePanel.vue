<script setup lang="ts">
import { ref, computed, inject } from 'vue'
import { useProjectStore } from '@/stores/project'
import { useSubtitleStore } from '@/stores/subtitle'
import { ROI_PRESETS, type OCREngine } from '@/types/video'

const projectStore = useProjectStore()
const subtitleStore = useSubtitleStore()

// Inject export dialog opener from App.vue
const openExportDialog = inject<() => void>('openExportDialog')

// Override handleExport to open dialog instead of just logging
function handleExport(format: keyof typeof subtitleStore.exportFormats) {
  // Toggle format selection
  subtitleStore.exportFormats[format] = !subtitleStore.exportFormats[format]
}

function openExport() {
  if (openExportDialog) {
    openExportDialog()
  }
}

type TabKey = 'files' | 'progress' | 'roi' | 'ocr' | 'export'
const activeTab = ref<TabKey>('files')

const ocrEngines: { id: OCREngine; name: string; recommended: boolean }[] = [
  { id: 'paddle', name: 'PaddleOCR', recommended: true },
  { id: 'easyocr', name: 'EasyOCR', recommended: false },
  { id: 'tesseract', name: 'Tesseract.js', recommended: false },
]

const languages = [
  { id: 'ch', name: '中文', selected: true },
  { id: 'en', name: '英文', selected: false },
  { id: 'ja', name: '日文', selected: false },
  { id: 'ko', name: '韩文', selected: false },
]

const selectedLanguages = ref<string[]>(['ch'])
const confidenceThreshold = ref(70)

const isExtracting = computed(() => subtitleStore.isExtracting)

function toggleLanguage(id: string) {
  const idx = selectedLanguages.value.indexOf(id)
  if (idx === -1) {
    selectedLanguages.value.push(id)
  } else {
    selectedLanguages.value.splice(idx, 1)
  }
  projectStore.setLanguages([...selectedLanguages.value])
}

function handleStartExtraction() {
  if (!projectStore.hasVideo) return
  subtitleStore.startExtraction()
}

function handleStopExtraction() {
  subtitleStore.finishExtraction()
}
</script>

<template>
  <aside class="side-panel">
    <!-- Tabs -->
    <div class="tabs">
      <button
        v-for="tab in [
          { key: 'files', icon: '📁', label: '文件' },
          { key: 'progress', icon: '📊', label: '进度' },
          { key: 'roi', icon: '🎯', label: '区域' },
          { key: 'ocr', icon: '🔧', label: 'OCR' },
        ] as const"
        :key="tab.key"
        :class="['tab', { active: activeTab === tab.key }]"
        @click="activeTab = tab.key"
      >
        <span class="tab-icon">{{ tab.icon }}</span>
        <span class="tab-label">{{ tab.label }}</span>
      </button>
    </div>

    <!-- Files Tab -->
    <div v-if="activeTab === 'files'" class="tab-content">
      <div class="section">
        <h4 class="section-title">当前视频</h4>
        <div v-if="projectStore.hasVideo" class="video-info">
          <div class="info-row">
            <span class="info-label">文件:</span>
            <span class="info-value truncate">{{ projectStore.videoPath }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">分辨率:</span>
            <span class="info-value">{{ projectStore.videoMeta?.width }} × {{ projectStore.videoMeta?.height }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">时长:</span>
            <span class="info-value">{{ projectStore.duration.toFixed(1) }}s</span>
          </div>
          <div class="info-row">
            <span class="info-label">FPS:</span>
            <span class="info-value">{{ projectStore.videoMeta?.fps }}</span>
          </div>
        </div>
        <div v-else class="empty-state">
          <span class="empty-icon">📂</span>
          <p>未加载视频</p>
        </div>
      </div>
    </div>

    <!-- Progress Tab -->
    <div v-if="activeTab === 'progress'" class="tab-content">
      <div class="section">
        <h4 class="section-title">处理进度</h4>
        <div class="progress-display">
          <div class="progress-ring">
            <svg viewBox="0 0 100 100">
              <circle class="ring-bg" cx="50" cy="50" r="45" />
              <circle 
                class="ring-fill" 
                cx="50" 
                cy="50" 
                r="45"
                :stroke-dasharray="283"
                :stroke-dashoffset="283 - (283 * subtitleStore.extractProgress) / 100"
              />
            </svg>
            <span class="progress-text">{{ Math.round(subtitleStore.extractProgress) }}%</span>
          </div>
          
          <div class="progress-info">
            <div class="progress-stat">
              <span class="stat-label">已处理帧</span>
              <span class="stat-value">{{ subtitleStore.currentExtractFrame }}</span>
            </div>
            <div class="progress-stat">
              <span class="stat-label">检测字幕</span>
              <span class="stat-value">{{ subtitleStore.totalCount }}</span>
            </div>
          </div>
        </div>

        <div class="progress-actions">
          <button 
            v-if="!isExtracting"
            class="btn btn-primary"
            :disabled="!projectStore.hasVideo"
            @click="handleStartExtraction"
          >
            ▶️ 开始提取
          </button>
          <button 
            v-else
            class="btn btn-danger"
            @click="handleStopExtraction"
          >
            ⏹️ 停止
          </button>
        </div>
      </div>
    </div>

    <!-- ROI Tab -->
    <div v-if="activeTab === 'roi'" class="tab-content">
      <div class="section">
        <h4 class="section-title">字幕区域预设</h4>
        <div class="roi-grid">
          <button
            v-for="preset in ROI_PRESETS"
            :key="preset.id"
            :class="['roi-btn', { active: projectStore.selectedROI?.id === preset.id }]"
            @click="projectStore.selectROIPreset(preset.id)"
          >
            <span class="roi-icon">{{ preset.icon }}</span>
            <span class="roi-name">{{ preset.name }}</span>
          </button>
        </div>
      </div>

      <div class="section">
        <h4 class="section-title">当前区域</h4>
        <div v-if="projectStore.selectedROI" class="roi-info">
          <div class="info-row">
            <span class="info-label">类型:</span>
            <span class="info-value">{{ projectStore.selectedROI.type }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">位置:</span>
            <span class="info-value">
              X: {{ projectStore.selectedROI.x.toFixed(1) }}%
              Y: {{ projectStore.selectedROI.y.toFixed(1) }}%
            </span>
          </div>
          <div class="info-row">
            <span class="info-label">尺寸:</span>
            <span class="info-value">
              W: {{ projectStore.selectedROI.width.toFixed(1) }}%
              H: {{ projectStore.selectedROI.height.toFixed(1) }}%
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- OCR Tab -->
    <div v-if="activeTab === 'ocr'" class="tab-content">
      <div class="section">
        <h4 class="section-title">OCR 引擎</h4>
        <div class="engine-list">
          <button
            v-for="engine in ocrEngines"
            :key="engine.id"
            :class="['engine-btn', { active: projectStore.extractOptions.ocrEngine === engine.id }]"
            @click="projectStore.setOCREngine(engine.id)"
          >
            <span class="engine-name">{{ engine.name }}</span>
            <span v-if="engine.recommended" class="engine-badge">推荐</span>
          </button>
        </div>
      </div>

      <div class="section">
        <h4 class="section-title">识别语言</h4>
        <div class="lang-chips">
          <button
            v-for="lang in languages"
            :key="lang.id"
            :class="['lang-chip', { active: selectedLanguages.includes(lang.id) }]"
            @click="toggleLanguage(lang.id)"
          >
            {{ lang.name }}
          </button>
        </div>
      </div>

      <div class="section">
        <h4 class="section-title">置信度阈值</h4>
        <div class="slider-group">
          <input
            type="range"
            v-model="confidenceThreshold"
            min="0"
            max="100"
            class="slider"
          />
          <span class="slider-value">{{ confidenceThreshold }}%</span>
        </div>
      </div>
    </div>

    <!-- Export Tab -->
    <div v-if="activeTab === 'export'" class="tab-content">
      <div class="section">
        <h4 class="section-title">导出格式</h4>
        <div class="export-list">
          <button
            v-for="format in (Object.keys(subtitleStore.exportFormats) as Array<keyof typeof subtitleStore.exportFormats>)"
            :key="format"
            class="export-btn"
            :class="{ selected: subtitleStore.exportFormats[format] }"
            @click="handleExport(format)"
          >
            <span class="export-name">{{ format.toUpperCase() }}</span>
            <span class="export-desc">
              {{ format === 'srt' ? '标准字幕' :
                 format === 'vtt' ? 'Web视频' :
                 format === 'json' ? '含帧信息' : '纯文本' }}
            </span>
          </button>
        </div>
        <button class="export-action-btn" @click="openExport">
          📤 导出字幕
        </button>
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

.tabs {
  display: flex;
  padding: $space-2;
  gap: $space-1;
  border-bottom: 1px solid $border;
}

.tab {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: $space-2;
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
  
  .tab-icon {
    font-size: 16px;
  }
  
  .tab-label {
    font-size: $text-xs;
  }
}

.tab-content {
  flex: 1;
  overflow-y: auto;
  padding: $space-4;
  @include custom-scrollbar;
}

.section {
  margin-bottom: $space-6;
}

.section-title {
  font-size: $text-sm;
  font-weight: 600;
  color: $text-secondary;
  margin-bottom: $space-3;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.empty-state {
  @include flex-center;
  flex-direction: column;
  gap: $space-2;
  padding: $space-6;
  background: $bg-elevated;
  border-radius: $radius-md;
  color: $text-muted;
  
  .empty-icon {
    font-size: 32px;
    opacity: 0.5;
  }
}

.video-info,
.roi-info {
  background: $bg-elevated;
  border-radius: $radius-md;
  padding: $space-3;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: $space-1 0;
  
  .info-label {
    font-size: $text-sm;
    color: $text-muted;
  }
  
  .info-value {
    font-size: $text-sm;
    color: $text-primary;
    
    &.truncate {
      max-width: 150px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }
}

.progress-display {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: $space-4;
  margin-bottom: $space-4;
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
  display: flex;
  gap: $space-6;
}

.progress-stat {
  text-align: center;
  
  .stat-label {
    display: block;
    font-size: $text-xs;
    color: $text-muted;
    margin-bottom: $space-1;
  }
  
  .stat-value {
    font-family: $font-display;
    font-size: $text-lg;
    font-weight: 600;
    color: $text-primary;
  }
}

.progress-actions {
  .btn {
    width: 100%;
    padding: $space-3;
    font-weight: 600;
    border-radius: $radius-md;
    transition: all $transition-fast;
    
    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }
  
  .btn-primary {
    background: linear-gradient(135deg, $primary, $accent);
    color: white;
    
    &:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: $shadow-glow-primary;
    }
  }
  
  .btn-danger {
    background: $error;
    color: white;
    
    &:hover {
      background: darken($error, 10%);
    }
  }
}

.roi-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: $space-2;
}

.roi-btn {
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
  
  .roi-icon {
    font-size: 24px;
  }
  
  .roi-name {
    font-size: $text-xs;
    color: $text-secondary;
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

.lang-chip {
  padding: $space-1 $space-3;
  background: $bg-elevated;
  border: 1px solid $border;
  border-radius: $radius-full;
  font-size: $text-sm;
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

.slider-group {
  display: flex;
  align-items: center;
  gap: $space-3;
}

.slider {
  flex: 1;
  height: 4px;
  appearance: none;
  background: $bg-overlay;
  border-radius: $radius-full;
  
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

.slider-value {
  font-family: $font-display;
  font-size: $text-sm;
  color: $text-secondary;
  min-width: 40px;
  text-align: right;
}

.export-list {
  display: flex;
  flex-direction: column;
  gap: $space-2;
}

.export-btn {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: $space-3;
  background: $bg-elevated;
  border: 1px solid $border;
  border-radius: $radius-md;
  transition: all $transition-fast;
  
  &:hover {
    border-color: $primary;
    background: $primary-dim;
  }
  
  .export-name {
    font-family: $font-display;
    font-weight: 600;
    color: $text-primary;
  }
  
  .export-desc {
    font-size: $text-xs;
    color: $text-muted;
  }
}
</style>
