/**
 * useROI - ROI tab state and logic
 * Extracted from SidePanel.vue ROI tab
 */
import { computed } from 'vue'
import { useProjectStore } from '@/stores/project'
import { ROI_PRESETS } from '@/types/video'

export function useROI() {
  const projectStore = useProjectStore()

  const roiPresets = ROI_PRESETS

  const selectedROI = computed(() => projectStore.selectedROI)

  function selectPreset(presetId: string) {
    projectStore.selectROIPreset(presetId)
  }

  return {
    roiPresets,
    selectedROI,
    selectPreset,
  }
}
