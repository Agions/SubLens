<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import { useProjectStore } from '@/stores/project'
import { useSubtitleStore } from '@/stores/subtitle'
import { useVideoPlayer } from '@/composables/useVideoPlayer'
import ROISelector from '@/components/video/ROISelector.vue'

const projectStore = useProjectStore()
const subtitleStore = useSubtitleStore()

const {
  isReady,
  isLoading,
  error,
  initVideo,
  loadVideo,
  play,
  pause,
  togglePlay,
  seekToFrame,
  seekRelative,
  captureFrame,
  handleKeydown
} = useVideoPlayer()

const videoElement = ref<HTMLVideoElement | null>(null)
const showOverlay = ref(false)
const isDragOver = ref(false)
const timelineRef = ref<HTMLElement | null>(null)
const hoverTime = ref<number | null>(null)
const hoverX = ref(0)

onMounted(() => {
  if (videoElement.value) {
    initVideo(videoElement.value)
  }
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})

watch(() => projectStore.videoPath, (path) => {
  if (path && videoElement.value) {
    loadVideo(path)
  }
})

function handleProgressClick(e: MouseEvent) {
  const target = e.currentTarget as HTMLElement
  const rect = target.getBoundingClientRect()
  const x = e.clientX - rect.left
  const percent = x / rect.width
  if (projectStore.videoMeta) {
    const frame = Math.floor(percent * projectStore.videoMeta.totalFrames)
    seekToFrame(frame)
  }
}

function handleTimelineHover(e: MouseEvent) {
  const target = e.currentTarget as HTMLElement
  const rect = target.getBoundingClientRect()
  const x = e.clientX - rect.left
  const percent = Math.max(0, Math.min(1, x / rect.width))
  if (projectStore.videoMeta) {
    hoverTime.value = percent * projectStore.duration
    hoverX.value = x
  }
}

function handleTimelineLeave() {
  hoverTime.value = null
}

function handleROIUpdate(roi: { x: number; y: number; width: number; height: number }) {
  projectStore.updateROI({
    x: roi.x,
    y: roi.y,
    width: roi.width,
    height: roi.height,
    type: 'custom'
  })
}

function handleFileDrop(e: DragEvent) {
  e.preventDefault()
  isDragOver.value = false
  showOverlay.value = false
  const file = e.dataTransfer?.files[0]
  if (file && file.type.startsWith('video/')) {
    const url = URL.createObjectURL(file)
    projectStore.setVideo(file.name, {
      path: url,
      width: 1920,
      height: 1080,
      duration: 0,
      fps: 30,
      totalFrames: 0,
      codec: ''
    })
    loadVideo(url)
  }
}

function handleFileSelect() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'video/*'
  input.onchange = (e) => {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (file) {
      const url = URL.createObjectURL(file)
      projectStore.setVideo(file.name, {
        path: url,
        width: 1920,
        height: 1080,
        duration: 0,
        fps: 30,
        totalFrames: 0,
        codec: ''
      })
      loadVideo(url)
    }
  }
  input.click()
}

