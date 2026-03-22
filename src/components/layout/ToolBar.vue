<script setup lang="ts">
import { ref } from 'vue'
import { useProjectStore } from '@/stores/project'
import { useSubtitleStore } from '@/stores/subtitle'
import { useFileOperations } from '@/composables/useFileOperations'
import { useVideoPlayer } from '@/composables/useVideoPlayer'
import { useVideoMetadata } from '@/composables/useVideoMetadata'
import AboutDialog from '@/components/common/AboutDialog.vue'

const projectStore = useProjectStore()
const subtitleStore = useSubtitleStore()

const projectName = ref('未命名项目')
const showAbout = ref(false)
const isLoading = ref(false)

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
    const filePath = await fileOps.saveFileDialog('保存项目', `${projectName.value}.visionsub.json`)
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
        <span class="logo-icon">📽️</span>
        <span class="logo-text">VisionSub</span>
      </div>
      <div class="divider"></div>
      <span class="project-name">{{ projectName }}</span>
    </div>
    
    <div class="toolbar-center">
      <button class="toolbar-btn" @click="handleOpenFile">
        <span class="btn-icon">📂</span>
        <span class="btn-text">打开</span>
      </button>
      <button class="toolbar-btn" @click="handleSave">
        <span class="btn-icon">💾</span>
        <span class="btn-text">保存</span>
      </button>
    </div>
    
    <div class="toolbar-right">
      <button class="toolbar-btn icon-only" title="视图">
        <span class="btn-icon">🖼️</span>
      </button>
      <button class="toolbar-btn icon-only" title="设置">
        <span class="btn-icon">⚙️</span>
      </button>
      <button class="toolbar-btn icon-only" title="关于" @click="openAbout">
        <span class="btn-icon">ℹ️</span>
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
    font-size: 20px;
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
  
  .btn-icon {
    font-size: 16px;
  }
  
  .btn-text {
    font-size: $text-sm;
  }
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: $space-1;
}
</style>
