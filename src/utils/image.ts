/**
 * Pure image processing primitives for OCR preprocessing.
 * No DOM/browser dependencies — all functions accept and return ImageData.
 */

import { clamp, pixelLuma } from '@/utils/math'

// ─── Types ────────────────────────────────────────────────────────

export interface DeskewResult {
  angle: number
  corrected: ImageData
}

export interface NormalizedROI {
  x0: number
  y0: number
  rw: number
  rh: number
  xEnd: number
  yEnd: number
}

/**
 * Converts percentage-based ROI [0–100] to absolute pixel coordinates
 * with boundary clamping. Used by both the OCR extractor and scene detector.
 */
export function normalizeROI(
  roi: { x: number; y: number; width: number; height: number },
  width: number,
  height: number,
  minSize = 0,
): NormalizedROI {
  const x0 = clamp(Math.floor((roi.x / 100) * width), 0, width)
  const y0 = clamp(Math.floor((roi.y / 100) * height), 0, height)
  const rw = clamp(Math.floor((roi.width / 100) * width), minSize, width - x0)
  const rh = clamp(Math.floor((roi.height / 100) * height), minSize, height - y0)
  return {
    x0,
    y0,
    rw,
    rh,
    xEnd: x0 + rw,
    yEnd: y0 + rh,
  }
}

// ─── Kernel utilities ─────────────────────────────────────────────

type NeighborCallback = (nx: number, ny: number, srcIdx: number) => void

function forEachNeighbor(
  centerX: number,
  centerY: number,
  width: number,
  height: number,
  offsets: [number, number][],
  callback: NeighborCallback,
): void {
  for (const [dx, dy] of offsets) {
    const nx = centerX + dx
    const ny = centerY + dy
    if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
      callback(nx, ny, (ny * width + nx) * 4)
    }
  }
}

function _getSquareKernel(
  radius: number,
  cache: Map<number, [number, number][]>,
): [number, number][] {
  if (!cache.has(radius)) {
    const deltas: [number, number][] = []
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        deltas.push([dy, dx])
      }
    }
    cache.set(radius, deltas)
  }
  return cache.get(radius)!
}

// Per-operation caches (avoids cross-operation interference)
const _boxBlurKernelCache = new Map<number, [number, number][]>()
const _adaptiveBlockKernelCache = new Map<number, [number, number][]>()
const _morphKernelCache = new Map<number, [number, number][]>()

// ─── Core pixel operations ────────────────────────────────────────

export function toGrayscale(imageData: ImageData): ImageData {
  const { data, width, height } = imageData
  const grayscale = new ImageData(width, height)

  for (let i = 0; i < data.length; i += 4) {
    const gray = pixelLuma(data, i)
    grayscale.data[i] = gray
    grayscale.data[i + 1] = gray
    grayscale.data[i + 2] = gray
    grayscale.data[i + 3] = data[i + 3] // Keep alpha
  }

  return grayscale
}

export function enhanceContrast(imageData: ImageData, level: number): ImageData {
  const { data, width, height } = imageData
  const result = new ImageData(width, height)

  // factor = 0.5 at level=0, 1.0 at level=0.5, 1.5 at level=1
  const factor = 0.5 + (level * (259 * 255)) / (255 * 259)

  for (let i = 0; i < data.length; i += 4) {
    result.data[i] = clamp(Math.round(factor * (data[i] - 128) + 128), 0, 255)
    result.data[i + 1] = clamp(Math.round(factor * (data[i + 1] - 128) + 128), 0, 255)
    result.data[i + 2] = clamp(Math.round(factor * (data[i + 2] - 128) + 128), 0, 255)
    result.data[i + 3] = data[i + 3]
  }

  return result
}

export function boxBlur(imageData: ImageData, radius: number = 1): ImageData {
  const { data, width, height } = imageData
  const result = new ImageData(width, height)
  const kernel = _getSquareKernel(radius, _boxBlurKernelCache)

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0, g = 0, b = 0, a = 0, count = 0

      forEachNeighbor(x, y, width, height, kernel, (_nx, _ny, idx) => {
        r += data[idx]
        g += data[idx + 1]
        b += data[idx + 2]
        a += data[idx + 3]
        count++
      })

      const idx = (y * width + x) * 4
      result.data[idx] = r / count
      result.data[idx + 1] = g / count
      result.data[idx + 2] = b / count
      result.data[idx + 3] = a / count
    }
  }

  return result
}

