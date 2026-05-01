<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed, provide } from 'vue'
import { useProjectStore } from '@/stores/project'
import { useSubtitleStore } from '@/stores/subtitle'
import { useVideoPlayer } from '@/composables/useVideoPlayer'
import { formatTimeShort, formatTimePrecise } from '@/utils/time'
import ROISelector from '@/components/video/ROISelector.vue'

const projectStore = useProjectStore()
const subtitleStore = useSubtitleStore()

const {
  isReady,
  isLoading,
  error,
  initVideo,
  loadVideo,
  togglePlay,
  seekToFrame,
  seekRelative,
  handleKeydown,
  captureFrameAsDataURL
} = useVideoPlayer()

const videoElement = ref<HTMLVideoElement | null>(null)
const isDragOver = ref(false)
const hoverTime = ref<number | null>(null)
const hoverX = ref(0)

onMounted(() => {
  if (videoElement.value) {
    initVideo(videoElement.value)
    // Provide video control functions for Timeline thumbnail preview
    provide('seekToFrame', seekToFrame)
    provide('captureFrame', captureFrameAsDataURL)
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

const currentSubtitle = computed(() => {
  if (!projectStore.hasVideo || subtitleStore.subtitles.length === 0) return null
  return subtitleStore.subtitles.find(s =>
    projectStore.currentTime >= s.startTime && projectStore.currentTime <= s.endTime
  ) ?? null
})

const hasVideo = computed(() => projectStore.hasVideo)
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
      <!-- ── Empty State ───────────────────────────── -->
      <Transition name="state">
        <div v-if="!hasVideo" class="empty-state" :class="{ 'drag-over': isDragOver }">
          <div class="empty-content">
            <div class="empty-icon">
              <svg viewBox="0 0 64 64" fill="none" class="empty-icon-svg">
                <rect x="8" y="16" width="48" height="32" rx="6" stroke="currentColor" stroke-width="2"/>
                <path d="M26 26l14 6-14 6V26z" fill="currentColor" opacity="0.8"/>
              </svg>
            </div>
            <h3 class="empty-title">导入视频开始提取</h3>
            <p class="empty-desc">拖拽视频文件到此处，或点击下方按钮选择</p>
            <button class="import-btn" @click="handleFileSelect">
              <svg viewBox="0 0 20 20" fill="none" class="btn-icon">
                <path d="M3 7v9a2 2 0 002 2h10a2 2 0 002-2V7M10 3v10m0-10L6 7m4-4l4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              选择视频文件
            </button>
            <p class="empty-formats">支持 MP4 · MKV · AVI · MOV · WebM</p>
          </div>

          <!-- Drop Overlay -->
          <Transition name="drop">
            <div v-if="isDragOver" class="drop-overlay">
              <div class="drop-inner">
                <svg viewBox="0 0 48 48" fill="none" class="drop-icon">
                  <path d="M24 8v24M14 22l10 10 10-10" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M8 36h32" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
                </svg>
                <span class="drop-text">释放以导入视频</span>
              </div>
            </div>
          </Transition>
        </div>
      </Transition>

      <!-- ── Video Element ────────────────────────── -->
      <Transition name="state">
        <div v-if="hasVideo" class="video-wrapper">
          <video
            ref="videoElement"
            class="video-element"
            preload="metadata"
            @click="togglePlay"
          />

          <!-- Subtitle Overlay -->
          <Transition name="subtitle">
            <div v-if="currentSubtitle" class="subtitle-overlay">
              <div class="subtitle-text">{{ currentSubtitle.text }}</div>
            </div>
          </Transition>

          <!-- ROI Selector -->
          <ROISelector
            v-if="isReady"
            :video-width="projectStore.videoMeta?.width ?? 1920"
            :video-height="projectStore.videoMeta?.height ?? 1080"
            @update="handleROIUpdate"
          />
        </div>
      </Transition>

      <!-- ── Loading State ─────────────────────────── -->
      <Transition name="fade">
        <div v-if="isLoading" class="loading-overlay">
          <div class="loading-ring">
            <svg viewBox="0 0 60 60" class="ring-svg">
              <circle cx="30" cy="30" r="24" class="ring-track"/>
              <circle cx="30" cy="30" r="24" class="ring-progress"/>
            </svg>
          </div>
          <span class="loading-text">正在分析视频...</span>
        </div>
      </Transition>

      <!-- ── Error State ───────────────────────────── -->
      <Transition name="fade">
        <div v-if="error" class="error-state">
          <svg viewBox="0 0 24 24" fill="none" class="error-icon">
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.5"/>
            <path d="M12 7v5M12 15.5v.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
          <span class="error-text">{{ error }}</span>
        </div>
      </Transition>
    </div>

    <!-- ── Controls ───────────────────────────────── -->
    <div class="video-controls">
      <!-- Play/Pause -->
      <button
        class="ctrl-btn ctrl-play"
        @click="togglePlay"
        :disabled="!hasVideo"
        :title="projectStore.isPlaying ? '暂停' : '播放'"
      >
        <svg v-if="projectStore.isPlaying" viewBox="0 0 24 24" fill="none" class="ctrl-icon">
          <rect x="6" y="4" width="4" height="16" rx="1" fill="currentColor"/>
          <rect x="14" y="4" width="4" height="16" rx="1" fill="currentColor"/>
        </svg>
        <svg v-else viewBox="0 0 24 24" fill="none" class="ctrl-icon">
          <path d="M6 4l14 8-14 8V4z" fill="currentColor"/>
        </svg>
      </button>

      <!-- Skip -->
      <button class="ctrl-btn" @click="seekRelative(-10)" :disabled="!hasVideo" title="后退10秒">
        <svg viewBox="0 0 24 24" fill="none" class="ctrl-icon">
          <path d="M12.5 8l-4 4 4 4M8 12h7.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>

      <button class="ctrl-btn" @click="seekRelative(10)" :disabled="!hasVideo" title="前进10秒">
        <svg viewBox="0 0 24 24" fill="none" class="ctrl-icon">
          <path d="M11.5 8l4 4-4 4M16 12H8.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>

      <!-- Timeline -->
      <div
        class="timeline"
        @click="handleProgressClick"
        @mousemove="handleTimelineHover"
        @mouseleave="handleTimelineLeave"
      >
        <!-- Hover bubble -->
        <div
          v-if="hoverTime !== null && hasVideo"
          class="timeline-bubble"
          :style="{ left: `${hoverX}px` }"
        >
          {{ formatTimePrecise(hoverTime) }}
        </div>

        <!-- Subtitle markers -->
        <div class="timeline-markers">
          <div
            v-for="sub in subtitleStore.subtitles.slice(0, 50)"
            :key="sub.id"
            class="marker"
            :style="{
              left: `${(sub.startTime / projectStore.duration) * 100}%`,
              width: `${Math.max(1, ((sub.endTime - sub.startTime) / projectStore.duration) * 100)}%`
            }"
            :class="{ active: sub.id === subtitleStore.selectedId }"
          />
        </div>

        <div class="timeline-track">
          <!-- Subtitle bands -->
          <div
            v-for="sub in subtitleStore.subtitles.slice(0, 20)"
            :key="`band-${sub.id}`"
            class="timeline-band"
            :style="{
              left: `${(sub.startTime / projectStore.duration) * 100}%`,
              width: `${Math.max(0.5, ((sub.endTime - sub.startTime) / projectStore.duration) * 100)}%`,
              opacity: sub.id === subtitleStore.selectedId ? 0.4 : 0.15
            }"
          />
          <div class="timeline-fill" :style="{ width: `${projectStore.progress}%` }"/>
          <div class="timeline-head" :style="{ left: `${projectStore.progress}%` }"/>
        </div>
      </div>

      <!-- Time display -->
      <div class="time-display">
        <span class="time-current">{{ formatTimeShort(projectStore.currentTime) }}</span>
        <span class="time-sep">/</span>
        <span class="time-total">{{ formatTimeShort(projectStore.duration) }}</span>
      </div>

      <!-- Frame counter -->
      <div class="frame-counter" v-if="hasVideo">
        <span class="frame-label">F</span>
        <span class="frame-num">{{ projectStore.currentFrame.toLocaleString() }}</span>
      </div>
    </div>
  </main>
</template>

<style lang="scss" scoped>
.video-preview {
  flex: 1;
  display: flex;
  @include flex-column;
  background: var(--bg-base);
  overflow: hidden;
}

.video-container {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  padding: $space-6;
}

// ── Empty State ───────────────────────────────────────────────
.empty-state {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1.5px dashed var(--border);
  border-radius: var(--radius-xl);
  background: linear-gradient(
    135deg,
    rgba($primary, 0.02) 0%,
    rgba($accent, 0.02) 100%
  );
  position: relative;
  transition: border-color $duration-normal $ease-out-expo,
              background $duration-normal $ease-out-expo;

  &.drag-over {
    border-color: var(--primary);
    border-style: solid;
    background: rgba($primary, 0.04);
  }
}

.empty-content {
  text-align: center;
  max-width: 320px;
  @include entrance;
}

.empty-icon {
  margin-bottom: $space-6;
}

.empty-icon-svg {
  width: 64px;
  height: 64px;
  color: $gray-500;
  margin: 0 auto;
}

.empty-title {
  font-size: $text-base;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: $tracking-tight;
  margin-bottom: $space-2;
}

.empty-desc {
  font-size: $text-xs;
  color: $gray-500;
  margin-bottom: $space-6;
  line-height: $leading-relaxed;
}

.import-btn {
  @include btn-primary;
  padding: $space-3 $space-6;
  margin-bottom: $space-4;

  .btn-icon {
    width: 16px;
    height: 16px;
  }
}

.empty-formats {
  font-size: $text-2xs;
  color: $gray-600;
  letter-spacing: $tracking-wide;
}

// ── Drop Overlay ──────────────────────────────────────────────
.drop-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba($primary, 0.06);
  border-radius: var(--radius-xl);
  border: 2px solid var(--primary);
  backdrop-filter: blur(4px);
}

