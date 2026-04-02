<script setup lang="ts">
import { ref, computed, inject } from 'vue'
import { useProjectStore } from '@/stores/project'
import { useSubtitleStore } from '@/stores/subtitle'
import { ROI_PRESETS, type OCREngine } from '@/types/video'
import type { ExportFormats } from '@/types/subtitle'

const projectStore = useProjectStore()
const subtitleStore = useSubtitleStore()

const openExportDialog = inject<() => void>('openExportDialog')

function handleExport(format: keyof ExportFormats) {
  subtitleStore.exportFormats[format] = !subtitleStore.exportFormats[format]
}

function openExport() {
  openExportDialog?.()
}

type TabKey = 'files' | 'progress' | 'roi' | 'ocr' | 'export'
const activeTab = ref<TabKey>('files')

const ocrEngines: { id: OCREngine; name: string; desc: string; recommended: boolean }[] = [
  { id: 'paddle', name: 'PaddleOCR', desc: '速度最快·精度高', recommended: true },
  { id: 'easyocr', name: 'EasyOCR', desc: '多语言支持', recommended: false },
  { id: 'tesseract', name: 'Tesseract.js', desc: 'WASM 无需后端', recommended: false },
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
const extractStartTime = ref<number>(0)

const extractSpeed = computed(() => {
  if (!isExtracting.value || subtitleStore.extractProgress === 0 || extractStartTime.value === 0) return 0
  const elapsed = (Date.now() / 1000) - extractStartTime.value
  if (elapsed <= 0) return 0
  return Math.round(subtitleStore.currentExtractFrame / elapsed)
})

function toggleLanguage(id: string) {
  const idx = selectedLanguages.value.indexOf(id)
  if (idx === -1) {
    selectedLanguages.value.push(id)
  } else {
    if (selectedLanguages.value.length > 1) {
      selectedLanguages.value.splice(idx, 1)
    }
  }
  projectStore.setLanguages([...selectedLanguages.value])
}

function handleStartExtraction() {
  if (!projectStore.hasVideo) return
  extractStartTime.value = Date.now() / 1000
  subtitleStore.startExtraction()
}

function handleStopExtraction() {
  subtitleStore.finishExtraction()
}

// SVG progress ring constants
const RADIUS = 42
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

const progressOffset = computed(() => {
  return CIRCUMFERENCE - (CIRCUMFERENCE * subtitleStore.extractProgress) / 100
})

const formatDescriptions: Record<keyof ExportFormats, string> = {
  srt: '通用字幕格式',
  vtt: '网页视频字幕',
  ass: '高级字幕样式',
  ssa: 'SubStation Alpha',
  json: '含帧对应数据',
  txt: '纯文本',
  lrc: '歌词同步格式',
  sbv: 'YouTube字幕',
  csv: '表格数据'
}
</script>

<template>
  <aside class="side-panel">
    <!-- Tab Bar -->
    <div class="tab-bar">
      <button
        v-for="tab in [
          { key: 'files', icon: 'file', label: '文件' },
          { key: 'progress', icon: 'chart', label: '进度' },
          { key: 'roi', icon: 'crop', label: '区域' },
          { key: 'ocr', icon: 'ocr', label: 'OCR' },
        ] as const"
        :key="tab.key"
        :class="['tab-item', { active: activeTab === tab.key }]"
        @click="activeTab = tab.key"
      >
        <!-- File icon -->
        <svg v-if="tab.icon === 'file'" class="tab-icon" viewBox="0 0 20 20" fill="none">
          <path d="M4 3h8l4 4v10a1 1 0 01-1 1H4a1 1 0 01-1-1V4a1 1 0 011-1z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>
          <path d="M12 3v4h4" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>
        </svg>
        <!-- Chart icon -->
        <svg v-if="tab.icon === 'chart'" class="tab-icon" viewBox="0 0 20 20" fill="none">
          <path d="M3 17V7m0 4V5m0 8V9m4-5V7m0 6V3m0 10V9m4-6V5m0 8V7m4-4V3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
        <!-- Crop icon -->
        <svg v-if="tab.icon === 'crop'" class="tab-icon" viewBox="0 0 20 20" fill="none">
          <path d="M6 3v11a1 1 0 001 1h11" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
          <path d="M3 6h11a1 1 0 011 1v11" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
        </svg>
        <!-- OCR icon -->
        <svg v-if="tab.icon === 'ocr'" class="tab-icon" viewBox="0 0 20 20" fill="none">
          <rect x="3" y="4" width="14" height="12" rx="2" stroke="currentColor" stroke-width="1.4"/>
          <path d="M7 8h6M7 12h4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
        </svg>
        <span class="tab-label">{{ tab.label }}</span>
      </button>
    </div>

    <!-- ── Files Tab ─────────────────────────────────────── -->
    <div v-if="activeTab === 'files'" class="tab-content">
      <div class="section">
        <div class="section-header">
          <span class="section-title">当前视频</span>
        </div>

        <div v-if="projectStore.hasVideo" class="video-card">
          <!-- File icon -->
          <div class="video-icon">
            <svg viewBox="0 0 40 40" fill="none">
              <rect x="4" y="8" width="32" height="24" rx="4" fill="rgba(10,132,255,0.1)" stroke="currentColor" stroke-width="1.5"/>
              <path d="M14 15l8 5-8 5V15z" fill="currentColor" opacity="0.7"/>
              <rect x="8" y="28" width="10" height="3" rx="1.5" fill="currentColor" opacity="0.2"/>
              <rect x="20" y="28" width="12" height="3" rx="1.5" fill="currentColor" opacity="0.2"/>
            </svg>
          </div>

          <div class="video-meta">
            <div class="meta-row">
              <span class="meta-label">文件名</span>
              <span class="meta-value truncate">{{ projectStore.videoPath?.split('/').pop() ?? '-' }}</span>
            </div>
            <div class="meta-row">
              <span class="meta-label">分辨率</span>
              <span class="meta-value">{{ projectStore.videoMeta?.width }} × {{ projectStore.videoMeta?.height }}</span>
            </div>
            <div class="meta-row">
              <span class="meta-label">时长</span>
              <span class="meta-value">{{ projectStore.duration.toFixed(1) }}s</span>
            </div>
            <div class="meta-row">
              <span class="meta-label">帧率</span>
              <span class="meta-value">{{ projectStore.videoMeta?.fps }} fps</span>
            </div>
            <div class="meta-row">
              <span class="meta-label">总帧数</span>
              <span class="meta-value">{{ projectStore.videoMeta?.totalFrames?.toLocaleString() }}</span>
            </div>
          </div>
        </div>

        <div v-else class="empty-card">
          <svg class="empty-icon" viewBox="0 0 48 48" fill="none">
            <circle cx="24" cy="24" r="20" stroke="currentColor" stroke-width="1.5" stroke-dasharray="3 3"/>
            <path d="M20 18h8m-4 4v8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
          <p class="empty-text">未加载视频</p>
        </div>
      </div>
    </div>

    <!-- ── Progress Tab ──────────────────────────────────── -->
    <div v-if="activeTab === 'progress'" class="tab-content">
      <div class="section">
        <div class="section-header">
          <span class="section-title">处理进度</span>
          <span v-if="isExtracting" class="extracting-badge">
            <span class="pulse-dot"/>
            提取中
          </span>
        </div>

        <!-- SVG Progress Ring -->
        <div class="progress-ring-wrapper">
          <svg class="progress-ring" viewBox="0 0 100 100">
            <!-- Glow effect -->
            <circle
              cx="50" cy="50" r="42"
              fill="none"
              stroke="rgba(10,132,255,0.08)"
              stroke-width="8"
            />
            <!-- Track -->
            <circle
              class="ring-track"
              cx="50" cy="50" r="42"
              fill="none"
              stroke-width="6"
            />
            <!-- Progress -->
            <circle
              class="ring-progress"
              cx="50" cy="50" r="42"
              fill="none"
              stroke-width="6"
              stroke-linecap="round"
              :stroke-dasharray="CIRCUMFERENCE"
              :stroke-dashoffset="progressOffset"
            />
          </svg>
          <div class="ring-center">
            <span class="ring-percent">{{ Math.round(subtitleStore.extractProgress) }}</span>
            <span class="ring-unit">%</span>
          </div>
        </div>

        <!-- Stats grid -->
        <div class="stats-grid">
          <div class="stat-card">
            <span class="stat-value">{{ subtitleStore.currentExtractFrame.toLocaleString() }}</span>
            <span class="stat-label">已处理帧</span>
          </div>
          <div class="stat-card">
            <span class="stat-value">{{ subtitleStore.totalCount }}</span>
            <span class="stat-label">字幕条数</span>
          </div>
          <div class="stat-card">
            <span class="stat-value">{{ extractSpeed || '-' }}</span>
            <span class="stat-label">帧/秒</span>
          </div>
          <div class="stat-card">
            <span class="stat-value" :class="subtitleStore.extractProgress > 0 ? 'text-success' : ''">
              {{ subtitleStore.extractProgress > 0 ? Math.ceil((100 - subtitleStore.extractProgress) / Math.max(subtitleStore.extractProgress, 1) * (Date.now() / 1000 - extractStartTime)) + 's' : '-' }}
            </span>
            <span class="stat-label">预计剩余</span>
          </div>
        </div>

        <!-- Action button -->
        <button
          v-if="!isExtracting"
          class="action-btn action-btn--primary"
          :disabled="!projectStore.hasVideo"
          @click="handleStartExtraction"
        >
          <svg class="btn-icon" viewBox="0 0 20 20" fill="none">
            <path d="M6 4l10 6-10 6V4z" fill="currentColor"/>
          </svg>
          开始提取
        </button>
        <button
          v-else
          class="action-btn action-btn--danger"
          @click="handleStopExtraction"
        >
          <svg class="btn-icon" viewBox="0 0 20 20" fill="none">
            <rect x="4" y="4" width="5" height="12" rx="1" fill="currentColor"/>
            <rect x="11" y="4" width="5" height="12" rx="1" fill="currentColor"/>
          </svg>
          停止提取
        </button>
      </div>
    </div>

    <!-- ── ROI Tab ──────────────────────────────────────── -->
    <div v-if="activeTab === 'roi'" class="tab-content">
      <div class="section">
        <div class="section-header">
          <span class="section-title">字幕区域预设</span>
        </div>

        <div class="roi-cards">
          <button
            v-for="preset in ROI_PRESETS"
            :key="preset.id"
            :class="['roi-card', { active: projectStore.selectedROI?.id === preset.id }]"
            @click="projectStore.selectROIPreset(preset.id)"
          >
            <!-- ROI preview illustration -->
            <div class="roi-preview">
              <div
                class="roi-zone"
                :style="{
                  top: preset.rect.y + '%',
                  left: preset.rect.x + '%',
                  width: preset.rect.width + '%',
                  height: preset.rect.height + '%',
                }"
              />
            </div>
            <span class="roi-name">{{ preset.name }}</span>
            <span class="roi-check">
              <svg v-if="projectStore.selectedROI?.id === preset.id" viewBox="0 0 12 12" fill="none">
                <path d="M2 6l3 3 5-5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </span>
          </button>
        </div>
      </div>

      <div class="section" v-if="projectStore.selectedROI">
        <div class="section-header">
          <span class="section-title">当前区域详情</span>
        </div>
        <div class="roi-detail-card">
          <div class="detail-row">
            <span class="detail-label">类型</span>
            <span class="detail-value">{{ projectStore.selectedROI.type }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">坐标</span>
            <span class="detail-value">X {{ projectStore.selectedROI.x.toFixed(1) }}% · Y {{ projectStore.selectedROI.y.toFixed(1) }}%</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">尺寸</span>
            <span class="detail-value">W {{ projectStore.selectedROI.width.toFixed(1) }}% · H {{ projectStore.selectedROI.height.toFixed(1) }}%</span>
          </div>
        </div>
      </div>
    </div>

    <!-- ── OCR Tab ───────────────────────────────────────── -->
    <div v-if="activeTab === 'ocr'" class="tab-content">
      <div class="section">
        <div class="section-header">
          <span class="section-title">OCR 引擎</span>
        </div>
        <div class="engine-list">
          <button
            v-for="engine in ocrEngines"
            :key="engine.id"
            :class="['engine-card', { active: projectStore.extractOptions.ocrEngine === engine.id }]"
            @click="projectStore.setOCREngine(engine.id)"
          >
            <div class="engine-info">
              <span class="engine-name">{{ engine.name }}</span>
              <span class="engine-desc">{{ engine.desc }}</span>
            </div>
            <div class="engine-right">
              <span v-if="engine.recommended" class="rec-badge">推荐</span>
              <div class="engine-check">
                <svg v-if="projectStore.extractOptions.ocrEngine === engine.id" viewBox="0 0 16 16" fill="none">
                  <path d="M3 8l4 4 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </div>
            </div>
          </button>
        </div>
      </div>

      <div class="section">
        <div class="section-header">
          <span class="section-title">识别语言</span>
          <span class="lang-count">{{ selectedLanguages.length }} 种</span>
        </div>
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
        <div class="section-header">
          <span class="section-title">置信度阈值</span>
          <span class="threshold-value">{{ confidenceThreshold }}%</span>
        </div>
        <div class="slider-track">
          <div class="slider-fill" :style="{ width: confidenceThreshold + '%' }"/>
          <input
            type="range"
            v-model="confidenceThreshold"
            min="0"
            max="100"
            class="slider"
          />
        </div>
        <div class="slider-labels">
          <span>0%</span>
          <span>50%</span>
          <span>100%</span>
        </div>
      </div>
    </div>

    <!-- ── Export Tab ────────────────────────────────────── -->
    <div v-if="activeTab === 'export'" class="tab-content">
      <div class="section">
        <div class="section-header">
          <span class="section-title">导出格式</span>
        </div>
        <div class="export-list">
          <button
            v-for="format in (Object.keys(subtitleStore.exportFormats) as (keyof ExportFormats)[])"
            :key="format"
            :class="['export-card', { selected: !!subtitleStore.exportFormats[format] }]"
            @click="handleExport(format)"
          >
            <div class="export-left">
              <div class="export-check">
                <svg v-if="subtitleStore.exportFormats[format]" viewBox="0 0 12 12" fill="none">
                  <path d="M2 6l3 3 5-5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </div>
              <div class="export-info">
                <span class="export-name">{{ format.toUpperCase() }}</span>
                <span class="export-desc">{{ formatDescriptions[format] ?? '' }}</span>
              </div>
            </div>
            <div class="export-badge" v-if="subtitleStore.exportFormats[format]">
              <svg viewBox="0 0 12 12" fill="none">
                <path d="M6 1v6m0 0l-3-3m3 3l3-3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
          </button>
        </div>
        <button class="export-action-btn" @click="openExport">
          <svg class="export-btn-icon" viewBox="0 0 20 20" fill="none">
            <path d="M3 14v3h14v-3M10 3v10m0-10L6 7m4-4l4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          导出字幕文件
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

// ── Tab Bar ─────────────────────────────────────────────────
.tab-bar {
  display: flex;
  padding: $space-2;
  gap: $space-1;
  border-bottom: 1px solid $border;
  animation: fade-up 0.3s ease-out both;
}

.tab-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: $space-2 $space-1;
  border-radius: $radius-md;
  color: $text-muted;
  transition: all $transition-base;

  &:hover {
    color: $text-secondary;
    background: $bg-overlay;
  }

  &.active {
    color: $primary;
    background: rgba($primary, 0.1);

    .tab-icon {
      filter: drop-shadow(0 0 4px rgba($primary, 0.4));
    }
  }

  .tab-icon {
    width: 18px;
    height: 18px;
    transition: filter $transition-base;
  }

  .tab-label {
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.02em;
  }
}

