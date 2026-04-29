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
import { CONFIDENCE_HIGH, CONFIDENCE_MID, getConfidenceLevel as getConfLevel } from '@/types/video'

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

  function deleteSelected() {
    if (subtitleStore.selectedId) {
      subtitleStore.deleteSubtitle(subtitleStore.selectedId)
    }
  }

  // ── Time Formatters ────────────────────────────────────────
  function formatTimeShort(seconds: number): string {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  function formatTimeSrt(seconds: number): string {
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)
    const ms = Math.floor((seconds % 1) * 1000)
    const pad = (n: number) => n.toString().padStart(2, '0')
    return `${pad(hrs)}:${pad(mins)}:${pad(secs)},${ms.toString().padStart(3, '0')}`
  }

  function parseTime(timeStr: string): number {
    const match = timeStr.match(/^(\d{2}):(\d{2}):(\d{2})[,\.](\d{3})$/)
    if (!match) return -1
    const [, hrs, mins, secs, ms] = match
    return parseInt(hrs) * 3600 + parseInt(mins) * 60 + parseInt(secs) + parseInt(ms) / 1000
  }

  function getConfidenceLevel(confidence: number): 'high' | 'mid' | 'low' {
    return getConfLevel(confidence)
  }

  /**
   * Returns a CSS gradient color for the confidence heatmap bar.
   * Green (#22c55e) -> Yellow (#eab308) -> Red (#ef4444) based on confidence.
   */
  function getConfidenceHeatmap(confidence: number): string {
    if (confidence >= 0.85) {
      return `linear-gradient(180deg, #22c55e ${Math.round(confidence * 100 - 85) * (100/15)}%, #16a34a 100%)`
    } else if (confidence >= 0.60) {
      // Interpolate yellow to green
      const t = (confidence - 0.60) / 0.25
      const r = Math.round(234 - t * 12)
      const g = Math.round(179 + t * 17)
      const b = Math.round(8 + t * 78)
      return `linear-gradient(180deg, rgb(${r},${g},${b}) 0%, rgb(${Math.round(r*0.7)},${Math.round(g*0.7)},${Math.round(b*0.7)}) 100%)`
    } else {
      // Interpolate red to yellow
      const t = confidence / 0.60
      const r = Math.round(239 - t * 5)
      const g = Math.round(68 + t * 111)
      const b = Math.round(68 + t * 60)
      return `linear-gradient(180deg, rgb(${r},${g},${b}) 0%, rgb(${Math.round(r*0.7)},${Math.round(g*0.7)},${Math.round(b*0.7)}) 100%)`
    }
  }

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
    getConfidenceLevel,
    getConfidenceHeatmap,
  }
}
