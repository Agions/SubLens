<script setup lang="ts">
import { ref, computed } from 'vue'
import { useProjectStore } from '@/stores/project'
import { useSubtitleStore } from '@/stores/subtitle'

const projectStore = useProjectStore()
const subtitleStore = useSubtitleStore()

const emit = defineEmits<{
  (e: 'seek', frame: number): void
  (e: 'select', id: string): void
}>()

// Timeline zoom level (frames per pixel)
const zoomLevel = ref(1)

const totalFrames = computed(() => projectStore.videoMeta?.totalFrames ?? 0)
const fps = computed(() => projectStore.videoMeta?.fps ?? 30)

const subtitleMarkers = computed(() => {
  return subtitleStore.subtitles.map(sub => ({
    id: sub.id,
    frame: sub.startFrame,
    endFrame: sub.endFrame,
    text: sub.text
  }))
})

const playheadPosition = computed(() => {
  if (totalFrames.value === 0) return 0
  return (projectStore.currentFrame / totalFrames.value) * 100
})

function formatTime(frame: number): string {
  const seconds = frame / fps.value
  const hrs = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)

  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function handleTimelineClick(e: MouseEvent) {
  const target = e.currentTarget as HTMLElement
  const rect = target.getBoundingClientRect()
  const x = e.clientX - rect.left
  const percent = x / rect.width
  const frame = Math.floor(percent * totalFrames.value)

  emit('seek', Math.max(0, Math.min(frame, totalFrames.value - 1)))
}

function handleMarkerClick(e: MouseEvent, marker: typeof subtitleMarkers.value[0]) {
  e.stopPropagation()
  emit('select', marker.id)
  emit('seek', marker.frame)
}

function zoomIn() {
  zoomLevel.value = Math.min(zoomLevel.value * 1.5, 10)
}

function zoomOut() {
  zoomLevel.value = Math.max(zoomLevel.value / 1.5, 0.1)
}

function resetZoom() {
  zoomLevel.value = 1
}

const currentTime = computed(() => formatTime(projectStore.currentFrame))
const totalTime = computed(() => formatTime(totalFrames.value))
const currentFrame = computed(() => projectStore.currentFrame)
const subtitleCount = computed(() => subtitleStore.totalCount)
</script>

<template>
  <div class="timeline-component">
    <!-- ── Header ─────────────────────────────────── -->
    <div class="timeline-header">
      <div class="header-left">
        <div class="zoom-controls">
          <button class="zoom-btn" @click="zoomOut" title="缩小">
            <svg viewBox="0 0 16 16" fill="none" class="zoom-icon">
              <path d="M3 8h10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
          </button>
          <span class="zoom-level">{{ Math.round(zoomLevel * 100) }}%</span>
          <button class="zoom-btn" @click="zoomIn" title="放大">
            <svg viewBox="0 0 16 16" fill="none" class="zoom-icon">
              <path d="M8 3v10M3 8h10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
          </button>
          <button class="zoom-btn" @click="resetZoom" title="重置">
            <svg viewBox="0 0 16 16" fill="none" class="zoom-icon">
              <path d="M2 8a6 6 0 1011.5-2.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
              <path d="M2 5V8h3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </div>
      </div>

      <div class="header-right">
        <span class="time-display">
          <span class="time-current">{{ currentTime }}</span>
          <span class="time-sep">/</span>
          <span class="time-total">{{ totalTime }}</span>
        </span>
      </div>
    </div>

    <!-- ── Timeline Track ─────────────────────────── -->
    <div class="timeline-body">
      <!-- Ruler -->
      <div class="timeline-ruler">
        <span
          v-for="i in Math.ceil(totalFrames / (fps * 10))"
          :key="i"
          class="ruler-mark"
          :style="{ left: `${(i * fps * 10 / totalFrames) * 100}%` }"
        >
          {{ formatTime(i * fps * 10) }}
        </span>
      </div>

      <!-- Track -->
      <div
        class="timeline-track"
        @click="handleTimelineClick"
      >
        <!-- Subtitle Markers -->
        <div
          v-for="marker in subtitleMarkers"
          :key="marker.id"
          class="subtitle-marker"
          :class="{ selected: subtitleStore.selectedId === marker.id }"
          :style="{
            left: `${(marker.frame / totalFrames) * 100}%`,
            width: `${Math.max(0.1, ((marker.endFrame - marker.frame) / totalFrames) * 100)}%`
          }"
          @click="handleMarkerClick($event, marker)"
          :title="marker.text"
        >
          <span class="marker-label">{{ marker.text.slice(0, 16) }}</span>
        </div>

        <!-- Playhead -->
        <div
          class="playhead"
          :style="{ left: `${playheadPosition}%` }"
        >
          <div class="playhead-head"/>
          <div class="playhead-line"/>
        </div>
      </div>
    </div>

    <!-- ── Footer ─────────────────────────────────── -->
    <div class="timeline-footer">
      <div class="footer-left">
        <span class="stat-item">
          <span class="stat-label">帧</span>
          <span class="stat-value">#{{ currentFrame.toLocaleString() }}</span>
        </span>
        <span class="stat-item">
          <span class="stat-label">FPS</span>
          <span class="stat-value">{{ fps }}</span>
        </span>
      </div>
      <div class="footer-right">
        <span class="stat-item">
          <span class="stat-label">字幕</span>
          <span class="stat-value">{{ subtitleCount }} 条</span>
        </span>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.timeline-component {
  background: var(--bg-surface);
  border-top: 1px solid var(--border);
  display: flex;
  flex-direction: column;
}

