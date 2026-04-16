<script setup lang="ts">
import { ref, computed } from 'vue'
import { useBatchProcessor, type BatchJob, type BatchOptions } from '@/composables/useBatchProcessor'

const {
  jobs,
  isProcessing,
  overallProgress,
  estimatedTimeRemaining,
  addToQueue,
  startBatch,
  cancelBatch,
  clearCompleted,
  removeJob,
  retryJob,
  stats
} = useBatchProcessor()

const dropZoneActive = ref(false)
const selectedFiles = ref<string[]>([])

const options = ref<BatchOptions>({
  outputDir: './exports',
  formats: ['srt', 'json'],
  roiPreset: 'bottom',
  ocrEngine: 'tesseract',
  languages: ['ch'],
  sceneThreshold: 0.3,
  confidenceThreshold: 0.7
})

function handleFileDrop(e: DragEvent) {
  e.preventDefault()
  dropZoneActive.value = false
  const files = e.dataTransfer?.files
  if (!files) return
  const paths: string[] = []
  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    if (file.type.startsWith('video/')) {
      paths.push((file as File & { path?: string }).path || file.name)
    }
  }
  if (paths.length > 0) selectedFiles.value = [...selectedFiles.value, ...paths]
}

function handleFileSelect() {
  const input = document.createElement('input')
  input.type = 'file'
  input.multiple = true
  input.accept = 'video/*'
  input.onchange = () => {
    const files = input.files
    if (!files) return
    const paths: string[] = []
    for (let i = 0; i < files.length; i++) {
      paths.push((files[i] as File & { path?: string }).path || files[i].name)
    }
    if (paths.length > 0) selectedFiles.value = [...selectedFiles.value, ...paths]
  }
  input.click()
}

function removeFile(index: number) {
  selectedFiles.value.splice(index, 1)
}

function addToBatchAndStart() {
  if (selectedFiles.value.length === 0) return
  addToQueue(selectedFiles.value, options.value)
  startBatch(options.value)
}

function getStatusColor(status: BatchJob['status']): string {
  switch (status) {
    case 'completed': return 'var(--success)'
    case 'failed': return 'var(--error)'
    case 'processing': return 'var(--primary)'
    case 'cancelled': return 'var(--warning)'
    default: return 'var(--text-muted)'
  }
}

function getStatusText(status: BatchJob['status']): string {
  const map: Record<string, string> = {
    pending: '等待中', processing: '处理中', completed: '已完成',
    failed: '失败', cancelled: '已取消'
  }
  return map[status] ?? status
}

const s = computed(() => stats())

function formatETA(seconds: number | null): string {
  if (seconds === null) return ''
  if (seconds < 60) return `约 ${seconds}s`
  if (seconds < 3600) return `约 ${Math.ceil(seconds / 60)}m`
  return `约 ${Math.floor(seconds / 3600)}h ${Math.ceil((seconds % 3600) / 60)}m`
}

// Dialog state
const isOpen = ref(false)

function openDialog() {
  isOpen.value = true
}

function closeDialog() {
  isOpen.value = false
}

defineExpose({ open: openDialog, close: closeDialog })
</script>

