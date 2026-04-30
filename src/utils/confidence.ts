/**
 * Confidence level utilities
 * Consolidated from video.ts and useSubtitleList.util.test.ts
 */

// Re-export from types/video for convenience
export { 
  CONFIDENCE_HIGH, 
  CONFIDENCE_MID, 
  type ConfidenceLevel,
  getConfidenceLevel 
} from '@/types/video'

// ── Additional utilities ─────────────────────────────────────

/**
 * Get CSS class name for confidence level
 */
export function getConfidenceClass(confidence: number): string {
  return `conf-${getConfidenceLevel(confidence)}`
}

/**
 * Returns a CSS gradient color for the confidence heatmap bar.
 * Green (#22c55e) -> Yellow (#eab308) -> Red (#ef4444) based on confidence.
 */
export function getConfidenceHeatmap(confidence: number): string {
  if (confidence >= CONFIDENCE_HIGH) {
    return `linear-gradient(180deg, #22c55e ${Math.round(confidence * 100 - 85) * (100 / 15)}%, #16a34a 100%)`
  } else if (confidence >= CONFIDENCE_MID) {
    // Interpolate yellow to green
    const t = (confidence - CONFIDENCE_MID) / (CONFIDENCE_HIGH - CONFIDENCE_MID)
    const r = Math.round(234 - t * 12)
    const g = Math.round(179 + t * 17)
    const b = Math.round(8 + t * 78)
    return `linear-gradient(180deg, rgb(${r},${g},${b}) 0%, rgb(${Math.round(r * 0.7)},${Math.round(g * 0.7)},${Math.round(b * 0.7)}) 100%)`
  } else {
    // Interpolate red to yellow
    const t = confidence / CONFIDENCE_MID
    const r = Math.round(239 - t * 5)
    const g = Math.round(68 + t * 111)
    const b = Math.round(68 + t * 60)
    return `linear-gradient(180deg, rgb(${r},${g},${b}) 0%, rgb(${Math.round(r * 0.7)},${Math.round(g * 0.7)},${Math.round(b * 0.7)}) 100%)`
  }
}

/**
 * Get a solid color (hex) for confidence level
 * Used for badges and indicators
 */
export function getConfidenceColor(confidence: number): string {
  const level = getConfidenceLevel(confidence)
  switch (level) {
    case 'high':
      return '#34D399' // emerald
    case 'mid':
      return '#FBBF24' // amber
    case 'low':
      return '#F87171' // rose
  }
}

/**
 * Format confidence as percentage string
 */
export function formatConfidence(confidence: number): string {
  return `${Math.round(confidence * 100)}%`
}
