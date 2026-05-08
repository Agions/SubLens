/**
 * useProgress - Progress tab state and logic
 * Extracted from SidePanel.vue Progress tab
 */
import { computed } from 'vue'
import { useProjectStore } from '@/stores/project'
import { useSubtitleStore } from '@/stores/subtitle'

export function useProgress() {
  const projectStore = useProjectStore()
  const subtitleStore = useSubtitleStore()

  // Computed stats
  const fps = computed(() => projectStore.videoMeta?.fps ?? 0)
  const resolution = computed(() => {
    if (!projectStore.videoMeta) return 'N/A'
    return `${projectStore.videoMeta.width} × ${projectStore.videoMeta.height}`
  })

  const memoryUsage = computed(() => {
    const subCount = subtitleStore.subtitles.length
    return `${(subCount * 1).toFixed(1)} KB`
  })

  const extractSpeed = computed(() => {
    if (!projectStore.videoMeta || !projectStore.extractOptions.frameInterval) return '0 fps'
    const effectiveFps = fps.value / projectStore.extractOptions.frameInterval
    return `${effectiveFps.toFixed(1)} fps`
  })

  return {
    fps,
    resolution,
    memoryUsage,
    extractSpeed,
  }
}
