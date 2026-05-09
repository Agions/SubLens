<script setup lang="ts">
import { onMounted, onUnmounted, provide, ref, watch } from 'vue'
import { useTheme } from '@/composables/useTheme'
import { useKeyboardShortcuts } from '@/composables/useHotkeys'
import { useSubtitleExtractor } from '@/composables/useExtractor'
import Toolbar from '@/components/layout/Toolbar.vue'
import Panel from '@/components/layout/Panel.vue'
import Video from '@/components/layout/Video.vue'
import List from '@/components/subtitle/List.vue'
import Timeline from '@/components/video/Timeline.vue'
import StatusBar from '@/components/layout/StatusBar.vue'
import Shortcuts from '@/components/common/Shortcuts.vue'
import Export from '@/components/subtitle/SubExport.vue'
import Batch from '@/components/layout/Batch.vue'
import SubToast from '@/components/common/SubToast.vue'
import Toast from '@/components/common/Toast.vue'
import { useSubtitleStore } from '@/stores/subtitle'

// Initialize theme
useTheme()

// Subtitle store for toast
const subtitleStore = useSubtitleStore()
const toastVisible = ref(false)
const toastText = ref('')
const toastIndex = ref(0)
const toastTotal = ref(0)

// Watch for subtitle selection changes
watch(() => subtitleStore.selectedSubtitle, (sub) => {
  if (sub) {
    const idx = subtitleStore.subtitles.findIndex(s => s.id === sub.id)
    toastText.value = sub.text
    toastIndex.value = idx >= 0 ? idx : 0
    toastTotal.value = subtitleStore.subtitles.length
    toastVisible.value = true
  }
})

// Keyboard shortcuts
const { setupShortcuts, cleanupShortcuts, setExportCallback } = useKeyboardShortcuts()

// Subtitle extractor
const subtitleExtractor = useSubtitleExtractor()
provide('subtitleExtractor', subtitleExtractor)

// Export dialog opener
function openExport() {
  exportDialogRef.value?.open()
}
provide('openExport', openExport)

const showTimeline = ref(true)
const shortcutsHelpRef = ref<InstanceType<typeof Shortcuts> | null>(null)
const exportDialogRef = ref<InstanceType<typeof Export> | null>(null)
const batchProcessRef = ref<InstanceType<typeof Batch> | null>(null)

function openBatchProcess() {
  batchProcessRef.value?.open()
}
provide('openBatchProcess', openBatchProcess)

function handleQuestionMark(e: KeyboardEvent) {
  if (e.key === '?' || (e.shiftKey && e.key === '/')) {
    shortcutsHelpRef.value?.open()
  }
}

onMounted(() => {
  setupShortcuts()

  setExportCallback(() => {
    exportDialogRef.value?.open()
  })

  window.addEventListener('keydown', handleQuestionMark)
})

onUnmounted(() => {
  cleanupShortcuts()
  window.removeEventListener('keydown', handleQuestionMark)
})
</script>

<template>
  <div class="app-container">
    <Toolbar />
    
    <div class="app-main">
      <Panel />
      <div class="main-content">
        <Video class="video-area" />
        <Timeline v-if="showTimeline" class="timeline-area" />
      </div>
      <List />
    </div>
    
    <StatusBar />
    
    <Shortcuts ref="shortcutsHelpRef" />
    <Export ref="exportDialogRef" />
    <Batch ref="batchProcessRef" />
    <SubToast
      :visible="toastVisible"
      :text="toastText"
      :index="toastIndex"
      :total="toastTotal"
      @hide="toastVisible = false"
    />
    <Toast />
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
