<script setup lang="ts">
import { ref } from 'vue'

const frameNumber = ref(0)
const fps = ref(30)
const resolution = ref('1920 × 1080')
const ocrEngine = ref('PaddleOCR')
const memoryUsage = ref('256 MB')
</script>

<template>
  <footer class="status-bar">
    <div class="status-left">
      <span class="status-item">
        <span class="label">帧:</span>
        <span class="value">#{{ frameNumber }}</span>
      </span>
      <span class="divider"></span>
      <span class="status-item">
        <span class="label">FPS:</span>
        <span class="value">{{ fps }}</span>
      </span>
      <span class="divider"></span>
      <span class="status-item">
        <span class="label">分辨率:</span>
        <span class="value">{{ resolution }}</span>
      </span>
    </div>
    
    <div class="status-right">
      <span class="status-item">
        <span class="label">OCR:</span>
        <span class="value accent">{{ ocrEngine }}</span>
      </span>
      <span class="divider"></span>
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
  font-family: $font-display;
  font-size: $text-xs;
  user-select: none;
}

.status-left,
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
    
    &.accent {
      color: $primary;
    }
  }
}

.divider {
  width: 1px;
  height: 12px;
  background: $border;
}
</style>
