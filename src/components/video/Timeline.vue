<script setup lang="ts">
import { ref, computed, onUnmounted, inject } from 'vue'
import { useProjectStore } from '@/stores/project'
import { useSubtitleStore } from '@/stores/subtitle'
import { formatFrameToTime } from '@/utils/time'

const projectStore = useProjectStore()
const subtitleStore = useSubtitleStore()

const emit = defineEmits<{
  (e: 'seek', frame: number): void
  (e: 'select', id: string): void
}>()

// Timeline zoom level (frames per pixel)
const zoomLevel = ref(1)
const isDragging = ref(false)
const isHovering = ref(false)
const hoverFrame = ref(0)
const hoverPosition = ref({ x: 0, y: 0 })
const hoverThumbnail = ref<string | null>(null)

// Keyboard navigation state
const focusedMarkerIndex = ref(-1)
const timelineRef = ref<HTMLElement | null>(null)

// Video control functions from VideoPreview
const seekToFrame = inject<(frame: number) => void>('seekToFrame')
const captureFrame = inject<() => string | null>('captureFrame')

// Debounce thumbnail capture for performance
let thumbnailTimeout: ReturnType<typeof setTimeout> | null = null

// Seek and capture thumbnail at given frame
async function captureThumbnailAtFrame(frame: number) {
  if (!seekToFrame || !captureFrame) return null
  
  // Seek to the frame
  seekToFrame(frame)
  
  // Wait for video to actually seek (seeked event)
  await new Promise<void>(resolve => {
    const videoEl = document.querySelector('video')
    if (!videoEl) {
      resolve()
      return
    }
    const handler = () => {
      videoEl.removeEventListener('seeked', handler)
      resolve()
    }
    videoEl.addEventListener('seeked', handler)
    // Timeout fallback
    setTimeout(resolve, 200)
  })
  
  return captureFrame()
}

function getFrameFromEvent(e: MouseEvent): number {
  const target = document.querySelector('.timeline-track') as HTMLElement
  if (!target) return 0
  const rect = target.getBoundingClientRect()
  const x = e.clientX - rect.left
  const percent = Math.max(0, Math.min(1, x / rect.width))
  return Math.floor(percent * totalFrames.value)
}

function handlePlayheadMouseDown(e: MouseEvent) {
  e.preventDefault()
  e.stopPropagation()
  isDragging.value = true
  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)
}

function handleMouseMove(e: MouseEvent) {
  if (!isDragging.value) return
  const frame = getFrameFromEvent(e)
  emit('seek', Math.max(0, Math.min(frame, totalFrames.value - 1)))
}

function handleMouseUp() {
  isDragging.value = false
  document.removeEventListener('mousemove', handleMouseMove)
  document.removeEventListener('mouseup', handleMouseUp)
}

function handleTimelineHover(e: MouseEvent) {
  const track = document.querySelector('.timeline-track') as HTMLElement
  if (!track) return
  const rect = track.getBoundingClientRect()
  const x = e.clientX - rect.left
  const percent = Math.max(0, Math.min(1, x / rect.width))
  hoverFrame.value = Math.floor(percent * totalFrames.value)
  hoverPosition.value = { x: e.clientX - rect.left, y: e.clientY - rect.top }
  isHovering.value = true

  // Capture thumbnail with debounce for performance
  if (thumbnailTimeout) clearTimeout(thumbnailTimeout)
  thumbnailTimeout = setTimeout(async () => {
    if (seekToFrame && captureFrame) {
      hoverThumbnail.value = await captureThumbnailAtFrame(hoverFrame.value)
    }
  }, 100)
}

function handleTimelineLeave() {
  isHovering.value = false
}

onUnmounted(() => {
  document.removeEventListener('mousemove', handleMouseMove)
  document.removeEventListener('mouseup', handleMouseUp)
})

// ── Keyboard Navigation ──────────────────────────────────────
function handleTimelineKeydown(e: KeyboardEvent) {
  if (subtitleMarkers.value.length === 0) return
  
  switch (e.key) {
    case 'ArrowLeft':
      e.preventDefault()
      // Move to previous marker or playhead
      if (focusedMarkerIndex.value > 0) {
        focusedMarkerIndex.value--
      } else {
        // Jump to previous subtitle before current frame
        const currentFrame = projectStore.currentFrame
        const prevMarker = [...subtitleMarkers.value]
          .reverse()
          .find(m => m.endFrame < currentFrame - 1)
        if (prevMarker) {
          emit('seek', Math.max(0, prevMarker.frame - 1))
        } else {
          emit('seek', Math.max(0, currentFrame - fps.value)) // Back ~1 second
        }
      }
      break
      
    case 'ArrowRight':
      e.preventDefault()
      // Move to next marker or playhead
      if (focusedMarkerIndex.value < subtitleMarkers.value.length - 1) {
        focusedMarkerIndex.value++
      } else {
        // Jump to next subtitle after current frame
        const currentFrame = projectStore.currentFrame
        const nextMarker = subtitleMarkers.value
          .find(m => m.frame > currentFrame + 1)
        if (nextMarker) {
          emit('seek', nextMarker.frame)
        } else {
          emit('seek', Math.min(totalFrames.value - 1, currentFrame + fps.value)) // Forward ~1 second
        }
      }
      break
      
    case 'Enter':
    case ' ':
      e.preventDefault()
      // Select/seek to focused marker or current position
      if (focusedMarkerIndex.value >= 0 && focusedMarkerIndex.value < subtitleMarkers.value.length) {
        const marker = subtitleMarkers.value[focusedMarkerIndex.value]
        emit('select', marker.id)
        emit('seek', marker.frame)
      }
      break
      
    case 'Home':
      e.preventDefault()
      focusedMarkerIndex.value = 0
      emit('seek', 0)
      break
      
    case 'End':
      e.preventDefault()
      focusedMarkerIndex.value = subtitleMarkers.value.length - 1
      emit('seek', totalFrames.value - 1)
      break
      
    case 'Escape':
      e.preventDefault()
      focusedMarkerIndex.value = -1
      timelineRef.value?.blur()
      break
  }
}

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

