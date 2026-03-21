<script setup lang="ts">
import { ref } from 'vue'

const isPlaying = ref(false)
const currentTime = ref(0)
const duration = ref(0)
const progress = ref(0)

// Timeline frames for visual representation
const frames = ref<{ id: number; hasSubtitle: boolean }[]>([])

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

function togglePlay() {
  isPlaying.value = !isPlaying.value
}

function handleProgressClick(e: MouseEvent) {
  const target = e.currentTarget as HTMLElement
  const rect = target.getBoundingClientRect()
  const x = e.clientX - rect.left
  const percent = x / rect.width
  progress.value = percent * 100
}
</script>

<template>
  <main class="video-preview">
    <!-- Video Area -->
    <div class="video-container">
      <!-- Empty State -->
      <div class="empty-state">
        <div class="empty-content">
          <span class="empty-icon">🎬</span>
          <h3 class="empty-title">导入视频开始提取</h3>
          <p class="empty-desc">拖拽视频文件到此处，或点击下方按钮选择</p>
          <button class="import-btn">
            <span>📂</span>
            选择视频文件
          </button>
        </div>
      </div>
      
      <!-- Video Placeholder (when loaded) -->
      <div class="video-area hidden">
        <!-- ROI Overlay would go here -->
      </div>
    </div>
    
    <!-- Controls -->
    <div class="video-controls">
      <div class="control-left">
        <button class="control-btn" @click="togglePlay">
          {{ isPlaying ? '⏸️' : '▶️' }}
        </button>
        <button class="control-btn">⏮️</button>
        <button class="control-btn">⏭️</button>
      </div>
      
      <div class="control-center">
        <div class="timeline" @click="handleProgressClick">
          <div class="timeline-track">
            <div class="timeline-progress" :style="{ width: `${progress}%` }"></div>
            <div class="timeline-thumb" :style="{ left: `${progress}%` }"></div>
          </div>
          
          <!-- Frame markers -->
          <div class="frame-markers">
            <span
              v-for="i in 30"
              :key="i"
              :class="['marker', { active: Math.random() > 0.7 }]"
              :style="{ left: `${(i - 1) * 3.33}%` }"
            ></span>
          </div>
        </div>
      </div>
      
      <div class="control-right">
        <span class="time-display">
          <span class="current">{{ formatTime(currentTime) }}</span>
          <span class="separator">/</span>
          <span class="total">{{ formatTime(duration) }}</span>
        </span>
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
  @include flex-center;
  padding: $space-4;
}

.empty-state {
  @include flex-center;
  width: 100%;
  height: 100%;
  border: 2px dashed $border;
  border-radius: $radius-xl;
  background: linear-gradient(135deg, rgba($primary, 0.03), rgba($accent, 0.03));
}

.empty-content {
  text-align: center;
  max-width: 320px;
}

.empty-icon {
  font-size: 64px;
  display: block;
  margin-bottom: $space-4;
  opacity: 0.6;
}

.empty-title {
  font-size: $text-xl;
  font-weight: 600;
  margin-bottom: $space-2;
  background: linear-gradient(135deg, $text-primary, $text-secondary);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.empty-desc {
  font-size: $text-sm;
  color: $text-muted;
  margin-bottom: $space-6;
}

.import-btn {
  display: inline-flex;
  align-items: center;
  gap: $space-2;
  padding: $space-3 $space-5;
  background: linear-gradient(135deg, $primary, $accent);
  color: white;
  font-weight: 600;
  border-radius: $radius-lg;
  transition: all $transition-fast;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: $shadow-glow-primary;
  }
  
  &:active {
    transform: translateY(0);
  }
}

.video-controls {
  height: 56px;
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
}

.control-btn {
  width: 36px;
  height: 36px;
  @include flex-center;
  font-size: 18px;
  border-radius: $radius-md;
  transition: all $transition-fast;
  
  &:hover {
    background: $bg-overlay;
  }
  
  &:active {
    transform: scale(0.95);
  }
}

.control-center {
  flex: 1;
}

.timeline {
  position: relative;
  height: 32px;
  cursor: pointer;
  padding: 12px 0;
}

.timeline-track {
  position: relative;
  height: 8px;
  background: $bg-overlay;
  border-radius: $radius-full;
  overflow: visible;
}

.timeline-progress {
  height: 100%;
  background: linear-gradient(90deg, $primary, $accent);
  border-radius: $radius-full;
  position: relative;
}

.timeline-thumb {
  position: absolute;
  top: 50%;
  width: 16px;
  height: 16px;
  background: white;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  box-shadow: $shadow-md;
  transition: transform 0.1s ease;
  
  .timeline:hover & {
    transform: translate(-50%, -50%) scale(1.2);
  }
}

.frame-markers {
  position: absolute;
  top: 8px;
  left: 0;
  right: 0;
  height: 16px;
}

.marker {
  position: absolute;
  width: 2px;
  height: 8px;
  background: $text-muted;
  opacity: 0.3;
  transform: translateX(-50%);
  top: 4px;
  
  &.active {
    background: $secondary;
    opacity: 1;
    height: 12px;
    top: 2px;
  }
}

.control-right {
  display: flex;
  align-items: center;
}

.time-display {
  font-family: $font-display;
  font-size: $text-sm;
  display: flex;
  gap: $space-1;
  
  .current {
    color: $text-primary;
  }
  
  .separator {
    color: $text-muted;
  }
  
  .total {
    color: $text-muted;
  }
}
</style>