<template>
  <div v-if="isOpen" class="batch-view">
    <!-- Header -->
    <header class="batch-header">
      <div class="header-left">
        <h2 class="batch-title">批量处理</h2>
        <span v-if="jobs.length > 0" class="job-count-badge">{{ jobs.length }} 个任务</span>
        <!-- Overall progress bar (only during processing) -->
        <div v-if="isProcessing" class="overall-progress-wrap">
          <div class="overall-progress-bar">
            <div class="overall-progress-fill" :style="{ width: overallProgress + '%' }"/>
          </div>
          <span class="overall-progress-pct">{{ overallProgress }}%</span>
          <span v-if="estimatedTimeRemaining !== null" class="eta-label">{{ formatETA(estimatedTimeRemaining) }}</span>
        </div>
      </div>
      <div class="header-actions">
        <button
          class="action-btn action-btn--primary"
          :disabled="selectedFiles.length === 0 || isProcessing"
          @click="addToBatchAndStart"
        >
          <svg class="btn-icon-svg" viewBox="0 0 20 20" fill="none">
            <path d="M6 4l10 6-10 6V4z" fill="currentColor"/>
          </svg>
          {{ isProcessing ? '处理中...' : '开始处理' }}
        </button>
        <button
          v-if="isProcessing"
          class="action-btn action-btn--danger"
          @click="cancelBatch"
        >
          <svg class="btn-icon-svg" viewBox="0 0 20 20" fill="none">
            <rect x="5" y="5" width="4" height="10" rx="1" fill="currentColor"/>
            <rect x="11" y="5" width="4" height="10" rx="1" fill="currentColor"/>
          </svg>
          取消
        </button>
        <button
          v-else
          class="action-btn"
          @click="clearCompleted"
          :disabled="jobs.filter(j => j.status === 'completed').length === 0"
        >
          <svg class="btn-icon-svg" viewBox="0 0 20 20" fill="none">
            <path d="M5 6h10M8 6V4h4v2M6 6v9h8V6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          清空完成
        </button>
      </div>
    </header>

    <!-- Body: 2-column layout -->
    <div class="batch-body">
      <!-- Left: Files -->
      <div class="files-col">
        <!-- Drop Zone -->
        <section class="panel-section">
          <div class="section-header">
            <span class="section-label">视频文件</span>
            <span class="file-count">{{ selectedFiles.length }} 个</span>
          </div>

          <div
            :class="['drop-zone', { active: dropZoneActive }]"
            @dragover.prevent="dropZoneActive = true"
            @dragleave="dropZoneActive = false"
            @drop="handleFileDrop"
            @click="handleFileSelect"
          >
            <div class="drop-content">
              <svg class="drop-icon" viewBox="0 0 48 48" fill="none">
                <circle cx="24" cy="24" r="22" stroke="currentColor" stroke-width="1.5" stroke-dasharray="4 3"/>
                <path d="M24 14v14M18 22l6-6 6 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M14 36h20" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
              </svg>
              <p class="drop-main">拖拽视频文件到这里</p>
              <p class="drop-sub">或点击选择文件</p>
              <p class="drop-formats">支持 MP4 · MKV · AVI · MOV · WebM</p>
            </div>

            <transition name="drop-fade">
              <div v-if="dropZoneActive" class="drop-overlay-inner">
                <svg class="drop-overlay-icon" viewBox="0 0 48 48" fill="none">
                  <path d="M24 12v18M15 21l9 9 9-9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <span>释放以添加</span>
              </div>
            </transition>
          </div>

          <!-- File list -->
          <transition-group name="file-list" tag="div" class="file-list" v-if="selectedFiles.length > 0">
            <div
              v-for="(file, index) in selectedFiles"
              :key="file"
              class="file-card"
            >
              <div class="file-icon-wrap">
                <svg class="file-icon" viewBox="0 0 24 24" fill="none">
                  <rect x="2" y="4" width="20" height="16" rx="2" stroke="currentColor" stroke-width="1.5"/>
                  <path d="M8 9l5 3-5 3V9z" fill="currentColor" opacity="0.7"/>
                </svg>
              </div>
              <span class="file-name">{{ file.split('/').pop() ?? file }}</span>
              <button class="file-remove" @click.stop="removeFile(index)" title="移除">
                <svg viewBox="0 0 16 16" fill="none">
                  <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                </svg>
              </button>
            </div>
          </transition-group>
        </section>

        <!-- Options -->
        <section class="panel-section">
          <div class="section-header">
            <span class="section-label">处理选项</span>
          </div>

          <div class="option-grid">
            <div class="option-item">
              <label class="option-label">OCR 引擎</label>
              <select v-model="options.ocrEngine" class="option-select">
                <option value="tesseract">Tesseract.js</option>
                <option value="paddle">PaddleOCR</option>
                <option value="easyocr">EasyOCR</option>
              </select>
            </div>

            <div class="option-item">
              <label class="option-label">字幕区域</label>
              <select v-model="options.roiPreset" class="option-select">
                <option value="bottom">底部字幕</option>
                <option value="top">顶部字幕</option>
                <option value="left">左侧字幕</option>
                <option value="right">右侧字幕</option>
                <option value="center">中心字幕</option>
              </select>
            </div>
          </div>

          <div class="option-item">
            <label class="option-label">导出格式</label>
            <div class="format-chips">
              <label v-for="fmt in ['srt','vtt','ass','json']" :key="fmt" :class="['chip', { active: (options.formats as string[]).includes(fmt) }]">
                <input type="checkbox" :value="fmt" v-model="options.formats" />
                {{ fmt.toUpperCase() }}
              </label>
            </div>
          </div>

          <div class="option-item">
            <label class="option-label">置信度阈值 <span class="threshold-val">{{ Math.round(options.confidenceThreshold * 100) }}%</span></label>
            <div class="slider-track">
              <div class="slider-fill" :style="{ width: options.confidenceThreshold * 100 + '%' }"/>
              <input type="range" v-model.number="options.confidenceThreshold" min="0" max="1" step="0.01" class="slider" />
            </div>
          </div>
        </section>
      </div>

      <!-- Right: Jobs Queue -->
      <div class="jobs-col">
        <section class="panel-section jobs-section">
          <div class="section-header">
            <span class="section-label">处理队列</span>
          </div>

          <!-- Stats -->
          <div class="stats-row">
            <div class="stat-chip">
              <svg viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="5" stroke="currentColor" stroke-width="1.5"/></svg>
              <span>{{ s.total }}</span>
            </div>
            <div class="stat-chip stat-success">
              <svg viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
              <span>{{ s.completed }}</span>
            </div>
            <div class="stat-chip stat-error">
              <svg viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="5" stroke="currentColor" stroke-width="1.5"/><path d="M6 3v3M6 8.5v.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
              <span>{{ s.failed }}</span>
            </div>
          </div>

          <!-- Job list -->
          <div class="job-list" v-if="jobs.length > 0">
            <transition-group name="job-list" tag="div">
              <div
                v-for="job in jobs"
                :key="job.id"
                :class="['job-card', job.status]"
              >
                <!-- Status indicator bar -->
                <div :class="['job-bar', `bar-${job.status}`]"/>

                <div class="job-main">
                  <div class="job-left">
                    <!-- Status icon -->
                    <div :class="['job-status-icon', job.status]">
                      <svg v-if="job.status === 'completed'" viewBox="0 0 12 12" fill="none">
                        <path d="M2 6l3 3 5-5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                      </svg>
                      <svg v-else-if="job.status === 'failed'" viewBox="0 0 12 12" fill="none">
                        <path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                      </svg>
                      <svg v-else-if="job.status === 'processing'" class="spin" viewBox="0 0 12 12" fill="none">
                        <path d="M6 1v2M6 9v2M1 6H3M9 6h2M2.2 2.2l1.4 1.4M8.4 8.4l1.4 1.4M2.2 9.8l1.4-1.4M8.4 3.6l1.4-1.4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
                      </svg>
                      <svg v-else viewBox="0 0 12 12" fill="none">
                        <circle cx="6" cy="6" r="4" stroke="currentColor" stroke-width="1.5" stroke-dasharray="2 1.5"/>
                      </svg>
                    </div>

                    <div class="job-info">
                      <span class="job-name">{{ job.inputPath.split('/').pop() ?? job.inputPath }}</span>
                      <span class="job-status-text" :style="{ color: getStatusColor(job.status) }">
                        {{ getStatusText(job.status) }}
                      </span>
                    </div>
                  </div>

                  <div class="job-right">
                    <!-- Progress bar for processing -->
                    <div v-if="job.status === 'processing'" class="job-progress-wrap">
                      <div class="job-progress-bar">
                        <div class="job-progress-fill" :style="{ width: job.progress + '%' }"/>
                      </div>
                      <span class="job-progress-pct">{{ Math.round(job.progress) }}%</span>
                      <span v-if="job.stageLabel" class="job-stage-label">{{ job.stageLabel }}</span>
                    </div>

                    <!-- Error text -->
                    <span v-if="job.status === 'failed'" class="job-error-text">{{ job.error }}</span>

                    <!-- Actions -->
                    <div class="job-actions">
                      <button
                        v-if="job.status === 'failed'"
                        class="job-action-btn"
                        @click="retryJob(job.id)"
                        title="重试"
                      >
                        <svg viewBox="0 0 16 16" fill="none">
                          <path d="M13.5 8a5.5 5.5 0 11-1.6-3.9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                          <path d="M13.5 4v3.5H10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                      </button>
                      <button class="job-action-btn job-action-btn--remove" @click="removeJob(job.id)" title="移除">
                        <svg viewBox="0 0 16 16" fill="none">
                          <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </transition-group>
          </div>

          <!-- Empty state -->
          <div v-else class="jobs-empty">
            <svg class="empty-icon" viewBox="0 0 64 48" fill="none">
              <rect x="8" y="8" width="48" height="32" rx="4" stroke="currentColor" stroke-width="1.5" stroke-dasharray="3 3" opacity="0.4"/>
              <path d="M24 20l10 6-10 6V20z" fill="currentColor" opacity="0.2"/>
              <circle cx="50" cy="12" r="6" stroke="currentColor" stroke-width="1.5" opacity="0.3"/>
              <path d="M50 9v3M50 12v.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" opacity="0.3"/>
            </svg>
            <p class="empty-title">暂无处理任务</p>
            <p class="empty-hint">添加视频文件并开始处理</p>
          </div>
        </section>
      </div>
    </div>

    <!-- Close button overlay -->
    <button class="batch-close-btn" @click="closeDialog" title="关闭">
      <svg viewBox="0 0 20 20" fill="none">
        <path d="M6 6l8 8M14 6l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      </svg>
    </button>
  </div>
