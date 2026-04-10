import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { SubtitleItem, SubtitleEdit, EditableField, EditableValue, ExportFormats } from '@/types/subtitle'
import { CONFIDENCE_HIGH, CONFIDENCE_MID } from '@/types/video'
import { getExporter, type ExportFormat } from '@/core'

export const useSubtitleStore = defineStore('subtitle', () => {
  // State
  const subtitles = ref<SubtitleItem[]>([])
  const selectedId = ref<string | null>(null)
  const isExtracting = ref(false)
  const extractProgress = ref(0)
  const currentExtractFrame = ref(0)
  
  // Search
  const searchQuery = ref('')

  // Confidence filter: 'all' | 'low' (<60%) | 'mid' (60-85%) | 'high' (≥85%)
  const confidenceFilter = ref<'all' | 'low' | 'mid' | 'high'>('all')
  
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
    let result = subtitles.value

    // Apply confidence filter
    if (confidenceFilter.value !== 'all') {
      result = result.filter(sub => {
        if (confidenceFilter.value === 'low') return sub.confidence < CONFIDENCE_MID
        if (confidenceFilter.value === 'mid') return sub.confidence >= CONFIDENCE_MID && sub.confidence < CONFIDENCE_HIGH
        if (confidenceFilter.value === 'high') return sub.confidence >= CONFIDENCE_HIGH
        return true
      })
    }

    // Apply search filter
    if (searchQuery.value) {
      const query = searchQuery.value.toLowerCase()
      result = result.filter(sub => sub.text.toLowerCase().includes(query))
    }

    return result
  })

  // Confidence level statistics
  const confidenceStats = computed(() => ({
    low: subtitles.value.filter(s => s.confidence < CONFIDENCE_MID).length,
    mid: subtitles.value.filter(s => s.confidence >= CONFIDENCE_MID && s.confidence < CONFIDENCE_HIGH).length,
    high: subtitles.value.filter(s => s.confidence >= CONFIDENCE_HIGH).length,
    total: subtitles.value.length,
  }))

  // Low-confidence subtitles for batch operations
  const lowConfidenceSubtitles = computed(() =>
    subtitles.value.filter(s => s.confidence < CONFIDENCE_MID)
  )
  
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
  
  // Insert in sorted position (avoids full sort + reindex on every add)
  function addSubtitle(sub: SubtitleItem) {
    const arr = subtitles.value
    // Binary search for insertion point
    let lo = 0, hi = arr.length
    while (lo < hi) {
      const mid = (lo + hi) >>> 1
      if (arr[mid].startTime < sub.startTime) lo = mid + 1
      else hi = mid
    }
    arr.splice(lo, 0, sub)
    // Re-index only from insertion point
    for (let i = lo; i < arr.length; i++) arr[i].index = i + 1
  }
  
  function updateSubtitle(id: string, updates: Partial<SubtitleItem>) {
    const sub = subtitles.value.find(s => s.id === id)
    if (sub) {
      Object.assign(sub, updates)
    }
  }
  
  function deleteSubtitle(id: string) {
    const index = subtitles.value.findIndex(s => s.id === id)
    if (index === -1) return
    subtitles.value.splice(index, 1)
    // Re-index only from deleted position onward
    for (let i = index; i < subtitles.value.length; i++) {
      subtitles.value[i].index = i + 1
    }
    if (selectedId.value === id) selectedId.value = null
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
  
  // Edit with history — type-safe field update
  function applyFieldEdit(sub: SubtitleItem, field: EditableField, value: EditableValue) {
    if (field === 'text') {
      sub.text = value as string
      sub.edited = true
    } else if (field === 'startTime') {
      sub.startTime = value as number
    } else if (field === 'endTime') {
      sub.endTime = value as number
    }
  }

  function editSubtitle(id: string, field: EditableField, oldValue: EditableValue, newValue: EditableValue) {
    const sub = subtitles.value.find(s => s.id === id)
    if (!sub) return

    // Record edit for undo/redo
    const edit: SubtitleEdit = { id, field, oldValue, newValue }
    editHistory.value = editHistory.value.slice(0, historyIndex.value + 1)
    editHistory.value.push(edit)
    historyIndex.value = editHistory.value.length - 1

    applyFieldEdit(sub, field, newValue)
  }
  
  function undo() {
    if (!canUndo.value) return
    const edit = editHistory.value[historyIndex.value]
    const sub = subtitles.value.find(s => s.id === edit.id)
    if (sub) applyFieldEdit(sub, edit.field, edit.oldValue)
    historyIndex.value--
  }

  function redo() {
    if (!canRedo.value) return
    historyIndex.value++
    const edit = editHistory.value[historyIndex.value]
    if (!edit) return  // guard against out-of-bounds after last edit
    const sub = subtitles.value.find(s => s.id === edit.id)
    if (sub) applyFieldEdit(sub, edit.field, edit.newValue)
  }
  
  function exportToFormat(format: ExportFormat): string {
    return getExporter().export(subtitles.value, format).content
  }
  
  function setConfidenceFilter(filter: 'all' | 'low' | 'mid' | 'high') {
    confidenceFilter.value = filter
  }

  function batchDeleteLowConfidence() {
    const lowIds = new Set(lowConfidenceSubtitles.value.map(s => s.id))
    subtitles.value = subtitles.value.filter(s => !lowIds.has(s.id))
    // Re-index
    subtitles.value.forEach((s, i) => { s.index = i + 1 })
    if (lowIds.has(selectedId.value ?? '')) selectedId.value = null
  }

  function clearAll() {
    subtitles.value = []
    selectedId.value = null
    searchQuery.value = ''
    confidenceFilter.value = 'all'
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
    confidenceFilter,
    exportFormats,
    
    // Computed
    filteredSubtitles,
    selectedSubtitle,
    totalCount,
    canUndo,
    canRedo,
    confidenceStats,
    lowConfidenceSubtitles,
    
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
    clearAll,
    setConfidenceFilter,
    batchDeleteLowConfidence
  }
})