.timeline-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: $space-2 $space-3;
}

.header-left {
  display: flex;
  align-items: center;
}

.zoom-controls {
  display: flex;
  align-items: center;
  gap: $space-1;
}

.zoom-btn {
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-sm);
  color: var(--text-muted);
  @include pressable;

  &:hover {
    background: var(--bg-overlay);
    color: var(--text-primary);
  }

  .zoom-icon {
    width: 14px;
    height: 14px;
  }
}

.zoom-level {
  font-family: $font-mono;
  font-size: 11px;
  color: var(--text-muted);
  min-width: 36px;
  text-align: center;
}

.time-display {
  font-family: $font-mono;
  font-size: $text-xs;
  display: flex;
  gap: 4px;
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

// ── Body ────────────────────────────────────────────────────
.timeline-body {
  position: relative;
  height: 44px;
  overflow: hidden;
}

.timeline-ruler {
  position: relative;
  height: 16px;
  background: var(--bg-elevated);
  border-radius: var(--radius-sm) var(--radius-sm) 0 0;
}

.ruler-mark {
  position: absolute;
  font-family: $font-mono;
  font-size: 9px;
  color: $gray-600;
  transform: translateX(-50%);
  padding-top: 2px;
}

.timeline-track {
  position: relative;
  height: 28px;
  background: var(--bg-elevated);
  border-radius: 0 0 var(--radius-sm) var(--radius-sm);
  cursor: pointer;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: repeating-linear-gradient(
      90deg,
      transparent,
      transparent 9px,
      var(--border) 9px,
      var(--border) 10px
    );
    opacity: 0.25;
  }
}

.subtitle-marker {
  position: absolute;
  top: 4px;
  height: 20px;
  min-width: 4px;
  background: rgba($secondary, 0.55);
  border-radius: var(--radius-sm);
  cursor: pointer;
  overflow: hidden;
  transition: background $duration-fast $ease-out-expo,
              opacity $duration-fast $ease-out-expo,
              transform $duration-fast $ease-out-expo;
  z-index: $z-raised;

  &:hover {
    background: rgba($secondary, 0.8);
    opacity: 1;
    transform: scaleY(1.05);
  }

  &.selected {
    background: var(--primary);
    opacity: 1;
    box-shadow: 0 0 8px rgba($primary, 0.4);
  }
}

.marker-label {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 9px;
  color: white;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: calc(100% - 4px);
  padding: 0 2px;
  pointer-events: none;
}

.playhead {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 2px;
  transform: translateX(-50%);
  z-index: $z-dropdown;
}

.playhead-head {
  position: absolute;
  top: -2px;
  left: 50%;
  transform: translateX(-50%);
  width: 10px;
  height: 10px;
  background: var(--primary);
  border-radius: 50%;
  box-shadow: 0 0 8px rgba($primary, 0.5);
  transition: transform $duration-fast $ease-out-expo;

  &::after {
    content: '';
    position: absolute;
    inset: -3px;
    background: rgba($primary, 0.25);
    border-radius: 50%;
    animation: head-pulse 2s ease-in-out infinite;
  }
}

.playhead-line {
  position: absolute;
  top: 8px;
  bottom: 0;
  left: 50%;
  width: 2px;
  transform: translateX(-50%);
  background: var(--primary);
  box-shadow: 0 0 6px rgba($primary, 0.4);
}

.timeline-track:hover .playhead-head {
  transform: translateX(-50%) scale(1.2);
}

// ── Footer ─────────────────────────────────────────────────
.timeline-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: $space-1 $space-3;
  border-top: 1px solid var(--border);
  background: var(--bg-elevated);
}

.footer-left,
.footer-right {
  display: flex;
  gap: $space-4;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-family: $font-mono;
  font-size: 10px;
}

.stat-label {
  color: $gray-600;
}

.stat-value {
  color: $gray-400;
}

// ── Animations ───────────────────────────────────────────────
@keyframes head-pulse {
  0%, 100% {
    opacity: 0.4;
    transform: scale(1);
  }
  50% {
    opacity: 0.7;
    transform: scale(1.3);
  }
}
</style>