// ── Content ─────────────────────────────────────────────────
.tab-content {
  flex: 1;
  overflow-y: auto;
  padding: $space-4;
  @include custom-scrollbar;
  animation: fade-up 0.3s ease-out both;
}

.section {
  margin-bottom: $space-6;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: $space-3;
}

.section-title {
  font-size: $text-xs;
  font-weight: 700;
  color: $text-muted;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

// ── Video Card ────────────────────────────────────────────────
.video-card {
  background: $bg-elevated;
  border: 1px solid $border;
  border-radius: $radius-lg;
  padding: $space-4;
  animation: fade-up 0.3s 0.05s ease-out both;
}

.video-icon {
  display: flex;
  justify-content: center;
  margin-bottom: $space-4;

  svg {
    width: 48px;
    height: 48px;
    color: $primary;
    opacity: 0.7;
  }
}

.video-meta {
  display: flex;
  flex-direction: column;
  gap: $space-2;
}

.meta-row {
  display: flex;
  justify-content: space-between;
  align-items: center;

  .meta-label {
    font-size: $text-xs;
    color: $text-muted;
  }

  .meta-value {
    font-size: $text-sm;
    font-weight: 500;
    color: $text-secondary;

    &.truncate {
      max-width: 130px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }
}

// ── Empty Card ──────────────────────────────────────────────
.empty-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: $space-8 $space-4;
  background: $bg-elevated;
  border: 1.5px dashed $border;
  border-radius: $radius-lg;
  animation: fade-up 0.3s 0.05s ease-out both;

  .empty-icon {
    width: 48px;
    height: 48px;
    color: $text-muted;
    margin-bottom: $space-3;
    opacity: 0.5;
  }

  .empty-text {
    font-size: $text-sm;
    color: $text-muted;
  }
}

// ── Progress Ring ───────────────────────────────────────────
.progress-ring-wrapper {
  position: relative;
  width: 140px;
  height: 140px;
  margin: 0 auto $space-5;
  animation: fade-up 0.3s 0.05s ease-out both;
}

.progress-ring {
  width: 140px;
  height: 140px;
  transform: rotate(-90deg);

  .ring-track {
    stroke: $bg-overlay;
  }

  .ring-progress {
    stroke: $primary;
    filter: drop-shadow(0 0 6px rgba($primary, 0.5));
    transition: stroke-dashoffset 0.4s ease;
  }
}

.ring-center {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1px;

  .ring-percent {
    font-family: $font-display;
    font-size: 32px;
    font-weight: 800;
    color: $text-primary;
    line-height: 1;
  }

  .ring-unit {
    font-family: $font-display;
    font-size: $text-base;
    font-weight: 600;
    color: $text-muted;
    align-self: flex-end;
    margin-bottom: 4px;
  }
}

// ── Stats Grid ──────────────────────────────────────────────
.stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: $space-2;
  margin-bottom: $space-4;
}