.drop-inner {
  display: flex;
  @include flex-column;
  align-items: center;
  gap: $space-3;
}

.drop-icon {
  width: 48px;
  height: 48px;
  color: var(--primary);
}

.drop-text {
  font-size: $text-sm;
  font-weight: 600;
  color: var(--primary);
}

// ── Video Wrapper ─────────────────────────────────────────────
.video-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.video-element {
  max-width: 100%;
  max-height: 100%;
  border-radius: var(--radius-md);
  cursor: pointer;
}

// ── Subtitle Overlay ──────────────────────────────────────────
.subtitle-overlay {
  position: absolute;
  bottom: $space-6;
  left: 50%;
  transform: translateX(-50%);
  pointer-events: none;
  z-index: $z-raised;
}

.subtitle-text {
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(12px);
  color: white;
  padding: $space-2 $space-5;
  border-radius: var(--radius-md);
  font-size: $text-xs;
  font-weight: 600;
  white-space: nowrap;
  border: 1px solid rgba(255,255,255,0.1);
  box-shadow: $shadow-lg;
}

// ── Loading ───────────────────────────────────────────────────
.loading-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  @include flex-column;
  align-items: center;
  justify-content: center;
  gap: $space-4;
  background: rgba($gray-950, 0.9);
  backdrop-filter: blur(8px);
}

