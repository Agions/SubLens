/**
 * useSubtitleList - Subtitle list business logic composable
 * Extracts filtering, search, pagination, and selection logic from SubtitleList.vue
 */
import { ref, computed, watch } from 'vue'
import { useSubtitleStore } from '@/stores/subtitle'
import { useProjectStore } from '@/stores/project'

export type ConfidenceFilter = 'all' | 'high' | 'mid' | 'low'
export type SortOrder = 'index' | 'startTime' | 'confidence'

export function useSubtitleList() {
  const subtitleStore = useSubtitleStore()
  const projectStore = useProjectStore()

  // ── Filter State ─────────────────────────────────────────
  const searchQuery = ref('')
  const confidenceFilter = ref<ConfidenceFilter>('all')
  const sortOrder = ref<SortOrder>('index')

  // ── Pagination ────────────────────────────────────────────
  const displayCount = ref(100)
  const BATCH_SIZE = 50

  // ── Selection ────────────────────────────────────────────
  const hoveredId = ref<string | null>(null)
  const editingId = ref<string | null>(null)
  const editText = ref('')
  const editStartTime = ref('')
  const editEndTime = ref('')

  // ── Computed: Filtered & Sorted List ─────────────────────
  const filteredSubtitles = computed(() => {
    let subs = subtitleStore.subtitles

    // Search filter
    if (searchQuery.value.trim()) {
      const q = searchQuery.value.toLowerCase()
      subs = subs.filter(sub => sub.text.toLowerCase().includes(q))
    }

    // Confidence filter
    if (confidenceFilter.value !== 'all') {
      subs = subs.filter(sub => {
        const level = getConfidenceLevel(sub.confidence)
        return level === confidenceFilter.value
      })
    }

    // Sort
    switch (sortOrder.value) {
      case 'startTime':
        subs = [...subs].sort((a, b) => a.startTime - b.startTime)
        break
      case 'confidence':
        subs = [...subs].sort((a, b) => b.confidence - a.confidence)
        break
      case 'index':
      default:
        subs = [...subs].sort((a, b) => a.index - b.index)
    }

    return subs
  })

  // ── Computed: Visible Window ─────────────────────────────
  const visibleSubtitles = computed(() => {
    return filteredSubtitles.value.slice(0, displayCount.value)
  })

  const hasMore = computed(() => {
    return displayCount.value < filteredSubtitles.value.length
  })

  // ── Computed: Stats ─────────────────────────────────────
  const totalCount = computed(() => subtitleStore.subtitles.length)
  const filteredCount = computed(() => filteredSubtitles.value.length)
  const isFiltered = computed(() =>
    searchQuery.value.trim() !== '' || confidenceFilter.value !== 'all'
  )

  // ── Methods ─────────────────────────────────────────────
  function loadMore() {
    displayCount.value += BATCH_SIZE
  }

  function resetDisplayCount() {
    displayCount.value = 100
  }

  function getConfidenceLevel(confidence: number): 'high' | 'mid' | 'low' {
    if (confidence >= 0.85) return 'high'
    if (confidence >= 0.60) return 'mid'
    return 'low'
  }

  function handleSubtitleClick(id: string) {
    subtitleStore.selectSubtitle(id)
    const sub = subtitleStore.subtitles.find(s => s.id === id)
    if (sub) {
      projectStore.setCurrentFrame(sub.startFrame)
    }
  }

  function startEdit(id: string) {
    const sub = subtitleStore.subtitles.find(s => s.id === id)
    if (!sub) return
    editingId.value = id
    editText.value = sub.text
    editStartTime.value = formatTimeSrt(sub.startTime)
    editEndTime.value = formatTimeSrt(sub.endTime)
  }

  function cancelEdit() {
    editingId.value = null
    editText.value = ''
    editStartTime.value = ''
    editEndTime.value = ''
  }

  function saveEdit() {
    if (!editingId.value) return
    const sub = subtitleStore.subtitles.find(s => s.id === editingId.value)
    if (!sub) return

    if (editText.value !== sub.text) {
      subtitleStore.editSubtitle(editingId.value, 'text', sub.text, editText.value)
    }

    const newStart = parseTime(editStartTime.value)
    const newEnd = parseTime(editEndTime.value)

    if (newStart !== sub.startTime && newStart >= 0) {
      subtitleStore.editSubtitle(editingId.value, 'startTime', sub.startTime, newStart)
    }
    if (newEnd !== sub.endTime && newEnd >= 0) {
      subtitleStore.editSubtitle(editingId.value, 'endTime', sub.endTime, newEnd)
    }

    cancelEdit()
  }

  function deleteSubtitle(id: string) {
    subtitleStore.deleteSubtitle(id)
  }

  // Reset pagination when filter changes
  watch([searchQuery, confidenceFilter, sortOrder], resetDisplayCount)

  // ── Time Formatters ─────────────────────────────────────
  function formatTimeShort(seconds: number): string {
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  function formatTimeSrt(seconds: number): string {
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)
    const ms = Math.floor((seconds % 1) * 1000)
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`
  }

  function parseTime(timeStr: string): number {
    // Parse SRT time format: HH:MM:SS,mmm
    const match = timeStr.match(/^(\d{2}):(\d{2}):(\d{2})[,\.](\d{3})$/)
    if (!match) return -1
    const [, hrs, mins, secs, ms] = match
    return parseInt(hrs) * 3600 + parseInt(mins) * 60 + parseInt(secs) + parseInt(ms) / 1000
  }

  return {
    // State
    searchQuery,
    confidenceFilter,
    sortOrder,
    displayCount,
    hoveredId,
    editingId,
    editText,
    editStartTime,
    editEndTime,

    // Computed
    filteredSubtitles,
    visibleSubtitles,
    hasMore,
    totalCount,
    filteredCount,
    isFiltered,

    // Methods
    loadMore,
    getConfidenceLevel,
    handleSubtitleClick,
    startEdit,
    cancelEdit,
    saveEdit,
    deleteSubtitle,

    // Formatters
    formatTimeShort,
    formatTimeSrt,
    parseTime,
  }
}
