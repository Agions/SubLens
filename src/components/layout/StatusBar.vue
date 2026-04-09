<script setup lang="ts">
import { computed } from 'vue'
import { useProjectStore } from '@/stores/project'
import { useSubtitleStore } from '@/stores/subtitle'

const projectStore = useProjectStore()
const subtitleStore = useSubtitleStore()

const fps = computed(() => projectStore.videoMeta?.fps ?? 0)
const resolution = computed(() => {
  if (!projectStore.videoMeta) return 'N/A'
  return `${projectStore.videoMeta.width} × ${projectStore.videoMeta.height}`
})
const ocrEngine = computed(() => projectStore.extractOptions.ocrEngine)

const memoryUsage = computed(() => {
  // Estimate memory usage based on subtitles
  const subCount = subtitleStore.totalCount
  const estimated = subCount * 10 + 50 // ~50MB base + 10KB per subtitle
  return `~${estimated} MB`
})

const statusText = computed(() => {
  if (subtitleStore.isExtracting) {
    return `提取中 ${subtitleStore.extractProgress.toFixed(0)}%`
  }
  return '就绪'
})
</script>

<template>
  <footer class="status-bar">
    <div class="status-left">
      <span class="status-item">
        <span class="label">帧:</span>
        <span class="value mono">#{{ projectStore.currentFrame }}</span>
      </span>
      <span class="divider" />
      <span class="status-item">
        <span class="label">FPS:</span>
        <span class="value mono">{{ fps }}</span>
      </span>
      <span class="divider" />
      <span class="status-item">
        <span class="label">分辨率:</span>
        <span class="value">{{ resolution }}</span>
      </span>
    </div>
    
    <div class="status-center">
      <span
        class="status-badge"
        :class="{ active: subtitleStore.isExtracting }"
      >
        {{ statusText }}
      </span>
    </div>
    
    <div class="status-right">
      <span class="status-item">
        <span class="label">字幕:</span>
        <span class="value">{{ subtitleStore.totalCount }} 条</span>
      </span>
      <span class="divider" />
      <span class="status-item">
        <span class="label">OCR:</span>
        <span class="value accent">{{ ocrEngine }}</span>
      </span>
      <span class="divider" />
      <span class="status-item">
        <span class="label">内存:</span>
        <span class="value">{{ memoryUsage }}</span>
      </span>
    </div>
  </footer>
</template>

<style lang="scss" scoped>
.status-bar {
  height: $statusbar-height;
  background: $bg-surface;
  border-top: 1px solid $border;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 $space-4;
  font-size: $text-xs;
  user-select: none;
}

.status-left,
.status-center,
.status-right {
  display: flex;
  align-items: center;
  gap: $space-3;
}

.status-item {
  display: flex;
  align-items: center;
  gap: $space-1;
  
  .label {
    color: $text-muted;
  }
  
  .value {
    color: $text-secondary;
    
    &.mono {
      font-family: $font-display;
    }
    
    &.accent {
      color: $primary;
      text-transform: capitalize;
    }
  }
}

.divider {
  width: 1px;
  height: 12px;
  background: $border;
}

.status-badge {
  padding: 2px 8px;
  background: $bg-overlay;
  border-radius: $radius-full;
  font-size: $text-xs;
  color: $text-muted;
  
  &.active {
    background: $primary-dim;
    color: $primary;
    animation: pulse 1.5s infinite;
  }
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}
</style>