</template>

<style lang="scss" scoped>
.batch-view {
  position: fixed;
  inset: 0;
  z-index: $z-modal;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: $bg-base;
  animation: fade-up 0.3s ease-out both;
}

// ── Header ────────────────────────────────────────────────
.batch-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: $space-4 $space-5;
  border-bottom: 1px solid $border;
  background: $bg-surface;
  animation: fade-up 0.3s ease-out both;
}

.header-left {
  display: flex;
  align-items: center;
  gap: $space-3;
}

.batch-title {
  font-size: $text-lg;
  font-weight: 700;
  color: $text-primary;
}

.job-count-badge {
  font-size: $text-xs;
  font-weight: 600;
  background: rgba($primary, 0.1);
  color: $primary;
  padding: 3px 10px;
  border-radius: $radius-full;
  border: 1px solid rgba($primary, 0.2);
}

.overall-progress-wrap {
  display: flex;
  align-items: center;
  gap: $space-2;
}

.overall-progress-bar {
  width: 80px;
  height: 6px;
  background: $bg-overlay;
  border-radius: $radius-full;
  overflow: hidden;
}

.overall-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, $primary, $accent);
  border-radius: $radius-full;
  transition: width 0.4s ease;
}

.overall-progress-pct {
  font-family: $font-display;
  font-size: 11px;
  font-weight: 700;
  color: $primary;
}

