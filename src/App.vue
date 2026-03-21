<script setup lang="ts">
import { onMounted, provide } from 'vue'
import ToolBar from '@/components/layout/ToolBar.vue'
import SidePanel from '@/components/layout/SidePanel.vue'
import VideoPreview from '@/components/layout/VideoPreview.vue'
import SubtitleList from '@/components/subtitle/SubtitleList.vue'
import StatusBar from '@/components/layout/StatusBar.vue'

onMounted(() => {
  console.log('[VisionSub] Application mounted')
})
</script>

<template>
  <div class="app-container">
    <ToolBar />
    
    <div class="app-main">
      <SidePanel />
      <VideoPreview />
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
</style>