.loading-ring {
  position: relative;
  width: 56px;
  height: 56px;
}

.ring-svg {
  width: 56px;
  height: 56px;
  transform: rotate(-90deg);
}

.ring-track {
  fill: none;
  stroke: $gray-700;
  stroke-width: 4;
}

.ring-progress {
  fill: none;
  stroke: var(--primary);
  stroke-width: 4;
  stroke-linecap: round;
  stroke-dasharray: 150;
  stroke-dashoffset: 40;
  animation: ring 1.5s $ease-out-expo infinite;
  filter: drop-shadow(0 0 6px rgba($primary, 0.5));
}

.loading-text {
  font-size: $text-xs;
  color: $gray-400;
  letter-spacing: $tracking-wide;
}

// ── Error State ───────────────────────────────────────────────
.error-state {
  position: absolute;
  inset: 0;
  display: flex;
  @include flex-column;
  align-items: center;
  justify-content: center;
  gap: $space-3;
  background: rgba($gray-950, 0.92);
}

.error-icon {
  width: 48px;
  height: 48px;
  color: $error;
}

.error-text {
  font-size: $text-xs;
  color: $error;
  font-weight: 500;
}

// ── Controls ──────────────────────────────────────────────────
.video-controls {
  height: 56px;
  background: var(--bg-surface);
  border-top: 1px solid var(--border);
  display: flex;
  align-items: center;
  padding: 0 $space-4;
  gap: $space-3;
}

