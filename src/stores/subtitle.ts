import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { SubtitleItem, SubtitleEdit, ExportFormats } from '@/types/subtitle'
import { formatSRT, formatWebVTT, formatASS, formatSSA, formatJSON, formatLRC, formatSBV, formatCSV } from '@/types/subtitle'

export const useSubtitleStore = defineStore('subtitle', () => {
  // State
  const subtitles = ref<SubtitleItem[]>([])
  const selectedId = ref<string | null>(null)
  const isExtracting = ref(false)
  const extractProgress = ref(0)
  const currentExtractFrame = ref(0)
  
  // Search
  const searchQuery = ref('')
  
  // Export Options
  const exportFormats = ref<ExportFormats>({
    srt: true,
    vtt: false,
    ass: false,
    ssa: false,
    json: true,
    txt: false,
    lrc: false,
    sbv: false,
    csv: false
  })
  
  // Edit History (for undo/redo)
  const editHistory = ref<SubtitleEdit[]>([])
  const historyIndex = ref(-1)
  
  // Computed
  const filteredSubtitles = computed(() => {
    if (!searchQuery.value) return subtitles.value
    const query = searchQuery.value.toLowerCase()
    return subtitles.value.filter(sub => 
      sub.text.toLowerCase().includes(query)
    )
  })
  
  const selectedSubtitle = computed(() => 
    subtitles.value.find(sub => sub.id === selectedId.value) ?? null
  )
  
  const totalCount = computed(() => subtitles.value.length)
  
  const canUndo = computed(() => historyIndex.value >= 0)
  const canRedo = computed(() => historyIndex.value < editHistory.value.length - 1)
  
  // Actions
  function setSubtitles(subs: SubtitleItem[]) {
    subtitles.value = subs
    editHistory.value = []
    historyIndex.value = -1
  }
  
  function addSubtitle(sub: SubtitleItem) {
    subtitles.value.push(sub)
    subtitles.value.sort((a, b) => a.startTime - b.startTime)
    // Re-index
    subtitles.value.forEach((sub, i) => sub.index = i + 1)
  }
  
  function updateSubtitle(id: string, updates: Partial<SubtitleItem>) {
    const sub = subtitles.value.find(s => s.id === id)
    if (sub) {
      Object.assign(sub, updates)
    }
  }
  
  function deleteSubtitle(id: string) {
    const index = subtitles.value.findIndex(s => s.id === id)
    if (index !== -1) {
      subtitles.value.splice(index, 1)
      // Re-index
      subtitles.value.forEach((sub, i) => sub.index = i + 1)
    }
    if (selectedId.value === id) {
      selectedId.value = null
    }
  }
  
  function selectSubtitle(id: string | null) {
    selectedId.value = id
  }
  
  function startExtraction() {
    isExtracting.value = true
    extractProgress.value = 0
    currentExtractFrame.value = 0
    subtitles.value = []
  }
  
  function updateExtractionProgress(frame: number, totalFrames: number) {
    currentExtractFrame.value = frame
    extractProgress.value = (frame / totalFrames) * 100
  }
  
  function finishExtraction() {
    isExtracting.value = false
    extractProgress.value = 100
  }
  
  // Edit with history
  function editSubtitle(id: string, field: 'text' | 'startTime' | 'endTime', oldValue: string | number, newValue: string | number) {
    const sub = subtitles.value.find(s => s.id === id)
    if (!sub) return
    
    // Record edit
    const edit: SubtitleEdit = { id, field, oldValue, newValue }
    editHistory.value = editHistory.value.slice(0, historyIndex.value + 1)
    editHistory.value.push(edit)
    historyIndex.value = editHistory.value.length - 1
    
    // Apply edit
    ;(sub as any)[field] = newValue
    if (field === 'text') {
      sub.edited = true
    }
  }
  
  function undo() {
    if (!canUndo.value) return
    const edit = editHistory.value[historyIndex.value]
    const sub = subtitles.value.find(s => s.id === edit.id)
    if (sub) {
      ;(sub as any)[edit.field] = edit.oldValue
    }
    historyIndex.value--
  }
  
  function redo() {
    if (!canRedo.value) return
    historyIndex.value++
    const edit = editHistory.value[historyIndex.value]
    const sub = subtitles.value.find(s => s.id === edit.id)
    if (sub) {
      ;(sub as any)[edit.field] = edit.newValue
    }
  }
  
  // Export
  function exportToFormat(format: 'srt' | 'vtt' | 'ass' | 'ssa' | 'json' | 'txt' | 'lrc' | 'sbv' | 'csv'): string {
    switch (format) {
      case 'srt':
        return formatSRT(subtitles.value)
      case 'vtt':
        return formatWebVTT(subtitles.value)
      case 'ass':
        return formatASS(subtitles.value)
      case 'ssa':
        return formatSSA(subtitles.value)
      case 'json':
        return formatJSON(subtitles.value)
      case 'txt':
        return subtitles.value.map(sub => sub.text).join('\n')
      case 'lrc':
        return formatLRC(subtitles.value)
      case 'sbv':
        return formatSBV(subtitles.value)
      case 'csv':
        return formatCSV(subtitles.value)
      default:
        return ''
    }
  }
  
  function clearAll() {
    subtitles.value = []
    selectedId.value = null
    searchQuery.value = ''
    editHistory.value = []
    historyIndex.value = -1
  }
  
  return {
    // State
    subtitles,
    selectedId,
    isExtracting,
    extractProgress,
    currentExtractFrame,
    searchQuery,
    exportFormats,
    
    // Computed
    filteredSubtitles,
    selectedSubtitle,
    totalCount,
    canUndo,
    canRedo,
    
    // Actions
    setSubtitles,
    addSubtitle,
    updateSubtitle,
    deleteSubtitle,
    selectSubtitle,
    startExtraction,
    updateExtractionProgress,
    finishExtraction,
    editSubtitle,
    undo,
    redo,
    exportToFormat,
    clearAll
  }
})