.stat-card {
  background: $bg-elevated;
  border: 1px solid $border;
  border-radius: $radius-md;
  padding: $space-3;
  text-align: center;
  transition: border-color $transition-fast;

  &:hover {
    border-color: $border-light;
  }

  .stat-value {
    display: block;
    font-family: $font-display;
    font-size: $text-lg;
    font-weight: 700;
    color: $text-primary;
    margin-bottom: 2px;

    &.text-success { color: $success; }
  }

  .stat-label {
    font-size: 10px;
    color: $text-muted;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
}

// ── Action Button ────────────────────────────────────────────
.action-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: $space-2;
  padding: 12px;
  font-weight: 700;
  font-size: $text-base;
  border-radius: $radius-lg;
  transition: all $transition-base;

  .btn-icon {
    width: 18px;
    height: 18px;
  }

  &--primary {
    background: linear-gradient(135deg, $primary, lighten($primary, 8%));
    color: #fff;
    box-shadow: 0 4px 16px rgba($primary, 0.35);

    &:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 8px 24px rgba($primary, 0.45);
    }

    &:active:not(:disabled) {
      transform: translateY(0) scale(0.98);
    }

    &:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
  }

  &--danger {
    background: $bg-elevated;
    border: 1.5px solid rgba($error, 0.3);
    color: $error;

    &:hover {
      background: rgba($error, 0.08);
      border-color: rgba($error, 0.5);
    }
  }
}

