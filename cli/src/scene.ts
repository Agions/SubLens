/**
 * Scene detection via quantized RGB histogram + chi-square test.
 * Ported from Vue composable useSubtitleExtractor.ts
 */

/**
 * Compare two frames using 16-bin quantized RGB histograms.
 * Returns true if the two frames are significantly different (scene change).
 *
 * @param prevPixels - RGBA pixel buffer (raw Uint8 data)
 * @param currPixels - RGBA pixel buffer (raw Uint8 data)
 * @param width - Frame width
 * @param height - Frame height
 * @param threshold - Chi-square threshold (default 0.3). Higher = more sensitive (more scene changes detected).
 */
export function detectSceneChange(
  prevPixels: Uint8ClampedArray,
  currPixels: Uint8ClampedArray,
  width: number,
  height: number,
  threshold: number = 0.3
): boolean {
  const binCount = 16
  const binSize = 256 / binCount // 16 levels per channel
  const totalBins = binCount * 3 // R + G + B

  const prevHist = new Array(totalBins).fill(0)
  const currHist = new Array(totalBins).fill(0)

  const totalPixels = width * height
  const sampleStep = Math.max(1, Math.floor(totalPixels / 2000)) // Sample up to 2000 pixels

  for (let i = 0; i < totalPixels * 4; i += 4 * sampleStep) {
    const rIdx = Math.floor(prevPixels[i] / binSize)
    const gIdx = Math.floor(prevPixels[i + 1] / binSize) + binCount
    const bIdx = Math.floor(prevPixels[i + 2] / binSize) + binCount * 2

    const crIdx = Math.floor(currPixels[i] / binSize)
    const cgIdx = Math.floor(currPixels[i + 1] / binSize) + binCount
    const cbIdx = Math.floor(currPixels[i + 2] / binSize) + binCount * 2

    prevHist[rIdx]++
    prevHist[gIdx]++
    prevHist[bIdx]++
    currHist[crIdx]++
    currHist[cgIdx]++
    currHist[cbIdx]++
  }

  // Normalize by sample count
  const sampleCount = Math.floor(totalPixels / sampleStep)

  // Chi-square test
  let chiSquare = 0
  for (let b = 0; b < totalBins; b++) {
    const expected = prevHist[b] || 0.1
    const observed = currHist[b]
    chiSquare += ((observed - expected) ** 2) / expected
  }

  // Threshold scaled to bin count (higher threshold = less sensitive)
  return chiSquare > threshold * totalBins
}

/**
 * Compare two raw pixel buffers for similarity (fallback if no frame data).
 * Uses a simple sum of absolute differences.
 */
export function pixelDifference(
  prev: Uint8ClampedArray,
  curr: Uint8ClampedArray,
  sampleSize: number = 1000
): number {
  const len = Math.min(prev.length, curr.length, sampleSize * 4)
  let diff = 0

  for (let i = 0; i < len; i += 4) {
    const rDiff = Math.abs(prev[i] - curr[i])
    const gDiff = Math.abs(prev[i + 1] - curr[i + 1])
    const bDiff = Math.abs(prev[i + 2] - curr[i + 2])
    diff += (rDiff + gDiff + bDiff) / 3
  }

  return diff / (len / 4)
}
