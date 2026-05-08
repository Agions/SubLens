/**
 * useExport - Export tab state and logic
 * Extracted from SidePanel.vue Export tab
 */
import { ref, computed } from 'vue'
import { useSubtitleStore } from '@/stores/subtitle'
import type { ExportFormats } from '@/types/subtitle'

export function useExport() {
  const subtitleStore = useSubtitleStore()
  const openExportDialog = ref<(() => void) | null>(null)

  // Format descriptions
  const formatDescriptions: Record<keyof ExportFormats, string> = {
    srt: 'SRT字幕',
    vtt: 'WebVTT',
    ass: 'ASS特效字幕',
    ssa: 'SSA字幕',
    json: 'JSON数据',
    txt: '纯文本',
    lrc: '歌词格式',
    sbv: 'YouTube字幕',
    csv: '表格数据'
  }

  const exportFormatKeys = computed(() => 
    Object.keys(subtitleStore.exportFormats) as (keyof ExportFormats)[]
  )

  const hasAnySelected = computed(() =>
    exportFormatKeys.value.some(key => subtitleStore.exportFormats[key])
  )

  function handleExport(format: keyof ExportFormats) {
    subtitleStore.exportFormats[format] = !subtitleStore.exportFormats[format]
  }

  function openExport() {
    openExportDialog.value?.()
  }

  return {
    // Data
    formatDescriptions,
    exportFormatKeys,

    // Computed
    hasAnySelected,

    // Methods
    handleExport,
    openExport,
  }
}