const currentTime = computed(() => formatFrameToTime(projectStore.currentFrame, fps.value))
const totalTime = computed(() => formatFrameToTime(totalFrames.value, fps.value))
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
          {{ formatFrameToTime(i * fps * 10, fps) }}
        </span>
      </div>

      <!-- Track -->
      <div
        class="timeline-track"
        tabindex="0"
        role="slider"
        :aria-valuenow="projectStore.currentFrame"
        :aria-valuemin="0"
        :aria-valuemax="totalFrames"
        aria-label="Timeline navigation"
        @click="handleTimelineClick"
        @mousemove="handleTimelineHover"
        @mouseleave="handleTimelineLeave"
        @keydown="handleTimelineKeydown"
        ref="timelineRef"
      >
        <!-- Subtitle Markers -->
        <div
          v-for="marker in subtitleMarkers"
          :key="marker.id"
          v-memo="[marker.id, marker.frame, marker.endFrame]"
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
          :class="{ dragging: isDragging }"
          :style="{ left: `${playheadPosition}%` }"
          @mousedown="handlePlayheadMouseDown"
        >
          <div class="playhead-head"/>
          <div class="playhead-line"/>
        </div>
      </div>

      <!-- Hover Preview Tooltip -->
      <div
        v-if="isHovering || isDragging"
        class="timeline-preview"
        :style="{
          left: `${(hoverFrame / totalFrames) * 100}%`,
          transform: 'translateX(-50%)'
        }"
      >
        <img
          v-if="hoverThumbnail"
          :src="hoverThumbnail"
          class="preview-thumbnail"
          alt="Frame preview"
        />
        <span class="preview-time">{{ formatFrameToTime(hoverFrame, fps) }}</span>
        <span class="preview-frame">#{{ hoverFrame.toLocaleString() }}</span>
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
  @include flex-column;
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
  overflow: visible;
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

  &:focus-visible {
    outline: 2px solid var(--primary);
    outline-offset: 1px;
    transform: scaleY(1.1);
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
  width: 3px;
  transform: translateX(-50%);
  z-index: $z-dropdown;
  cursor: grab;
  // Enhanced glow effect for better visibility
  filter: drop-shadow(0 0 6px rgba($primary, 0.6));
  
  &.dragging {
    cursor: grabbing;
    width: 4px;
    filter: drop-shadow(0 0 10px rgba($primary, 0.8));
    
    .playhead-head::after {
      animation-duration: 0.8s; // Faster pulse when dragging
    }
  }
}

.playhead-head {
  position: absolute;
  top: -2px;
  left: 50%;
  transform: translateX(-50%);
  width: 12px;
  height: 12px;
  background: var(--primary);
  border-radius: 50%;
  box-shadow: 
    0 0 0 2px var(--bg-surface),
    0 0 12px rgba($primary, 0.6),
    0 0 24px rgba($primary, 0.3);
  transition: 
    transform $duration-fast $ease-out-expo,
    box-shadow $duration-fast $ease-out-expo;

  // Outer glow ring
  &::after {
    content: '';
    position: absolute;
    inset: -4px;
    background: rgba($primary, 0.2);
    border-radius: 50%;
    animation: head-pulse 2s ease-in-out infinite;
    z-index: -1;
  }
}

.playhead-line {
  position: absolute;
  top: 10px;
  bottom: 0;
  left: 50%;
  width: 3px;
  transform: translateX(-50%);
  background: linear-gradient(180deg, var(--primary) 0%, rgba($primary, 0.6) 100%);
  box-shadow: 
    0 0 8px rgba($primary, 0.5),
    0 2px 4px rgba(0, 0, 0, 0.3);
  
  // Add bottom handle indicator
  &::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 0;
    height: 0;
    border-left: 6px solid transparent;
    border-right: 6px solid transparent;
    border-top: 8px solid var(--primary);
    filter: drop-shadow(0 2px 4px rgba($primary, 0.4));
  }
}

.timeline-track:hover .playhead-head {
  transform: translateX(-50%) scale(1.25);
  box-shadow: 
    0 0 0 2px var(--bg-surface),
    0 0 16px rgba($primary, 0.7),
    0 0 32px rgba($primary, 0.4);
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

// ── Hover Preview ────────────────────────────────────────────
.timeline-preview {
  position: absolute;
  top: -28px;
  padding: $space-1 $space-2;
  background: $bg-overlay;
  border: 1px solid $border;
  border-radius: $radius-md;
  display: flex;
  @include flex-column;
  align-items: center;
  gap: 2px;
  pointer-events: none;
  z-index: $z-overlay;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  white-space: nowrap;
  
  &::after {
    content: '';
    position: absolute;
    bottom: -5px;
    left: 50%;
    transform: translateX(-50%);
    border: 5px solid transparent;
    border-top-color: $bg-overlay;
  }
}

.preview-time {
  font-family: $font-mono;
  font-size: $text-xs;
  font-weight: 600;
  color: $text-primary;
}

.preview-frame {
  font-family: $font-mono;
  font-size: 9px;
  color: $text-muted;
}

.preview-thumbnail {
  width: 160px;
  height: 90px;
  object-fit: contain;
  border-radius: $radius-sm;
  background: $bg-surface;
  margin-bottom: 4px;
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