.eta-label {
  font-size: 11px;
  font-weight: 600;
  color: $text-muted;
  background: $bg-overlay;
  padding: 2px 8px;
  border-radius: $radius-full;
}

.header-actions {
  display: flex;
  gap: $space-2;
}

// ── Action Buttons ────────────────────────────────────────
.action-btn {
  display: inline-flex;
  align-items: center;
  gap: $space-2;
  padding: $space-2 $space-4;
  border-radius: $radius-lg;
  font-size: $text-sm;
  font-weight: 600;
  transition: all $transition-base;
  border: none;

  .btn-icon-svg {
    width: 16px;
    height: 16px;
  }

  &--primary {
    background: linear-gradient(135deg, $primary, lighten($primary, 8%));
    color: #fff;
    box-shadow: 0 2px 12px rgba($primary, 0.3);

    &:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 4px 20px rgba($primary, 0.4);
    }

    &:disabled { opacity: 0.4; cursor: not-allowed; }
  }

  &--danger {
    background: $bg-elevated;
    border: 1.5px solid rgba($error, 0.3);
    color: $error;

    &:hover { background: rgba($error, 0.08); border-color: rgba($error, 0.5); }
  }

  &:disabled { opacity: 0.4; cursor: not-allowed; }
}

// ── Body Layout ────────────────────────────────────────────
.batch-body {
  flex: 1;
  overflow: hidden;
  display: grid;
  grid-template-columns: 1fr 380px;
  gap: 0;
}

.files-col {
  overflow-y: auto;
  padding: $space-5;
  display: flex;
  flex-direction: column;
  gap: $space-5;
  border-right: 1px solid $border;
  @include custom-scrollbar;
}