// ── Extracting Badge ────────────────────────────────────────
.extracting-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 10px;
  font-weight: 600;
  color: $success;
  background: rgba($success, 0.1);
  padding: 3px 8px;
  border-radius: $radius-full;
}

.pulse-dot {
  width: 6px;
  height: 6px;
  background: $success;
  border-radius: 50%;
  animation: pulse-anim 1.5s ease-in-out infinite;
}

// ── ROI Cards ───────────────────────────────────────────────
.roi-cards {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: $space-2;
}

.roi-card {
  position: relative;
  background: $bg-elevated;
  border: 1.5px solid $border;
  border-radius: $radius-lg;
  padding: $space-3;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: $space-2;
  transition: all $transition-base;
  animation: card-enter 0.3s ease-out both;

  &:hover {
    border-color: $border-light;
    transform: translateY(-1px);
  }

  &.active {
    border-color: $primary;
    background: rgba($primary, 0.05);
    box-shadow: 0 0 0 1px rgba($primary, 0.1);
  }

  .roi-preview {
    width: 100%;
    height: 40px;
    background: $bg-overlay;
    border-radius: $radius-sm;
    position: relative;
    overflow: hidden;
  }

  .roi-zone {
    position: absolute;
    background: rgba($primary, 0.5);
    border: 1px solid rgba($primary, 0.8);
    border-radius: 2px;
  }

  .roi-name {
    font-size: $text-xs;
    font-weight: 600;
    color: $text-secondary;
  }

  .roi-check {
    position: absolute;
    top: 6px;
    right: 6px;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: $primary;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;

    svg { width: 10px; height: 10px; }
  }
}

