<script setup lang="ts">
import { onMounted, provide, ref } from 'vue'
import ToolBar from '@/components/layout/ToolBar.vue'
import SidePanel from '@/components/layout/SidePanel.vue'
import VideoPreview from '@/components/layout/VideoPreview.vue'
import SubtitleList from '@/components/subtitle/SubtitleList.vue'
import Timeline from '@/components/video/Timeline.vue'
import StatusBar from '@/components/layout/StatusBar.vue'
import { useKeyboardShortcuts } from '@/composables/useKeyboardShortcuts'
import { useSubtitleExtractor } from '@/composables/useSubtitleExtractor'

const { setupShortcuts, cleanupShortcuts } = useKeyboardShortcuts()
const subtitleExtractor = useSubtitleExtractor()

provide('subtitleExtractor', subtitleExtractor)

const showTimeline = ref(true)

onMounted(() => {
  console.log('[VisionSub] Application mounted')
  setupShortcuts()
})

// Expose cleanup for unmount
import { onUnmounted } from 'vue'
onUnmounted(() => {
  cleanupShortcuts()
})
</script>

<template>
  <div class="app-container">
    <ToolBar />
    
    <div class="app-main">
      <SidePanel />
      <div class="main-content">
        <VideoPreview class="video-area" />
        <Timeline v-if="showTimeline" class="timeline-area" />
      </div>
      <SubtitleList />
    </div>
    
    <StatusBar />
  </div>
</template>

<style lang="scss" scoped>
.app-container {
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: $bg-base;
  overflow: hidden;
}

.app-main {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.video-area {
  flex: 1;
  min-height: 0;
}

.timeline-area {
  flex-shrink: 0;
  height: 120px;
}
</style>