.jobs-col {
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.jobs-section {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  height: 100%;
}

// ── Panel Section ────────────────────────────────────────────
.panel-section {
  animation: fade-up 0.35s ease-out both;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: $space-3;
}

.section-label {
  font-size: $text-xs;
  font-weight: 700;
  color: $text-muted;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.file-count {
  font-size: $text-xs;
  color: $text-muted;
  background: $bg-overlay;
  padding: 2px 8px;
  border-radius: $radius-full;
}

// ── Drop Zone ────────────────────────────────────────────────
.drop-zone {
  position: relative;
  border: 1.5px dashed $border;
  border-radius: $radius-xl;
  background: rgba($primary, 0.02);
  cursor: pointer;
  transition: all $transition-base;
  animation: border-breathe 3s ease-in-out infinite;

  &:hover, &.active {
    border-color: $primary;
    background: rgba($primary, 0.04);
    animation: none;
  }

  &.active .drop-content { opacity: 0.5; }
}

.drop-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: $space-8 $space-4;
  text-align: center;
  transition: opacity $transition-base;
}

.drop-icon {
  width: 48px;
  height: 48px;
  color: $text-muted;
  margin-bottom: $space-4;
}

.drop-main {
  font-size: $text-base;
  font-weight: 600;
  color: $text-secondary;
  margin-bottom: $space-1;
}

.drop-sub {
  font-size: $text-sm;
  color: $text-muted;
  margin-bottom: $space-3;
}

.drop-formats {
  font-size: $text-xs;
  color: $text-muted;
  letter-spacing: 0.02em;
}

.drop-overlay-inner {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: $space-2;
  color: $primary;
  font-weight: 600;
  font-size: $text-base;

  .drop-overlay-icon {
    width: 40px;
    height: 40px;
    animation: bounce-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  }
}

// ── File List ────────────────────────────────────────────────
.file-list {
  display: flex;
  flex-direction: column;
  gap: $space-2;
  margin-top: $space-3;
}

.file-card {
  display: flex;
  align-items: center;
  gap: $space-3;
  padding: $space-2 $space-3;
  background: $bg-elevated;
  border: 1px solid $border;
  border-radius: $radius-md;
  transition: border-color $transition-fast;
  animation: fade-up 0.25s ease-out both;

  &:hover {
    border-color: $border-light;
    .file-remove { opacity: 1; }
  }
}

.file-icon-wrap {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba($primary, 0.08);
  border-radius: $radius-sm;
  flex-shrink: 0;
}

.file-icon {
  width: 18px;
  height: 18px;
  color: $primary;
}

.file-name {
  flex: 1;
  font-size: $text-sm;
  color: $text-secondary;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-remove {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: $radius-sm;
  color: $text-muted;
  opacity: 0;
  transition: all $transition-fast;

  svg { width: 14px; height: 14px; }

  &:hover {
    background: rgba($error, 0.1);
    color: $error;
  }
}

// ── Options ──────────────────────────────────────────────────
.option-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: $space-3;
  margin-bottom: $space-4;
}

.option-item {
  display: flex;
  flex-direction: column;
  gap: $space-2;
  margin-bottom: $space-3;
}

.option-label {
  font-size: $text-xs;
  font-weight: 600;
  color: $text-muted;

  .threshold-val {
    color: $primary;
    font-family: $font-display;
  }
}

.option-select {
  width: 100%;
  background: $bg-elevated;
  border: 1px solid $border;
  border-radius: $radius-md;
  padding: $space-2 $space-3;
  font-size: $text-sm;
  color: $text-primary;
  font-family: $font-ui;
  cursor: pointer;
  transition: border-color $transition-fast;

  &:focus {
    outline: none;
    border-color: $primary;
  }
}

.format-chips {
  display: flex;
  flex-wrap: wrap;
  gap: $space-2;
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: $space-1 $space-3;
  background: $bg-elevated;
  border: 1.5px solid $border;
  border-radius: $radius-full;
  font-size: $text-xs;
  font-weight: 600;
  color: $text-secondary;
  cursor: pointer;
  transition: all $transition-base;

  input[type="checkbox"] { display: none; }

  &:hover { border-color: $border-light; color: $text-primary; }

  &.active {
    border-color: $primary;
    background: rgba($primary, 0.1);
    color: $primary;
  }
}

.slider-track {
  position: relative;
  height: 6px;
  background: $bg-overlay;
  border-radius: $radius-full;

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

// ── Stats Row ────────────────────────────────────────────────
.stats-row {
  display: flex;
  gap: $space-2;
  margin-bottom: $space-3;
  flex-wrap: wrap;
}

.stat-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  background: $bg-overlay;
  border-radius: $radius-full;
  font-size: $text-xs;
  font-weight: 600;
  color: $text-muted;

  svg { width: 12px; height: 12px; }

  &.stat-success { color: $success; background: rgba($success, 0.1); }
  &.stat-error { color: $error; background: rgba($error, 0.1); }
}

// ── Job List ────────────────────────────────────────────────
.job-list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: $space-2;
  padding-right: $space-1;
  @include custom-scrollbar;
}

.job-card {
  position: relative;
  background: $bg-elevated;
  border: 1px solid $border;
  border-radius: $radius-lg;
  overflow: hidden;
  transition: all $transition-base;
  animation: card-enter 0.3s ease-out both;

  &:hover {
    border-color: $border-light;
    box-shadow: $shadow-sm;
  }

  &.completed { border-color: rgba($success, 0.2); }
  &.failed { border-color: rgba($error, 0.2); }
  &.processing { border-color: rgba($primary, 0.2); }
}

