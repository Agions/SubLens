/**
 * Math utilities — consolidated from useImagePreprocessor.ts and ConfidenceCalibrator.ts
 */

/**
 * Clamp a value to [min, max] range.
 */
export function clamp(value: number, min = 0, max = 1): number {
  return Math.max(min, Math.min(max, value))
}

/**
 * ITU-R BT.601 luma conversion — RGB to grayscale.
 * Formula: Y = 0.299·R + 0.587·G + 0.114·B
 * Shared by useImagePreprocessor (toGrayscale) and useSubtitleExtractor (_isRoiRegionLikelyEmpty).
 */
export function rgbToGrayscale(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b
}

/**
 * ITU-R BT.601 luma from RGBA pixel index (RGBA interleaved Uint8ClampedArray).
 * Returns grayscale value [0-255].
 */
export function pixelLuma(data: Uint8ClampedArray, i: number): number {
  return 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
}