.ctrl-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-md);
  color: var(--text-secondary);
  flex-shrink: 0;
  @include pressable;
  @include focus-ring;

  &:hover:not(:disabled) {
    background: var(--bg-overlay);
    color: var(--text-primary);
  }

  &:disabled {
    opacity: 0.25;
  }
}

.ctrl-play {
  background: var(--primary);
  color: white;
  width: 40px;
  height: 40px;
  border-radius: var(--radius-lg);
  box-shadow: 0 2px 8px rgba($primary, 0.35);

  &:hover:not(:disabled) {
    background: lighten($primary, 8%);
    box-shadow: 0 4px 16px rgba($primary, 0.45);
    color: white;
  }
}

.ctrl-icon {
  width: 18px;
  height: 18px;
}

// ── Timeline ──────────────────────────────────────────────────
.timeline {
  flex: 1;
  position: relative;
  height: 40px;
  cursor: pointer;
  display: flex;
  align-items: center;
}

.timeline-bubble {
  position: absolute;
  top: -28px;
  transform: translateX(-50%);
  background: var(--bg-elevated);
  color: var(--text-primary);
  font-family: $font-mono;
  font-size: $text-2xs;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  white-space: nowrap;
  pointer-events: none;
  z-index: $z-raised;
  box-shadow: $shadow-sm;
}

.timeline-markers {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 100%;
  pointer-events: none;
}

.marker {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  height: 3px;
  background: rgba($conf-mid, 0.5);
  border-radius: $radius-full;

  &.active {
    background: $conf-mid;
    box-shadow: 0 0 6px rgba($conf-mid, 0.4);
  }
}

.timeline-track {
  position: relative;
  width: 100%;
  height: 5px;
  background: var(--bg-overlay);
  border-radius: $radius-full;
}

.timeline-band {
  position: absolute;
  top: 0;
  height: 100%;
  background: $accent;
  border-radius: 2px;
  transition: opacity $duration-fast $ease-out-expo;
}

.timeline-fill {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  background: var(--primary);
  border-radius: $radius-full;
  transition: width 50ms linear;
}

.timeline-head {
  position: absolute;
  top: 50%;
  width: 14px;
  height: 14px;
  transform: translate(-50%, -50%);
  transition: left 50ms linear;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: white;
    border-radius: 50%;
    box-shadow: $shadow-sm;
    transition: transform $duration-fast $ease-out-expo;
  }
}

.timeline:hover .timeline-head::before {
  transform: scale(1.25);
}

// ── Time Display ──────────────────────────────────────────────
.time-display {
  font-family: $font-mono;
  font-size: $text-xs;
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}

.time-current {
  color: var(--text-primary);
  font-weight: 600;
}

.time-sep {
  color: $gray-600;
}

.time-total {
  color: $gray-500;
}

.frame-counter {
  display: flex;
  align-items: center;
  gap: 4px;
  font-family: $font-mono;
  font-size: $text-2xs;
  flex-shrink: 0;
}

.frame-label {
  color: $gray-600;
  font-weight: 600;
}

.frame-num {
  color: $gray-400;
  min-width: 48px;
  text-align: right;
}

// ── Transitions ───────────────────────────────────────────────
.state-enter-active {
  transition: opacity $duration-slow $ease-out-expo,
              transform $duration-slow $ease-out-expo;
}
.state-leave-active {
  transition: opacity $duration-normal $ease-out-expo;
}
.state-enter-from {
  opacity: 0;
  transform: scale(0.98);
}
.state-leave-to {
  opacity: 0;
}

.drop-enter-active {
  transition: opacity $duration-normal $ease-out-expo,
              transform $duration-normal $ease-out-expo;
}
.drop-leave-active {
  transition: opacity $duration-fast $ease-out-expo;
}
.drop-enter-from {
  opacity: 0;
  transform: scale(0.96);
}
.drop-leave-to {
  opacity: 0;
}

.subtitle-enter-active {
  transition: opacity $duration-normal $ease-out-expo,
              transform $duration-normal $ease-out-expo;
}
.subtitle-leave-active {
  transition: opacity $duration-fast $ease-out-expo;
}
.subtitle-enter-from {
  opacity: 0;
  transform: translateX(-50%) translateY(6px);
}
.subtitle-leave-to {
  opacity: 0;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity $duration-normal $ease-out-expo;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
