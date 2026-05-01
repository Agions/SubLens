/**
 * Confidence level utilities
 * Consolidated from video.ts and useSubtitleList.util.test.ts
 */

import {
  type ConfidenceLevel,
  getConfidenceLevel,
  CONFIDENCE_HIGH,
  CONFIDENCE_MID,
} from '@/types/video'

// Re-export for convenience
export {
  CONFIDENCE_HIGH,
  CONFIDENCE_MID,
  type ConfidenceLevel,
  getConfidenceLevel,
}

// ── Filter values ───────────────────────────────────────────────
// Centralized so all filter comparisons use the same source of truth

export type ConfidenceFilterValue = 'all' | ConfidenceLevel

export const CONFIDENCE_FILTER_LEVELS = ['all', 'high', 'mid', 'low'] as const satisfies readonly ConfidenceFilterValue[]

// ── Heatmap gradient cache ─────────────────────────────────────
// Confidence values are floats in [0,1]; quantize to 1% steps for cache hits.
// 101 entries covers 0.00–1.00 inclusive.
const _heatmapCache = new Map<number, string>()
const _HEATMAP_QUANTIZE = 100

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
 * Result is cached and quantized to 1% steps for performance.
 */
export function getConfidenceHeatmap(confidence: number): string {
  const key = Math.round(confidence * _HEATMAP_QUANTIZE) / _HEATMAP_QUANTIZE
  const cached = _heatmapCache.get(key)
  if (cached !== undefined) return cached

  let result: string
  if (confidence >= CONFIDENCE_HIGH) {
    // Map [CONFIDENCE_HIGH, 1.0] to [85%, 100%] - more confident = more green at top
    const t = (confidence - CONFIDENCE_HIGH) / (1 - CONFIDENCE_HIGH)
    const stopPosition = Math.round(85 + t * 15)
    result = `linear-gradient(180deg, #22c55e ${stopPosition}%, #16a34a 100%)`
  } else if (confidence >= CONFIDENCE_MID) {
    // Interpolate yellow to green
    const t = (confidence - CONFIDENCE_MID) / (CONFIDENCE_HIGH - CONFIDENCE_MID)
    const r = Math.round(234 - t * 12)
    const g = Math.round(179 + t * 17)
    const b = Math.round(8 + t * 78)
    result = `linear-gradient(180deg, rgb(${r},${g},${b}) 0%, rgb(${Math.round(r * 0.7)},${Math.round(g * 0.7)},${Math.round(b * 0.7)}) 100%)`
  } else {
    // Interpolate red to yellow
    const t = confidence / CONFIDENCE_MID
    const r = Math.round(239 - t * 5)
    const g = Math.round(68 + t * 111)
    const b = Math.round(68 + t * 60)
    result = `linear-gradient(180deg, rgb(${r},${g},${b}) 0%, rgb(${Math.round(r * 0.7)},${Math.round(g * 0.7)},${Math.round(b * 0.7)}) 100%)`
  }

  _heatmapCache.set(key, result)
  return result
}

const CONFIDENCE_COLOR_MAP: Record<ConfidenceLevel, string> = {
  high: '#34D399', // emerald
  mid:  '#FBBF24', // amber
  low:  '#F87171', // rose
}

/**
 * Get a solid color (hex) for confidence level
 * Used for badges and indicators
 */
export function getConfidenceColor(confidence: number): string {
  return CONFIDENCE_COLOR_MAP[getConfidenceLevel(confidence)]
}

/**
 * Format confidence as percentage string
 */
export function formatConfidence(confidence: number): string {
  return `${Math.round(confidence * 100)}%`
}
