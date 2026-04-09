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
  const subCount = subtitleStore.totalCount
  const estimated = subCount * 10 + 50
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
        <span v-if="subtitleStore.isExtracting" class="pulse-dot"></span>
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
  background: var(--bg-surface);
  border-top: 1px solid var(--border);
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
    color: var(--text-muted);
  }

  .value {
    color: var(--text-secondary);

    &.mono {
      font-family: $font-mono;
      font-size: 11px;
    }

    &.accent {
      color: var(--primary);
      text-transform: capitalize;
    }
  }
}

.divider {
  width: 1px;
  height: 12px;
  background: var(--border);
}

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 2px 10px;
  background: var(--bg-overlay);
  border-radius: $radius-full;
  font-size: $text-xs;
  color: var(--text-muted);
  transition: all $duration-fast $ease-out-expo;

  &.active {
    background: rgba(#0A84FF, 0.15);
    color: var(--primary);
    box-shadow: 0 0 8px rgba(#0A84FF, 0.2);
  }
}

.pulse-dot {
  width: 6px;
  height: 6px;
  background: var(--primary);
  border-radius: 50%;
  animation: statusPulse 1.2s cubic-bezier(0.16, 1, 0.3, 1) infinite;
}

@keyframes statusPulse {
  0%   { opacity: 1; transform: scale(1); box-shadow: 0 0 0 0 rgba(#0A84FF, 0.5); }
  60%  { opacity: 0.8; transform: scale(0.9); box-shadow: 0 0 0 4px rgba(#0A84FF, 0); }
  100% { opacity: 1; transform: scale(1); box-shadow: 0 0 0 0 rgba(#0A84FF, 0); }
}
</style>