// ── ROI Detail ───────────────────────────────────────────────
.roi-detail-card {
  background: $bg-elevated;
  border: 1px solid $border;
  border-radius: $radius-md;
  padding: $space-3;
  display: flex;
  flex-direction: column;
  gap: $space-2;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;

  .detail-label {
    font-size: $text-xs;
    color: $text-muted;
  }

  .detail-value {
    font-size: $text-xs;
    font-weight: 600;
    color: $text-secondary;
    font-family: $font-display;
  }
}

// ── Engine List ─────────────────────────────────────────────
.engine-list {
  display: flex;
  flex-direction: column;
  gap: $space-2;
}

.engine-card {
  background: $bg-elevated;
  border: 1.5px solid $border;
  border-radius: $radius-lg;
  padding: $space-3;
  display: flex;
  align-items: center;
  justify-content: space-between;
  transition: all $transition-base;
  animation: card-enter 0.3s ease-out both;

  &:hover {
    border-color: $border-light;
  }

  &.active {
    border-color: $primary;
    background: rgba($primary, 0.04);
  }
}

.engine-info {
  display: flex;
  flex-direction: column;
  gap: 2px;

  .engine-name {
    font-size: $text-sm;
    font-weight: 600;
    color: $text-primary;
  }

  .engine-desc {
    font-size: 10px;
    color: $text-muted;
  }
}

