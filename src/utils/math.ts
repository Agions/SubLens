/**
 * Math utilities — consolidated from useImagePreprocessor.ts and ConfidenceCalibrator.ts
 */

/**
 * Clamp a value to [min, max] range.
 */
export function clamp(value: number, min = 0, max = 1): number {
  return Math.max(min, Math.min(max, value))
}