function formatTime(seconds: number): string {
  const hrs = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  if (hrs > 0) return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

function formatTimePrecise(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  const ms = Math.floor((seconds % 1) * 1000)
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`
}

const currentSubtitle = computed(() => {
  if (!projectStore.hasVideo || subtitleStore.subtitles.length === 0) return null
  return subtitleStore.subtitles.find(s =>
    projectStore.currentTime >= s.startTime && projectStore.currentTime <= s.endTime
  ) ?? null
})
</script>

<template>
  <main class="video-preview">
    <!-- Video Area -->
    <div
      class="video-container"
      @dragover.prevent="isDragOver = true"
      @dragleave="isDragOver = false"
      @drop="handleFileDrop"
    >
      <!-- Empty State -->
      <div v-if="!projectStore.hasVideo" class="empty-state" :class="{ 'drag-over': isDragOver }">
        <div class="empty-content">
          <!-- Animated icon -->
          <div class="empty-icon-wrapper">
            <svg class="empty-icon-svg" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="40" cy="40" r="38" stroke="currentColor" stroke-width="1.5" stroke-dasharray="4 4" class="circle-dash"/>
              <path d="M32 28L54 40L32 52V28Z" fill="currentColor" opacity="0.9"/>
            </svg>
          </div>
          <h3 class="empty-title">导入视频开始提取</h3>
          <p class="empty-desc">拖拽视频文件到此处，或点击下方按钮选择</p>
          <button class="import-btn" @click="handleFileSelect">
            <svg class="btn-icon" viewBox="0 0 20 20" fill="none">
              <path d="M3 7v9a2 2 0 002 2h10a2 2 0 002-2V7M10 3v10m0-10L6 7m4-4l4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            选择视频文件
          </button>
          <p class="empty-formats">支持 MP4 · MKV · AVI · MOV · WebM</p>
        </div>

        <!-- Drop Overlay -->
        <transition name="drop-fade">
          <div v-if="isDragOver" class="drop-overlay">
            <div class="drop-inner">
              <svg class="drop-icon" viewBox="0 0 48 48" fill="none">
                <path d="M24 4v28M12 24l12 12 12-12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M4 40h40" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
              <span class="drop-text">释放以导入视频</span>
            </div>
          </div>
        </transition>
      </div>

      <!-- Video Element -->
      <div v-show="projectStore.hasVideo" class="video-wrapper">
        <video
          ref="videoElement"
          class="video-element"
          preload="metadata"
          @click="togglePlay"
        ></video>

        <!-- Subtitle Overlay -->
        <transition name="subtitle-fade">
          <div v-if="currentSubtitle" class="subtitle-overlay">
            <div class="subtitle-text">{{ currentSubtitle.text }}</div>
          </div>
        </transition>

        <!-- ROI Selector -->
        <ROISelector
          v-if="isReady"
          :video-width="projectStore.videoMeta?.width ?? 1920"
          :video-height="projectStore.videoMeta?.height ?? 1080"
          @update="handleROIUpdate"
        />
      </div>

      <!-- Loading -->
      <transition name="fade">
        <div v-if="isLoading" class="loading-overlay">
          <div class="loading-ring">
            <svg viewBox="0 0 60 60" class="ring-svg">
              <circle cx="30" cy="30" r="26" class="ring-track"/>
              <circle cx="30" cy="30" r="26" class="ring-progress"/>
            </svg>
            <span class="loading-percent">87%</span>
          </div>
          <span class="loading-text">正在分析视频...</span>
        </div>
      </transition>

      <!-- Error -->
      <div v-if="error" class="error-overlay">
        <svg class="error-icon" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.5"/>
          <path d="M12 7v5M12 15.5v.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
        <span class="error-text">{{ error }}</span>
      </div>
    </div>

    <!-- Controls -->
    <div class="video-controls">
      <div class="control-left">
        <!-- Play/Pause -->
        <button
          class="ctrl-btn ctrl-btn--primary"
          @click="togglePlay"
          :disabled="!projectStore.hasVideo"
          :title="projectStore.isPlaying ? '暂停' : '播放'"
        >
          <svg v-if="projectStore.isPlaying" class="ctrl-icon" viewBox="0 0 24 24" fill="none">
            <rect x="6" y="4" width="4" height="16" rx="1" fill="currentColor"/>
            <rect x="14" y="4" width="4" height="16" rx="1" fill="currentColor"/>
          </svg>
          <svg v-else class="ctrl-icon" viewBox="0 0 24 24" fill="none">
            <path d="M6 4l14 8-14 8V4z" fill="currentColor"/>
          </svg>
        </button>

        <!-- Skip back 10s -->
        <button class="ctrl-btn" @click="seekRelative(-10)" :disabled="!projectStore.hasVideo" title="后退10秒">
          <svg class="ctrl-icon" viewBox="0 0 24 24" fill="none">
            <path d="M12.5 8l-4 4 4 4M8 12h7.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>

        <!-- Skip forward 10s -->
        <button class="ctrl-btn" @click="seekRelative(10)" :disabled="!projectStore.hasVideo" title="前进10秒">
          <svg class="ctrl-icon" viewBox="0 0 24 24" fill="none">
            <path d="M11.5 8l4 4-4 4M16 12H8.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </div>

      <div class="control-center">
        <!-- Timeline -->
        <div
          class="timeline"
          ref="timelineRef"
          @click="handleProgressClick"
          @mousemove="handleTimelineHover"
          @mouseleave="handleTimelineLeave"
        >
          <!-- Hover preview bubble -->
          <div
            v-if="hoverTime !== null && projectStore.hasVideo"
            class="timeline-hover-bubble"
            :style="{ left: `${hoverX}px` }"
          >
            {{ formatTimePrecise(hoverTime) }}
          </div>

          <!-- Subtitle markers -->
          <div class="timeline-markers">
            <div
              v-for="sub in subtitleStore.subtitles.slice(0, 50)"
              :key="sub.id"
              class="timeline-marker"
              :style="{
                left: `${(sub.startTime / projectStore.duration) * 100}%`,
                width: `${Math.max(1, ((sub.endTime - sub.startTime) / projectStore.duration) * 100)}%`
              }"
              :class="{ active: sub.id === subtitleStore.selectedId }"
            />
          </div>

          <div class="timeline-track">
            <!-- Subtitle region bands -->
            <div
              v-for="sub in subtitleStore.subtitles.slice(0, 20)"
              :key="`band-${sub.id}`"
              class="timeline-band"
              :style="{
                left: `${(sub.startTime / projectStore.duration) * 100}%`,
                width: `${Math.max(0.5, ((sub.endTime - sub.startTime) / projectStore.duration) * 100)}%`,
                opacity: sub.id === subtitleStore.selectedId ? 0.5 : 0.2
              }"
            />
            <div
              class="timeline-fill"
              :style="{ width: `${projectStore.progress}%` }"
            />
            <div
              class="timeline-head"
              :style="{ left: `${projectStore.progress}%` }"
            >
              <div class="head-glow"/>
            </div>
          </div>
        </div>
      </div>

      <div class="control-right">
        <!-- Frame counter -->
        <div class="frame-counter" v-if="projectStore.hasVideo">
          <span class="frame-label">F</span>
          <span class="frame-num">{{ projectStore.currentFrame.toLocaleString() }}</span>
        </div>
        <!-- Time display -->
        <div class="time-display">
          <span class="current">{{ formatTime(projectStore.currentTime) }}</span>
          <span class="separator">/</span>
          <span class="total">{{ formatTime(projectStore.duration) }}</span>
        </div>
      </div>
    </div>
  </main>
</template>

<style lang="scss" scoped>
.video-preview {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: $bg-base;
  overflow: hidden;
}

.video-container {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  padding: $space-4;
}

// ── Empty State ─────────────────────────────────────────────
.empty-state {
  width: 100%;
  height: 100%;
  border: 1.5px dashed $border;
  border-radius: $radius-xl;
  background: linear-gradient(135deg, rgba($primary, 0.02), rgba($accent, 0.02));
  position: relative;
  transition: all $transition-base;
  animation: border-breathe 3s ease-in-out infinite;

  &.drag-over {
    border-color: $primary;
    background: rgba($primary, 0.05);
    animation: none;
    transform: scale(1.005);
  }
}

.empty-content {
  text-align: center;
  max-width: 340px;
  animation: fade-up 0.5s ease-out both;
}

.empty-icon-wrapper {
  display: flex;
  justify-content: center;
  margin-bottom: $space-5;
}

.empty-icon-svg {
  width: 80px;
  height: 80px;
  color: $text-muted;
  .circle-dash {
    animation: spin-slow 20s linear infinite;
    transform-origin: center;
  }
}

.empty-title {
  font-size: $text-xl;
  font-weight: 700;
  margin-bottom: $space-2;
  color: $text-primary;
  letter-spacing: -0.01em;
}

.empty-desc {
  font-size: $text-sm;
  color: $text-muted;
  margin-bottom: $space-6;
  line-height: 1.6;
}

.import-btn {
  display: inline-flex;
  align-items: center;
  gap: $space-2;
  padding: 12px $space-6;
  background: linear-gradient(135deg, $primary, lighten($primary, 10%));
  color: #fff;
  font-weight: 600;
  font-size: $text-base;
  border-radius: $radius-lg;
  transition: all $transition-base;
  box-shadow: 0 4px 16px rgba($primary, 0.35);
  margin-bottom: $space-4;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba($primary, 0.45);
  }

  &:active {
    transform: translateY(0) scale(0.98);
  }

  .btn-icon {
    width: 18px;
    height: 18px;
  }
}

.empty-formats {
  font-size: $text-xs;
  color: $text-muted;
  letter-spacing: 0.02em;
}

// ── Drop Overlay ────────────────────────────────────────────
.drop-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba($primary, 0.08);
  border-radius: $radius-xl;
  border: 2px solid $primary;
  backdrop-filter: blur(4px);
}

.drop-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: $space-3;
}

.drop-icon {
  width: 48px;
  height: 48px;
  color: $primary;
  animation: bounce-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.drop-text {
  font-size: $text-lg;
  font-weight: 600;
  color: $primary;
}

// ── Video Wrapper ────────────────────────────────────────────
.video-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: $radius-lg;
  overflow: hidden;
}

.video-element {
  max-width: 100%;
  max-height: 100%;
  border-radius: $radius-md;
  cursor: pointer;
}

// ── Subtitle Overlay ─────────────────────────────────────────
.subtitle-overlay {
  position: absolute;
  bottom: $space-6;
  left: 50%;
  transform: translateX(-50%);
  pointer-events: none;
  z-index: 10;
}

.subtitle-text {
  background: rgba(0, 0, 0, 0.72);
  backdrop-filter: blur(8px);
  color: #fff;
  padding: $space-2 $space-5;
  border-radius: $radius-md;
  font-size: $text-base;
  font-weight: 500;
  white-space: nowrap;
  border: 1px solid rgba(255,255,255,0.08);
  box-shadow: 0 4px 24px rgba(0,0,0,0.4);
}

// ── Loading ─────────────────────────────────────────────────
.loading-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: $space-4;
  background: rgba($bg-base, 0.85);
  backdrop-filter: blur(8px);
}

.loading-ring {
  position: relative;
  width: 72px;
  height: 72px;

  .ring-svg {
    width: 72px;
    height: 72px;
    transform: rotate(-90deg);
  }

  .ring-track {
    fill: none;
    stroke: $border;
    stroke-width: 4;
  }

  .ring-progress {
    fill: none;
    stroke: $primary;
    stroke-width: 4;
    stroke-linecap: round;
    stroke-dasharray: 163;
    stroke-dashoffset: 40;
    animation: ring-spin 1.5s ease-in-out infinite;
    filter: drop-shadow(0 0 6px rgba($primary, 0.5));
  }

  .loading-percent {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: $font-display;
    font-size: $text-sm;
    font-weight: 700;
    color: $primary;
  }
}

.loading-text {
  font-size: $text-sm;
  color: $text-muted;
  letter-spacing: 0.05em;
}

// ── Error ────────────────────────────────────────────────────
.error-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: $space-3;
  background: rgba($bg-base, 0.9);

  .error-icon {
    width: 48px;
    height: 48px;
    color: $error;
    opacity: 0.8;
  }

  .error-text {
    font-size: $text-sm;
    color: $error;
    font-weight: 500;
  }
}

// ── Controls ─────────────────────────────────────────────────
.video-controls {
  height: 60px;
  background: $bg-surface;
  border-top: 1px solid $border;
  display: flex;
  align-items: center;
  padding: 0 $space-4;
  gap: $space-4;
}

.control-left {
  display: flex;
  align-items: center;
  gap: $space-2;
  flex-shrink: 0;
}

.ctrl-btn {
  width: 38px;
  height: 38px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: $radius-md;
  color: $text-secondary;
  transition: all $transition-fast;
  flex-shrink: 0;

  &:hover:not(:disabled) {
    background: $bg-overlay;
    color: $text-primary;
  }

  &:active:not(:disabled) {
    transform: scale(0.92);
  }

  &:disabled {
    opacity: 0.25;
    cursor: not-allowed;
  }

  &--primary {
    background: $primary;
    color: #fff;
    width: 42px;
    height: 42px;
    border-radius: $radius-lg;
    box-shadow: 0 2px 12px rgba($primary, 0.4);

    &:hover:not(:disabled) {
      background: lighten($primary, 5%);
      box-shadow: 0 4px 20px rgba($primary, 0.5);
    }
  }

  .ctrl-icon {
    width: 20px;
    height: 20px;
  }
}

.control-center {
  flex: 1;
  padding: 0 $space-2;
}

.timeline {
  position: relative;
  height: 40px;
  cursor: pointer;
  display: flex;
  align-items: center;
  padding: 6px 0;
}

.timeline-hover-bubble {
  position: absolute;
  top: -32px;
  transform: translateX(-50%);
  background: $bg-elevated;
  color: $text-primary;
  font-family: $font-display;
  font-size: $text-xs;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: $radius-sm;
  border: 1px solid $border-light;
  white-space: nowrap;
  pointer-events: none;
  z-index: 5;
  box-shadow: $shadow-md;
}

.timeline-markers {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 100%;
  pointer-events: none;
}

.timeline-marker {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  height: 4px;
  background: rgba($secondary, 0.6);
  border-radius: $radius-full;
  transition: all $transition-fast;

  &.active {
    background: $secondary;
    box-shadow: 0 0 6px rgba($secondary, 0.5);
  }
}

.timeline-track {
  position: relative;
  width: 100%;
  height: 6px;
  background: $bg-overlay;
  border-radius: $radius-full;
  overflow: visible;
}

.timeline-band {
  position: absolute;
  top: 0;
  height: 100%;
  background: $accent;
  border-radius: 2px;
  transition: opacity $transition-fast;
}

.timeline-fill {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  background: linear-gradient(90deg, $primary, $accent);
  border-radius: $radius-full;
  transition: width 0.05s linear;
}

.timeline-head {
  position: absolute;
  top: 50%;
  width: 16px;
  height: 16px;
  transform: translate(-50%, -50%);
  transition: left 0.05s linear;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: #fff;
    border-radius: 50%;
    box-shadow: $shadow-md;
    transition: transform $transition-fast;
  }

  .head-glow {
    position: absolute;
    inset: -4px;
    background: rgba($primary, 0.3);
    border-radius: 50%;
    animation: pulse-glow 2s ease-in-out infinite;
  }
}

.timeline:hover .timeline-head::before {
  transform: scale(1.3);
}

.control-right {
  display: flex;
  align-items: center;
  gap: $space-3;
  flex-shrink: 0;
}

.frame-counter {
  display: flex;
  align-items: center;
  gap: 4px;
  font-family: $font-display;
  font-size: $text-xs;

  .frame-label {
    color: $text-muted;
    font-weight: 500;
  }

  .frame-num {
    color: $text-secondary;
    min-width: 48px;
    text-align: right;
  }
}

.time-display {
  font-family: $font-display;
  font-size: $text-sm;
  display: flex;
  gap: 3px;

  .current {
    color: $text-primary;
    font-weight: 600;
  }

  .separator {
    color: $text-muted;
  }

  .total {
    color: $text-muted;
  }
}

// ── Transitions ─────────────────────────────────────────────
.drop-fade-enter-active,
.drop-fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.drop-fade-enter-from,
.drop-fade-leave-to {
  opacity: 0;
  transform: scale(0.96);
}

.subtitle-fade-enter-active,
.subtitle-fade-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}
.subtitle-fade-enter-from,
.subtitle-fade-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(8px);
}

.fade-enter-active,
.fade-leave-active { transition: opacity 0.3s ease; }
.fade-enter-from,
.fade-leave-to { opacity: 0; }

// ── Animations ──────────────────────────────────────────────
@keyframes border-breathe {
  0%, 100% { border-color: $border; }
  50% { border-color: $border-light; }
}

@keyframes spin-slow {
  to { transform: rotate(360deg); }
}

@keyframes ring-spin {
  0% { stroke-dashoffset: 163; }
  50% { stroke-dashoffset: 30; }
  100% { stroke-dashoffset: 163; }
}

@keyframes pulse-glow {
  0%, 100% { opacity: 0.4; transform: scale(1); }
  50% { opacity: 0.7; transform: scale(1.2); }
}

@keyframes fade-up {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes bounce-in {
  0% { transform: scale(0.5); opacity: 0; }
  70% { transform: scale(1.1); }
  100% { transform: scale(1); opacity: 1; }
}
</style>