.engine-right {
  display: flex;
  align-items: center;
  gap: $space-2;
}

.rec-badge {
  font-size: 10px;
  font-weight: 700;
  background: rgba($success, 0.12);
  color: $success;
  padding: 2px 6px;
  border-radius: $radius-sm;
  border: 1px solid rgba($success, 0.2);
}

.engine-check {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 1.5px solid $border;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all $transition-fast;

  svg {
    width: 12px;
    height: 12px;
    color: #fff;
  }

  .engine-card.active & {
    background: $primary;
    border-color: $primary;
  }
}

// ── Language Chips ───────────────────────────────────────────
.lang-count {
  font-size: 10px;
  color: $text-muted;
  background: $bg-overlay;
  padding: 2px 6px;
  border-radius: $radius-full;
}

.lang-chips {
  display: flex;
  flex-wrap: wrap;
  gap: $space-2;
}

.lang-chip {
  padding: $space-1 $space-3;
  background: $bg-elevated;
  border: 1.5px solid $border;
  border-radius: $radius-full;
  font-size: $text-sm;
  font-weight: 500;
  color: $text-secondary;
  transition: all $transition-base;

  &:hover {
    border-color: $border-light;
    color: $text-primary;
  }

  &.active {
    border-color: $primary;
    background: rgba($primary, 0.1);
    color: $primary;
  }
}

