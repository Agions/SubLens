/**
 * Confidence level utilities
 *
 * Canonical source for confidence thresholds and heatmap visualization.
 */

export const CONFIDENCE_HIGH = 0.85
export const CONFIDENCE_MID = 0.60

export type ConfidenceLevel = 'high' | 'mid' | 'low'

export function getConfidenceLevel(confidence: number): ConfidenceLevel {
  if (confidence >= CONFIDENCE_HIGH) return 'high'
  if (confidence >= CONFIDENCE_MID) return 'mid'
  return 'low'
}

// ── Filter values ───────────────────────────────────────────────

export type ConfidenceFilterValue = 'all' | ConfidenceLevel

export const CONFIDENCE_FILTER_LEVELS = ['all', 'high', 'mid', 'low'] as const satisfies readonly ConfidenceFilterValue[]

// ── Heatmap ─────────────────────────────────────────────────────

// Confidence values are floats in [0,1]; quantize to 1% steps for cache hits.
const _heatmapCache = new Map<number, string>()
const _HEATMAP_QUANTIZE = 100

/**
 * Returns a CSS gradient color for the confidence heatmap bar.
 * Green (#22c55e) -> Yellow (#eab308) -> Red (#ef4444) based on confidence.
 */
export function getConfidenceHeatmap(confidence: number): string {
  const key = Math.round(confidence * _HEATMAP_QUANTIZE) / _HEATMAP_QUANTIZE
  const cached = _heatmapCache.get(key)
  if (cached !== undefined) return cached

  let result: string
  if (confidence >= CONFIDENCE_HIGH) {
    const t = (confidence - CONFIDENCE_HIGH) / (1 - CONFIDENCE_HIGH)
    const stopPosition = Math.round(85 + t * 15)
    result = `linear-gradient(180deg, #22c55e ${stopPosition}%, #16a34a 100%)`
  } else if (confidence >= CONFIDENCE_MID) {
    const t = (confidence - CONFIDENCE_MID) / (CONFIDENCE_HIGH - CONFIDENCE_MID)
    const r = Math.round(234 - t * 12)
    const g = Math.round(179 + t * 17)
    const b = Math.round(8 + t * 78)
    result = `linear-gradient(180deg, rgb(${r},${g},${b}) 0%, rgb(${Math.round(r * 0.7)},${Math.round(g * 0.7)},${Math.round(b * 0.7)}) 100%)`
  } else {
    const t = confidence / CONFIDENCE_MID
    const r = Math.round(239 - t * 5)
    const g = Math.round(68 + t * 111)
    const b = Math.round(68 + t * 60)
    result = `linear-gradient(180deg, rgb(${r},${g},${b}) 0%, rgb(${Math.round(r * 0.7)},${Math.round(g * 0.7)},${Math.round(b * 0.7)}) 100%)`
  }

  _heatmapCache.set(key, result)
  return result
}