.job-bar {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;

  &.bar-completed { background: $success; }
  &.bar-failed { background: $error; }
  &.bar-processing { background: $primary; animation: bar-pulse 1.5s ease-in-out infinite; }
  &.bar-cancelled { background: $warning; }
  &.bar-pending { background: $border; }
}

.job-main {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: $space-3 $space-4;
  gap: $space-3;
}

.job-left {
  display: flex;
  align-items: center;
  gap: $space-3;
  flex: 1;
  min-width: 0;
}

.job-status-icon {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  svg { width: 14px; height: 14px; }

  &.completed { background: rgba($success, 0.15); color: $success; }
  &.failed { background: rgba($error, 0.15); color: $error; }
  &.processing { background: rgba($primary, 0.15); color: $primary; }
  &.pending, &.cancelled { background: $bg-overlay; color: $text-muted; }
}

.job-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.job-name {
  font-size: $text-sm;
  font-weight: 500;
  color: $text-primary;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.job-status-text {
  font-size: 10px;
  font-weight: 600;
}

.job-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: $space-2;
  flex-shrink: 0;
}

.job-progress-wrap {
  display: flex;
  align-items: center;
  gap: $space-2;
}

.job-progress-bar {
  width: 80px;
  height: 4px;
  background: $bg-overlay;
  border-radius: $radius-full;
  overflow: hidden;
}

.job-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, $primary, $accent);
  border-radius: $radius-full;
  transition: width 0.3s ease;
}

.job-progress-pct {
  font-family: $font-display;
  font-size: 10px;
  font-weight: 700;
  color: $primary;
  min-width: 28px;
  text-align: right;
}

.job-stage-label {
  font-size: 10px;
  color: $text-muted;
  margin-left: $space-1;
}

.job-error-text {
  font-size: 10px;
  color: $error;
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.job-actions {
  display: flex;
  gap: $space-1;
}

.job-action-btn {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: $radius-sm;
  color: $text-muted;
  transition: all $transition-fast;

  svg { width: 14px; height: 14px; }

  &:hover { background: $bg-overlay; color: $text-primary; }
  &--remove:hover { background: rgba($error, 0.1); color: $error; }
}

// ── Empty State ─────────────────────────────────────────────
.jobs-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: $space-8 $space-4;
  text-align: center;

  .empty-icon {
    width: 64px;
    height: 48px;
    color: $text-muted;
    margin-bottom: $space-4;
    opacity: 0.5;
  }

  .empty-title {
    font-size: $text-base;
    font-weight: 600;
    color: $text-secondary;
    margin-bottom: $space-1;
  }

  .empty-hint {
    font-size: $text-sm;
    color: $text-muted;
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

@keyframes border-breathe {
  0%, 100% { border-color: $border; }
  50% { border-color: $border-light; }
}

@keyframes bounce-in {
  0% { transform: scale(0.5); opacity: 0; }
  70% { transform: scale(1.1); }
  100% { transform: scale(1); opacity: 1; }
}

@keyframes bar-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.spin { animation: spin 1s linear infinite; }

// ── Transitions ────────────────────────────────────────────
.drop-fade-enter-active,
.drop-fade-leave-active { transition: opacity 0.2s; }
.drop-fade-enter-from,
.drop-fade-leave-to { opacity: 0; }

.file-list-enter-active,
.file-list-leave-active { transition: all 0.25s ease; }
.file-list-enter-from { opacity: 0; transform: translateY(-8px); }
.file-list-leave-to { opacity: 0; transform: translateX(20px); }

.job-list-enter-active,
.job-list-leave-active { transition: all 0.3s ease; }
.job-list-enter-from { opacity: 0; transform: translateX(20px); }
.job-list-leave-to { opacity: 0; transform: translateX(-10px); }

// ── Close Button ───────────────────────────────────────────
.batch-close-btn {
  position: absolute;
  top: $space-3;
  right: $space-3;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: $bg-overlay;
  border: 1px solid $border;
  border-radius: $radius-md;
  color: $text-secondary;
  cursor: pointer;
  transition: all $transition-fast;
  z-index: 1;
  
  svg {
    width: 14px;
    height: 14px;
  }
  
  &:hover {
    background: $border;
    color: $text-primary;
  }
}
</style>
