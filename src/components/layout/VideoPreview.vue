<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
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

onMounted(() => {
  if (videoElement.value) {
    initVideo(videoElement.value)
  }
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})

// Watch for video path changes
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
  const file = e.dataTransfer?.files[0]
  if (file && file.type.startsWith('video/')) {
    // In Tauri, we'd use the file path
    // For web, we'd create a blob URL
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
  
  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}
</script>

<template>
  <main class="video-preview">
    <!-- Video Area -->
    <div 
      class="video-container"
      @dragover.prevent="showOverlay = true"
      @dragleave="showOverlay = false"
      @drop="handleFileDrop"
    >
      <!-- Empty State -->
      <div v-if="!projectStore.hasVideo" class="empty-state">
        <div class="empty-content">
          <span class="empty-icon">🎬</span>
          <h3 class="empty-title">导入视频开始提取</h3>
          <p class="empty-desc">拖拽视频文件到此处，或点击下方按钮选择</p>
          <button class="import-btn" @click="handleFileSelect">
            <span>📂</span>
            选择视频文件
          </button>
        </div>
        
        <!-- Drop Overlay -->
        <div v-if="showOverlay" class="drop-overlay">
          <span class="drop-icon">📥</span>
          <span class="drop-text">释放以导入视频</span>
        </div>
      </div>
      
      <!-- Video Element -->
      <div v-show="projectStore.hasVideo" class="video-wrapper">
        <video
          ref="videoElement"
          class="video-element"
          preload="metadata"
          @click="togglePlay"
        ></video>
        
        <!-- ROI Selector -->
        <ROISelector 
          v-if="isReady"
          :video-width="projectStore.videoMeta?.width ?? 1920"
          :video-height="projectStore.videoMeta?.height ?? 1080"
          @update="handleROIUpdate"
        />
      </div>
      
      <!-- Loading -->
      <div v-if="isLoading" class="loading-overlay">
        <div class="loading-spinner"></div>
        <span class="loading-text">加载中...</span>
      </div>
      
      <!-- Error -->
      <div v-if="error" class="error-overlay">
        <span class="error-icon">❌</span>
        <span class="error-text">{{ error }}</span>
      </div>
    </div>
    
    <!-- Controls -->
    <div class="video-controls">
      <div class="control-left">
        <button class="control-btn" @click="togglePlay" :disabled="!projectStore.hasVideo">
          {{ projectStore.isPlaying ? '⏸️' : '▶️' }}
        </button>
        <button class="control-btn" @click="seekRelative(-10)" :disabled="!projectStore.hasVideo">
          ⏪
        </button>
        <button class="control-btn" @click="seekRelative(10)" :disabled="!projectStore.hasVideo">
          ⏩
        </button>
      </div>
      
      <div class="control-center">
        <div class="timeline" @click="handleProgressClick">
          <div class="timeline-track">
            <div 
              class="timeline-progress" 
              :style="{ width: `${projectStore.progress}%` }"
            ></div>
            <div 
              class="timeline-thumb" 
              :style="{ left: `${projectStore.progress}%` }"
            ></div>
          </div>
          
          <!-- Frame markers (subtitles) -->
          <div class="frame-markers">
            <!-- Markers would be rendered based on subtitle positions -->
          </div>
        </div>
      </div>
      
      <div class="control-right">
        <span class="time-display">
          <span class="current">{{ formatTime(projectStore.currentTime) }}</span>
          <span class="separator">/</span>
          <span class="total">{{ formatTime(projectStore.duration) }}</span>
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
  position: relative;
  padding: $space-4;
}

.empty-state {
  @include flex-center;
  width: 100%;
  height: 100%;
  border: 2px dashed $border;
  border-radius: $radius-xl;
  background: linear-gradient(135deg, rgba($primary, 0.03), rgba($accent, 0.03));
  position: relative;
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
}

.drop-overlay {
  position: absolute;
  inset: 0;
  @include flex-center;
  flex-direction: column;
  gap: $space-3;
  background: rgba($primary, 0.1);
  border-radius: $radius-xl;
  border: 2px solid $primary;
  
  .drop-icon {
    font-size: 48px;
  }
  
  .drop-text {
    font-size: $text-lg;
    color: $primary;
  }
}

.video-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.video-element {
  max-width: 100%;
  max-height: 100%;
  border-radius: $radius-md;
}

.loading-overlay,
.error-overlay {
  position: absolute;
  inset: 0;
  @include flex-center;
  flex-direction: column;
  gap: $space-3;
  background: rgba($bg-base, 0.9);
}

.loading-spinner {
  width: 48px;
  height: 48px;
  border: 3px solid $border;
  border-top-color: $primary;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.loading-text {
  font-size: $text-sm;
  color: $text-muted;
}

.error-icon {
  font-size: 48px;
}

.error-text {
  font-size: $text-sm;
  color: $error;
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
  
  &:hover:not(:disabled) {
    background: $bg-overlay;
  }
  
  &:active:not(:disabled) {
    transform: scale(0.95);
  }
  
  &:disabled {
    opacity: 0.3;
    cursor: not-allowed;
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
  
  .timeline:hover & {
    transform: translate(-50%, -50%) scale(1.2);
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

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