// ── Slider ────────────────────────────────────────────────────
.threshold-value {
  font-family: $font-display;
  font-size: $text-sm;
  font-weight: 700;
  color: $primary;
}

.slider-track {
  position: relative;
  height: 6px;
  background: $bg-overlay;
  border-radius: $radius-full;
  margin-bottom: $space-2;

  .slider-fill {
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    background: linear-gradient(90deg, $primary, $accent);
    border-radius: $radius-full;
    pointer-events: none;
    transition: width 0.1s;
  }

  .slider {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    opacity: 0;
    cursor: pointer;
  }
}

.slider-labels {
  display: flex;
  justify-content: space-between;
  font-size: 10px;
  color: $text-muted;
}

// ── Export ───────────────────────────────────────────────────
.export-list {
  display: flex;
  flex-direction: column;
  gap: $space-2;
  margin-bottom: $space-4;
}

.export-card {
  background: $bg-elevated;
  border: 1.5px solid $border;
  border-radius: $radius-lg;
  padding: $space-3;
  display: flex;
  align-items: center;
  justify-content: space-between;
  transition: all $transition-base;
  animation: card-enter 0.3s ease-out both;

  &:hover {
    border-color: $border-light;
  }

  &.selected {
    border-color: $primary;
    background: rgba($primary, 0.04);
  }
}

.export-left {
  display: flex;
  align-items: center;
  gap: $space-3;
}

.export-check {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 1.5px solid $border;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all $transition-fast;

  svg { width: 12px; height: 12px; color: #fff; }

  .export-card.selected & {
    background: $primary;
    border-color: $primary;
  }
}

.export-info {
  display: flex;
  flex-direction: column;
  gap: 1px;

  .export-name {
    font-family: $font-display;
    font-size: $text-sm;
    font-weight: 600;
    color: $text-primary;
  }

  .export-desc {
    font-size: 10px;
    color: $text-muted;
  }
}

.export-badge {
  color: $primary;
  opacity: 0.7;

  svg {
    width: 14px;
    height: 14px;
  }
}

.export-action-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: $space-2;
  padding: 12px;
  background: $bg-elevated;
  border: 1.5px solid $border;
  border-radius: $radius-lg;
  font-weight: 700;
  font-size: $text-base;
  color: $text-primary;
  transition: all $transition-base;

  &:hover {
    border-color: $primary;
    background: rgba($primary, 0.05);
    color: $primary;
  }

  .export-btn-icon {
    width: 18px;
    height: 18px;
  }
}

// ── Animations ─────────────────────────────────────────────
@keyframes fade-up {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes card-enter {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes pulse-anim {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(0.8); }
}
</style>
