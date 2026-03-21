<script setup lang="ts">
import { ref, computed, watch } from 'vue'
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

// Timeline scroll position
const scrollLeft = ref(0)

// Thumbnails cache
const thumbnails = ref<Map<number, string>>(new Map())

// Computed
const totalFrames = computed(() => projectStore.videoMeta?.totalFrames ?? 0)
const duration = computed(() => projectStore.videoMeta?.duration ?? 0)
const fps = computed(() => projectStore.videoMeta?.fps ?? 30)

// Frame markers for subtitles
const subtitleMarkers = computed(() => {
  return subtitleStore.subtitles.map(sub => ({
    id: sub.id,
    frame: sub.startFrame,
    endFrame: sub.endFrame,
    text: sub.text
  }))
})

// Current playhead position
const playheadPosition = computed(() => {
  if (totalFrames.value === 0) return 0
  return (projectStore.currentFrame / totalFrames.value) * 100
})

// Format time display
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

// Handle timeline click
function handleTimelineClick(e: MouseEvent) {
  const target = e.currentTarget as HTMLElement
  const rect = target.getBoundingClientRect()
  const x = e.clientX - rect.left
  const percent = x / rect.width
  const frame = Math.floor(percent * totalFrames.value)
  
  emit('seek', Math.max(0, Math.min(frame, totalFrames.value - 1)))
}

// Handle subtitle marker click
function handleMarkerClick(e: MouseEvent, marker: typeof subtitleMarkers.value[0]) {
  e.stopPropagation()
  emit('select', marker.id)
  emit('seek', marker.frame)
}

// Zoom controls
function zoomIn() {
  zoomLevel.value = Math.min(zoomLevel.value * 1.5, 10)
}

function zoomOut() {
  zoomLevel.value = Math.max(zoomLevel.value / 1.5, 0.1)
}

function resetZoom() {
  zoomLevel.value = 1
}
</script>

<template>
  <div class="timeline-component">
    <!-- Timeline Header -->
    <div class="timeline-header">
      <div class="timeline-controls">
        <button class="ctrl-btn" @click="zoomOut" title="缩小">➖</button>
        <span class="zoom-level">{{ Math.round(zoomLevel * 100) }}%</span>
        <button class="ctrl-btn" @click="zoomIn" title="放大">➕</button>
        <button class="ctrl-btn" @click="resetZoom" title="重置">🔄</button>
      </div>
      
      <div class="time-display">
        <span class="current-time">{{ formatTime(projectStore.currentFrame) }}</span>
        <span class="separator">/</span>
        <span class="total-time">{{ formatTime(totalFrames) }}</span>
      </div>
    </div>
    
    <!-- Timeline Track -->
    <div class="timeline-track-container">
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
            width: `${((marker.endFrame - marker.frame) / totalFrames) * 100}%`
          }"
          @click="handleMarkerClick($event, marker)"
          :title="marker.text"
        >
          <span class="marker-label">{{ marker.text.slice(0, 20) }}</span>
        </div>
        
        <!-- Playhead -->
        <div 
          class="playhead"
          :style="{ left: `${playheadPosition}%` }"
        >
          <div class="playhead-head"></div>
          <div class="playhead-line"></div>
        </div>
      </div>
    </div>
    
    <!-- Frame Info -->
    <div class="timeline-footer">
      <div class="frame-info">
        <span class="info-item">
          <span class="label">帧:</span>
          <span class="value">#{{ projectStore.currentFrame }}</span>
        </span>
        <span class="info-item">
          <span class="label">FPS:</span>
          <span class="value">{{ fps }}</span>
        </span>
      </div>
      
      <div class="subtitle-info">
        <span class="info-item">
          <span class="label">字幕:</span>
          <span class="value">{{ subtitleStore.totalCount }} 条</span>
        </span>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.timeline-component {
  background: $bg-surface;
  border-top: 1px solid $border;
  padding: $space-3;
}

.timeline-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: $space-3;
}

.timeline-controls {
  display: flex;
  align-items: center;
  gap: $space-2;
}

.ctrl-btn {
  width: 24px;
  height: 24px;
  @include flex-center;
  font-size: 12px;
  background: $bg-overlay;
  border-radius: $radius-sm;
  transition: all $transition-fast;
  
  &:hover {
    background: $border;
  }
}

.zoom-level {
  font-family: $font-display;
  font-size: $text-xs;
  color: $text-muted;
  min-width: 40px;
  text-align: center;
}

.time-display {
  font-family: $font-display;
  font-size: $text-sm;
  
  .current-time {
    color: $text-primary;
  }
  
  .separator {
    color: $text-muted;
    margin: 0 $space-1;
  }
  
  .total-time {
    color: $text-muted;
  }
}

.timeline-track-container {
  position: relative;
  height: 48px;
  overflow-x: auto;
  overflow-y: hidden;
  @include custom-scrollbar;
}

.timeline-ruler {
  position: relative;
  height: 16px;
  background: $bg-elevated;
  border-radius: $radius-sm $radius-sm 0 0;
}

.ruler-mark {
  position: absolute;
  font-family: $font-display;
  font-size: 9px;
  color: $text-muted;
  transform: translateX(-50%);
  padding-top: 2px;
}

.timeline-track {
  position: relative;
  height: 32px;
  background: $bg-elevated;
  border-radius: 0 0 $radius-sm $radius-sm;
  cursor: pointer;
  
  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: repeating-linear-gradient(
      90deg,
      transparent,
      transparent 9px,
      $border 9px,
      $border 10px
    );
    opacity: 0.3;
  }
}

.subtitle-marker {
  position: absolute;
  top: 4px;
  height: 24px;
  min-width: 4px;
  background: $secondary;
  border-radius: $radius-sm;
  opacity: 0.7;
  cursor: pointer;
  transition: all $transition-fast;
  overflow: hidden;
  
  &:hover {
    opacity: 1;
    transform: scaleY(1.1);
  }
  
  &.selected {
    opacity: 1;
    background: $primary;
    box-shadow: $shadow-glow-primary;
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
  max-width: 100%;
  padding: 0 4px;
}

.playhead {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 2px;
  transform: translateX(-50%);
  z-index: 10;
}

.playhead-head {
  width: 12px;
  height: 12px;
  background: $primary;
  border-radius: 50%;
  margin-left: -5px;
  box-shadow: $shadow-glow-primary;
}

.playhead-line {
  width: 2px;
  height: calc(100% - 12px);
  background: $primary;
  margin-left: 0;
  box-shadow: 0 0 8px rgba($primary, 0.5);
}

.timeline-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: $space-2;
  padding-top: $space-2;
  border-top: 1px solid $border;
}

.frame-info,
.subtitle-info {
  display: flex;
  gap: $space-4;
}

.info-item {
  display: flex;
  align-items: center;
  gap: $space-1;
  font-family: $font-display;
  font-size: $text-xs;
  
  .label {
    color: $text-muted;
  }
  
  .value {
    color: $text-secondary;
  }
}
</style>
