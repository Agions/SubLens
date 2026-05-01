/**
 * useSubtitleList - Subtitle list UI state composable
 * 
 * Manages UI-specific state for SubtitleList component:
 * - Pagination (displayCount, loadMore, hasMore)
 * - Hover state (hoveredId)
 * - Editing state (editingId, editText, editStartTime, editEndTime)
 * - Time formatting utilities
 * 
 * NOTE: Search query and confidence filter are managed by subtitleStore directly.
 */

import { ref, computed } from 'vue'
import { useSubtitleStore } from '@/stores/subtitle'
import { useProjectStore } from '@/stores/project'
import { formatTimeShort, formatTimeSrt, parseTime } from '@/utils/time'
import { getConfidenceHeatmap } from '@/utils/confidence'

const BATCH_SIZE = 50

export function useSubtitleList() {
  const subtitleStore = useSubtitleStore()
  const projectStore = useProjectStore()

  // ── Pagination ────────────────────────────────────────────
  const displayCount = ref(100)

  const visibleSubtitles = computed(() => {
    return subtitleStore.filteredSubtitles.slice(0, displayCount.value)
  })

  const hasMore = computed(() => {
    return displayCount.value < subtitleStore.filteredSubtitles.length
  })

  function loadMore() {
    displayCount.value += BATCH_SIZE
  }

  // Reset pagination when confidence filter changes (watch in component)
  function resetDisplayCount() {
    displayCount.value = 100
  }

  // ── UI State ───────────────────────────────────────────────
  const hoveredId = ref<string | null>(null)
  const editingId = ref<string | null>(null)
  const editText = ref('')
  const editStartTime = ref('')
  const editEndTime = ref('')

  // ── Stats ──────────────────────────────────────────────────
  const totalCount = computed(() => subtitleStore.subtitles.length)
  const filteredCount = computed(() => subtitleStore.filteredSubtitles.length)
  const isFiltered = computed(() =>
    subtitleStore.searchQuery.trim() !== '' || subtitleStore.confidenceFilter !== 'all'
  )
  const lowConfCount = computed(() => subtitleStore.confidenceStats.low)

  // ── Methods ────────────────────────────────────────────────
  function handleSubtitleClick(id: string) {
    subtitleStore.selectSubtitle(id)
    const sub = subtitleStore.getSubtitleById(id)
    if (sub) {
      projectStore.setCurrentFrame(sub.startFrame)
    }
  }

  function startEdit(id: string) {
    const sub = subtitleStore.getSubtitleById(id)
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
    const sub = subtitleStore.getSubtitleById(editingId.value)
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

  function deleteSelected() {
    if (subtitleStore.selectedId) {
      subtitleStore.deleteSubtitle(subtitleStore.selectedId)
    }
  }

  // ── Time Formatters ────────────────────────────────────────
  // Using centralized utilities from @/utils/time

  return {
    // State
    displayCount,
    hoveredId,
    editingId,
    editText,
    editStartTime,
    editEndTime,

    // Computed
    visibleSubtitles,
    hasMore,
    totalCount,
    filteredCount,
    isFiltered,
    lowConfCount,

    // Methods
    loadMore,
    resetDisplayCount,
    handleSubtitleClick,
    startEdit,
    cancelEdit,
    saveEdit,
    deleteSelected,

    // Formatters
    formatTimeShort,
    formatTimeSrt,
    parseTime,
    getConfidenceHeatmap,
  }
}
