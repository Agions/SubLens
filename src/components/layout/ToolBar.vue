<script setup lang="ts">
import { ref } from 'vue'
import { useProjectStore } from '@/stores/project'
import { useSubtitleStore } from '@/stores/subtitle'
import { useFileOperations } from '@/composables/useFileOperations'
import { useVideoPlayer } from '@/composables/useVideoPlayer'
import { useVideoMetadata } from '@/composables/useVideoMetadata'
import { useTheme } from '@/composables/useTheme'
import AboutDialog from '@/components/common/AboutDialog.vue'

const projectStore = useProjectStore()
const subtitleStore = useSubtitleStore()

const projectName = ref('未命名项目')
const showAbout = ref(false)
const isLoading = ref(false)
const { currentTheme, toggleTheme } = useTheme()

async function handleOpenFile() {
  if (isLoading.value) return
  
  try {
    const fileOps = useFileOperations()
    
    const filePath = await fileOps.openFileDialog('选择视频文件')
    if (!filePath) return
    
    isLoading.value = true
    
    // Update project with new video
    const { getVideoMetadata } = useVideoMetadata()
    const metadata = await getVideoMetadata(filePath)
    
    projectStore.setVideo(filePath, metadata)
    
    // Extract filename for display
    const filename = filePath.split('/').pop() || filePath.split('\\').pop() || 'video'
    projectName.value = filename.replace(/\.[^.]+$/, '')
    
    // Initialize video player with the file
    const videoPlayer = useVideoPlayer()
    await videoPlayer.loadVideo(filePath)
    
  } catch (e) {
    console.error('[ToolBar] Failed to open file:', e)
    alert(`打开文件失败: ${e}`)
  } finally {
    isLoading.value = false
  }
}

async function handleSave() {
  if (isLoading.value) return
  
  try {
    const fileOps = useFileOperations()
    
    // Get subtitles in project format
    const subtitles = subtitleStore.subtitles.map(sub => ({
      id: sub.id,
      index: sub.index,
      start_time: sub.startTime,
      end_time: sub.endTime,
      start_frame: sub.startFrame,
      end_frame: sub.endFrame,
      text: sub.text,
      confidence: sub.confidence,
      language: sub.language,
      roi: sub.roi
    }))
    
    // Save as JSON project file
    const filePath = await fileOps.saveFileDialog('保存项目', `${projectName.value}.hardsubx.json`)
    if (!filePath) return
    
    isLoading.value = true
    
    const projectData = JSON.stringify({
      version: '3.0.0',
      projectName: projectName.value,
      videoPath: projectStore.videoPath,
      subtitles
    }, null, 2)
    
    await fileOps.writeTextFile(filePath, projectData)
    console.log('[ToolBar] Project saved to:', filePath)
    
  } catch (e) {
    console.error('[ToolBar] Failed to save project:', e)
    alert(`保存失败: ${e}`)
  } finally {
    isLoading.value = false
  }
}

function openAbout() {
  showAbout.value = true
}
</script>

<template>
  <header class="toolbar">
    <div class="toolbar-left">
      <div class="logo">
        <svg class="logo-icon" viewBox="0 0 24 24" fill="none">
          <rect x="2" y="5" width="20" height="14" rx="2" stroke="url(#logoGrad)" stroke-width="1.5"/>
          <path d="M9 9l6 3-6 3V9z" fill="url(#logoGrad)"/>
          <defs>
            <linearGradient id="logoGrad" x1="2" y1="5" x2="22" y2="19" gradientUnits="userSpaceOnUse">
              <stop stop-color="#0A84FF"/>
              <stop offset="1" stop-color="#BF5AF2"/>
            </linearGradient>
          </defs>
        </svg>
        <span class="logo-text">HardSubX</span>
      </div>
      <div class="divider"></div>
      <span class="project-name">{{ projectName }}</span>
    </div>
    
    <div class="toolbar-center">
      <button class="toolbar-btn" @click="handleOpenFile">
        <svg class="btn-icon-svg" viewBox="0 0 20 20" fill="none">
          <path d="M3 7v9a1 1 0 001 1h12a1 1 0 001-1V7M8 3v10m0-10l-3 4m3-4l3 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span class="btn-text">打开</span>
      </button>
      <button class="toolbar-btn" @click="handleSave">
        <svg class="btn-icon-svg" viewBox="0 0 20 20" fill="none">
          <path d="M5 3v14a1 1 0 001 1h8a1 1 0 001-1V7l-4-4H6a1 1 0 00-1 1z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M7 15v2m4-2v2m4-2v2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
        <span class="btn-text">保存</span>
      </button>
    </div>
    
    <div class="toolbar-right">
      <!-- Theme Toggle -->
      <button
        class="toolbar-btn icon-only theme-toggle"
        :title="currentTheme === 'dark' ? '切换亮色模式' : '切换暗色模式'"
        @click="toggleTheme"
      >
        <!-- Sun icon (show when dark) -->
        <svg v-if="currentTheme === 'dark'" class="btn-icon-svg" viewBox="0 0 20 20" fill="none">
          <circle cx="10" cy="10" r="4" stroke="currentColor" stroke-width="1.5"/>
          <path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.22 4.22l1.42 1.42M14.36 14.36l1.42 1.42M4.22 15.78l1.42-1.42M14.36 5.64l1.42-1.42" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
        <!-- Moon icon (show when light) -->
        <svg v-else class="btn-icon-svg" viewBox="0 0 20 20" fill="none">
          <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>

      <button class="toolbar-btn icon-only" title="关于" @click="openAbout">
        <svg class="btn-icon-svg" viewBox="0 0 20 20" fill="none">
          <circle cx="10" cy="10" r="8" stroke="currentColor" stroke-width="1.5"/>
          <path d="M10 14v-4M10 7h.01" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
      </button>
    </div>
  </header>
  
  <AboutDialog v-model:open="showAbout" />
</template>

<style lang="scss" scoped>
.toolbar {
  height: $toolbar-height;
  background: $bg-surface;
  border-bottom: 1px solid $border;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 $space-4;
  user-select: none;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: $space-3;
}

.logo {
  display: flex;
  align-items: center;
  gap: $space-2;

  .logo-icon {
    width: 28px;
    height: 28px;
    flex-shrink: 0;
  }

  .logo-text {
    font-family: $font-display;
    font-weight: 600;
    font-size: $text-lg;
    background: linear-gradient(135deg, $primary, $accent);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
}

.divider {
  width: 1px;
  height: 24px;
  background: $border;
}

.project-name {
  font-size: $text-sm;
  color: $text-secondary;
}

.toolbar-center {
  display: flex;
  align-items: center;
  gap: $space-2;
}

.toolbar-btn {
  display: flex;
  align-items: center;
  gap: $space-2;
  padding: $space-2 $space-3;
  border-radius: $radius-md;
  color: $text-secondary;
  transition: all $transition-fast;
  
  &:hover {
    background: $bg-overlay;
    color: $text-primary;
  }
  
  &:active {
    transform: scale(0.97);
  }
  
  &.icon-only {
    padding: $space-2;
  }
  
  .btn-icon-svg {
    width: 18px;
    height: 18px;
    flex-shrink: 0;
  }

  .btn-text {
    font-size: $text-sm;
  }

  &.theme-toggle {
    &:hover .btn-icon-svg {
      filter: drop-shadow(0 0 4px rgba($primary, 0.5));
    }
  }
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: $space-1;
}
</style>