function _getAdaptiveKernel(blockSize: number): [number, number][] {
  return _getSquareKernel(Math.floor(blockSize / 2), _adaptiveBlockKernelCache)
}

export function adaptiveThreshold(imageData: ImageData, blockSize: number = 11, C: number = 2): ImageData {
  const { width, height } = imageData
  const result = new ImageData(width, height)

  // Apply Gaussian blur to reduce noise first
  const blurred = boxBlur(imageData, Math.floor(blockSize / 3))
  const blurredData = blurred.data

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4
      const pixel = blurredData[idx]

      let sum = 0, count = 0
      forEachNeighbor(x, y, width, height, _getAdaptiveKernel(blockSize), (_nx, _ny, idx) => {
        sum += blurredData[idx]
        count++
      })

      const localMean = sum / count
      const threshold = localMean - C
      const value = pixel > threshold ? 255 : 0

      result.data[idx] = value
      result.data[idx + 1] = value
      result.data[idx + 2] = value
      result.data[idx + 3] = 255
    }
  }

  return result
}

export function invertColors(imageData: ImageData): ImageData {
  const { data, width, height } = imageData
  const result = new ImageData(width, height)

  for (let i = 0; i < data.length; i += 4) {
    result.data[i] = 255 - data[i]
    result.data[i + 1] = 255 - data[i + 1]
    result.data[i + 2] = 255 - data[i + 2]
    result.data[i + 3] = data[i + 3]
  }

  return result
}

// ─── Scaling ──────────────────────────────────────────────────────

export function scaleUp(imageData: ImageData, factor: number): ImageData {
  const { data, width, height } = imageData
  const newWidth = Math.round(width * factor)
  const newHeight = Math.round(height * factor)
  const result = new ImageData(newWidth, newHeight)

  // Bilinear interpolation
  for (let y = 0; y < newHeight; y++) {
    for (let x = 0; x < newWidth; x++) {
      const srcX = x / factor
      const srcY = y / factor

      const x0 = Math.floor(srcX)
      const y0 = Math.floor(srcY)
      const x1 = Math.min(x0 + 1, width - 1)
      const y1 = Math.min(y0 + 1, height - 1)

      const fx = srcX - x0
      const fy = srcY - y0

      const i00 = (y0 * width + x0) * 4
      const i10 = (y0 * width + x1) * 4
      const i01 = (y1 * width + x0) * 4
      const i11 = (y1 * width + x1) * 4

      const idx = (y * newWidth + x) * 4

      for (let c = 0; c < 4; c++) {
        const v00 = data[i00 + c]
        const v10 = data[i10 + c]
        const v01 = data[i01 + c]
        const v11 = data[i11 + c]

        const v0 = v00 + (v10 - v00) * fx
        const v1 = v01 + (v11 - v01) * fx
        const v = v0 + (v1 - v0) * fy

        result.data[idx + c] = c === 3 ? 255 : Math.round(v)
      }
    }
  }

  return result
}

// ─── Rotation / deskew ────────────────────────────────────────────

function evaluateProjectionFast(binary: Uint8Array, width: number, height: number, cosVal: number, sinVal: number): number {
  const projections: number[] = new Array(height).fill(0)

  for (let y = 0; y < height; y++) {
    const rowOffset = y * width
    for (let x = 0; x < width; x++) {
      if (binary[rowOffset + x]) {
        const ry = Math.round(x * sinVal + y * cosVal)
        if (ry >= 0 && ry < height) {
          projections[ry]++
        }
      }
    }
  }

  // Score: lower variance = better alignment
  const mean = projections.reduce((a, b) => a + b, 0) / height
  let totalVariance = 0
  for (const p of projections) {
    totalVariance += (p - mean) ** 2
  }

  return -totalVariance // Negative because we want to maximize
}

export function detectSkewAngle(imageData: ImageData): number {
  const { data, width, height } = imageData

  // Convert to binary
  const binary = new Uint8Array(width * height)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4
      binary[y * width + x] = data[idx] < 128 ? 1 : 0
    }
  }

  // Precompute cos/sin for angles -15° to +15° in 1° steps
  const angleSteps = 31
  const angleMin = -15
  const cosTable = new Float32Array(angleSteps)
  const sinTable = new Float32Array(angleSteps)
  for (let i = 0; i < angleSteps; i++) {
    const radians = (angleMin + i) * Math.PI / 180
    cosTable[i] = Math.cos(radians)
    sinTable[i] = Math.sin(radians)
  }

  let bestAngle = 0
  let bestScore = -Infinity

  for (let i = 0; i < angleSteps; i++) {
    const score = evaluateProjectionFast(binary, width, height, cosTable[i], sinTable[i])
    if (score > bestScore) {
      bestScore = score
      bestAngle = angleMin + i
    }
  }

  return bestAngle
}

export function rotateImage(imageData: ImageData, angle: number): ImageData {
  if (Math.abs(angle) < 0.5) return imageData

  const { data, width, height } = imageData
  const radians = angle * Math.PI / 180
  const cos = Math.cos(radians)
  const sin = Math.sin(radians)

  const newWidth = Math.round(Math.abs(width * cos) + Math.abs(height * sin)) + 2
  const newHeight = Math.round(Math.abs(height * cos) + Math.abs(width * sin)) + 2

  const result = new ImageData(newWidth, newHeight)
  const cx = width / 2
  const cy = height / 2
  const newCx = newWidth / 2
  const newCy = newHeight / 2

  for (let y = 0; y < newHeight; y++) {
    for (let x = 0; x < newWidth; x++) {
      const dx = x - newCx
      const dy = y - newCy
      const srcX = Math.round(dx * cos + dy * sin + cx)
      const srcY = Math.round(-dx * sin + dy * cos + cy)

      if (srcX >= 0 && srcX < width && srcY >= 0 && srcY < height) {
        const srcIdx = (srcY * width + srcX) * 4
        const dstIdx = (y * newWidth + x) * 4
        result.data[dstIdx] = data[srcIdx]
        result.data[dstIdx + 1] = data[srcIdx + 1]
        result.data[dstIdx + 2] = data[srcIdx + 2]
        result.data[dstIdx + 3] = data[srcIdx + 3] || 255
      }
    }
  }

  return result
}

export function applyDeskew(imageData: ImageData): DeskewResult {
  const angle = detectSkewAngle(imageData)
  const corrected = rotateImage(imageData, angle)
  return { angle, corrected }
}

// ─── Morphological operations ─────────────────────────────────────

function _getMorphKernel(size: number): [number, number][] {
  return _getSquareKernel(size, _morphKernelCache)
}

function _morphologicalOp(
  imageData: ImageData,
  size: number,
  accumulate: (current: number, neighbor: number) => number,
  initial: number,
): ImageData {
  const { data, width, height } = imageData
  const result = new ImageData(width, height)
  const kernel = _getMorphKernel(size)

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let acc = initial
      forEachNeighbor(x, y, width, height, kernel, (_nx, _ny, idx) => {
        acc = accumulate(acc, data[idx])
      })
      const ri = (y * width + x) * 4
      result.data[ri] = acc
      result.data[ri + 1] = acc
      result.data[ri + 2] = acc
      result.data[ri + 3] = 255
    }
  }
  return result
}

export function morphologicalErode(imageData: ImageData, size: number): ImageData {
  return _morphologicalOp(imageData, size, Math.min, 255)
}

export function morphologicalDilate(imageData: ImageData, size: number): ImageData {
  return _morphologicalOp(imageData, size, Math.max, 0)
}

export function morphOpen(imageData: ImageData, size: number = 1): ImageData {
  const eroded = morphologicalErode(imageData, size)
  return morphologicalDilate(eroded, size)
}
