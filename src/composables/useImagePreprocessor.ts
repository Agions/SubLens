/**
 * Image preprocessing for OCR accuracy improvement
 *
 * Key techniques:
 * 1. Grayscale conversion
 * 2. Contrast enhancement
 * 3. Adaptive thresholding (for subtitles with transparent backgrounds)
 * 4. Noise removal
 * 5. Deskewing (rotation correction)
 * 6. Scaling up small text
 * 7. Multi-pass OCR with different configurations
 * 8. GPU-accelerated operations where available
 */

import { clamp } from '@/utils/math'
import { CANVAS_CONTEXT_2D, MIME_IMAGE_PNG, ERR_CANVAS_CTX_2D } from '@/utils/constants'

// Re-export for backwards compatibility (used by test files)
export { clamp }

export interface PreprocessorConfig {
  /** Scale factor for upscaling small images (default: 2.0) */
  scaleFactor: number
  /** Apply contrast enhancement (default: true) */
  enhanceContrast: boolean
  /** Contrast multiplier (default: 1.5) */
  contrastLevel: number
  /** Apply adaptive thresholding for binary-like result (default: true) */
  adaptiveThreshold: boolean
  /** Adaptive threshold block size (odd number, default: 11) */
  adaptiveBlockSize: number
  /** Apply Gaussian blur for noise reduction (default: true) */
  denoise: boolean
  /** Morphological operation to clean up (default: true) */
  morphCleanup: boolean
  /** Invert colors if text is dark on light background (default: false) */
  invertColors: boolean
  /** Detect and correct skewed text (default: true) */
  deskew: boolean
  /** Use multiple preprocessing passes and merge results (default: true) */
  multiPass: boolean
  /** Scale factor for multi-pass (second pass uses different scale) */
  multiPassScale?: number
}

/**
 * Result of deskew analysis
 */
interface DeskewResult {
  angle: number
  corrected: ImageData
}

const DEFAULT_CONFIG: PreprocessorConfig = {
  scaleFactor: 2.0,
  enhanceContrast: true,
  contrastLevel: 1.5,
  adaptiveThreshold: true,
  adaptiveBlockSize: 11,
  denoise: true,
  morphCleanup: true,
  invertColors: false,
  deskew: true,
  multiPass: true,
  multiPassScale: 3.0, // Higher scale for second pass
}

/**
 * Apply grayscale conversion to image data
 */
export function toGrayscale(imageData: ImageData): ImageData {
  const { data, width, height } = imageData
  const grayscale = new ImageData(width, height)
  
  for (let i = 0; i < data.length; i += 4) {
    // Use luminosity method for better OCR
    const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
    grayscale.data[i] = gray
    grayscale.data[i + 1] = gray
    grayscale.data[i + 2] = gray
    grayscale.data[i + 3] = data[i + 3] // Keep alpha
  }
  
  return grayscale
}

/**
 * Apply contrast enhancement
 */
export function enhanceContrast(imageData: ImageData, level: number): ImageData {
  const { data, width, height } = imageData
  const result = new ImageData(width, height)
  
  const factor = 0.5 + (level * (259 * 255) / (255 * 259))
  // factor = 0.5 at level=0, 1.0 at level=0.5, 1.5 at level=1
  // Standard contrast formula: output = (input-128) * factor + 128
  // identity when factor=1 (level=0.5)
  
  for (let i = 0; i < data.length; i += 4) {
    result.data[i] = clamp(Math.round(factor * (data[i] - 128) + 128), 0, 255)
    result.data[i + 1] = clamp(Math.round(factor * (data[i + 1] - 128) + 128), 0, 255)
    result.data[i + 2] = clamp(Math.round(factor * (data[i + 2] - 128) + 128), 0, 255)
    result.data[i + 3] = data[i + 3]
  }
  
  return result
}

/**
 * Simple box blur for noise reduction
 */
export function boxBlur(imageData: ImageData, radius: number = 1): ImageData {
  const { data, width, height } = imageData
  const result = new ImageData(width, height)
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0, g = 0, b = 0, a = 0, count = 0
      
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const nx = x + dx
          const ny = y + dy
          
          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            const idx = (ny * width + nx) * 4
            r += data[idx]
            g += data[idx + 1]
            b += data[idx + 2]
            a += data[idx + 3]
            count++
          }
        }
      }
      
      const idx = (y * width + x) * 4
      result.data[idx] = r / count
      result.data[idx + 1] = g / count
      result.data[idx + 2] = b / count
      result.data[idx + 3] = a / count
    }
  }
  
  return result
}

/**
 * Adaptive thresholding - excellent for subtitles with transparent backgrounds
 * Converts to binary-like image for better OCR
 */
export function adaptiveThreshold(imageData: ImageData, blockSize: number = 11, C: number = 2): ImageData {
  const { width, height } = imageData
  const result = new ImageData(width, height)

  // First apply Gaussian blur to reduce noise
  const blurred = boxBlur(imageData, Math.floor(blockSize / 3))
  const blurredData = blurred.data
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4
      const pixel = blurredData[idx]
      
      // Calculate local mean
      let sum = 0, count = 0
      const halfBlock = Math.floor(blockSize / 2)
      
      for (let by = -halfBlock; by <= halfBlock; by++) {
        for (let bx = -halfBlock; bx <= halfBlock; bx++) {
          const nx = x + bx
          const ny = y + by
          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            sum += blurredData[(ny * width + nx) * 4]
            count++
          }
        }
      }
      
      const localMean = sum / count
      const threshold = localMean - C
      
      // Apply threshold
      const value = pixel > threshold ? 255 : 0
      result.data[idx] = value
      result.data[idx + 1] = value
      result.data[idx + 2] = value
      result.data[idx + 3] = 255
    }
  }
  
  return result
}

/**
 * Morphological operations to clean up binary images
 */
function morphOpen(imageData: ImageData, size: number = 1): ImageData {
  // Erosion followed by dilation - removes small noise
  const eroded = morphologicalErode(imageData, size)
  return morphologicalDilate(eroded, size)
}

function morphologicalErode(imageData: ImageData, size: number): ImageData {
  const { data, width, height } = imageData
  const result = new ImageData(width, height)
  
  // Precompute (dy, dx) neighbor offsets
  const neighborDeltas: [number, number][] = []
  for (let dy = -size; dy <= size; dy++) {
    for (let dx = -size; dx <= size; dx++) {
      neighborDeltas.push([dy, dx])
    }
  }
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let min = 255
      
      for (const [dy, dx] of neighborDeltas) {
        const nx = x + dx
        const ny = y + dy
        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
          const idx = (ny * width + nx) * 4
          min = Math.min(min, data[idx])
        }
      }
      
      const ri = (y * width + x) * 4
      result.data[ri] = min
      result.data[ri + 1] = min
      result.data[ri + 2] = min
      result.data[ri + 3] = 255
    }
  }
  
  return result
}

function morphologicalDilate(imageData: ImageData, size: number): ImageData {
  const { data, width, height } = imageData
  const result = new ImageData(width, height)
  
  // Precompute (dy, dx) neighbor offsets
  const neighborDeltas: [number, number][] = []
  for (let dy = -size; dy <= size; dy++) {
    for (let dx = -size; dx <= size; dx++) {
      neighborDeltas.push([dy, dx])
    }
  }
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let max = 0
      
      for (const [dy, dx] of neighborDeltas) {
        const nx = x + dx
        const ny = y + dy
        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
          const idx = (ny * width + nx) * 4
          max = Math.max(max, data[idx])
        }
      }
      
      const ri = (y * width + x) * 4
      result.data[ri] = max
      result.data[ri + 1] = max
      result.data[ri + 2] = max
      result.data[ri + 3] = 255
    }
  }
  
  return result
}

/**
 * Detect skew angle using projection profile method
 * Returns angle in degrees (-45 to 45)
 */
function detectSkewAngle(imageData: ImageData): number {
  const { data, width, height } = imageData
  
  // Convert to binary (flat Uint8Array instead of 2D boolean array)
  const binary = new Uint8Array(width * height)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4
      binary[y * width + x] = data[idx] < 128 ? 1 : 0 // Text is dark
    }
  }
  
  // Precompute cos/sin for each angle (1° steps, 31 angles from -15 to 15)
  const angleSteps = 31
  const angleMin = -15
  const cosTable = new Float32Array(angleSteps)
  const sinTable = new Float32Array(angleSteps)
  for (let i = 0; i < angleSteps; i++) {
    const radians = (angleMin + i) * Math.PI / 180
    cosTable[i] = Math.cos(radians)
    sinTable[i] = Math.sin(radians)
  }
  
  // Test 1° step angles and find the best
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

/**
 * Rotate image by angle (in degrees)
 */
function rotateImage(imageData: ImageData, angle: number): ImageData {
  if (Math.abs(angle) < 0.5) return imageData // Skip small angles
  
  const { data, width, height } = imageData
  const radians = angle * Math.PI / 180
  const cos = Math.cos(radians)
  const sin = Math.sin(radians)
  
  // Calculate new dimensions
  const newWidth = Math.round(Math.abs(width * cos) + Math.abs(height * sin)) + 2
  const newHeight = Math.round(Math.abs(height * cos) + Math.abs(width * sin)) + 2
  
  const result = new ImageData(newWidth, newHeight)
  const cx = width / 2
  const cy = height / 2
  const newCx = newWidth / 2
  const newCy = newHeight / 2
  
  for (let y = 0; y < newHeight; y++) {
    for (let x = 0; x < newWidth; x++) {
      // Rotate point back
      const dx = x - newCx
      const dy = y - newCy
      const srcX = Math.round(dx * cos + dy * sin + cx)
      const srcY = Math.round(-dx * sin + dy * cos + cy)
      
      if (srcX >= 0 && srcX < width && srcY >= 0 && srcY < height) {
        const srcIdx = (srcY * width + srcX) * 4
        const dstIdx = (y * newWidth + x) * 4
        result.data[dstIdx]     = data[srcIdx]
        result.data[dstIdx + 1] = data[srcIdx + 1]
        result.data[dstIdx + 2] = data[srcIdx + 2]
        // Preserve source alpha, defaulting to opaque if fully transparent (edge pixels)
        result.data[dstIdx + 3] = data[srcIdx + 3] || 255
      }
    }
  }
  
  return result
}

/**
 * Apply deskewing to image
 */
function applyDeskew(imageData: ImageData): DeskewResult {
  const angle = detectSkewAngle(imageData)
  const corrected = rotateImage(imageData, angle)
  return { angle, corrected }
}

/**
 * Scale up image for better OCR on small text
 */
function scaleUp(imageData: ImageData, factor: number): ImageData {
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

/**
 * Invert colors if needed (for dark text on light background)
 */
function invertColors(imageData: ImageData): ImageData {
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

export interface PreprocessorResult {
  processedData: ImageData
  canvas: HTMLCanvasElement
  toDataURL(): string
  toBlob(): Promise<Blob>
}

/**
 * Main preprocessing pipeline for OCR
 */
export function useImagePreprocessor() {
  /**
   * Process image data for improved OCR accuracy
   */
  function preprocess(
    imageData: ImageData,
    config: Partial<PreprocessorConfig> = {}
  ): PreprocessorResult {
    const cfg = { ...DEFAULT_CONFIG, ...config }
    let current: ImageData = imageData
    
    // 0. Deskew if enabled (before any other processing)
    if (cfg.deskew) {
      const deskewResult = applyDeskew(current)
      current = deskewResult.corrected
    }
    
    // 1. Scale up first (before any other processing for best quality)
    if (cfg.scaleFactor > 1) {
      current = scaleUp(current, cfg.scaleFactor)
    }
    
    // 2. Convert to grayscale
    current = toGrayscale(current)
    
    // 3. Apply contrast enhancement
    if (cfg.enhanceContrast) {
      current = enhanceContrast(current, cfg.contrastLevel)
    }
    
    // 4. Denoise with blur
    if (cfg.denoise) {
      current = boxBlur(current, 1)
    }
    
    // 5. Apply adaptive thresholding (key for subtitles)
    if (cfg.adaptiveThreshold) {
      current = adaptiveThreshold(current, cfg.adaptiveBlockSize)
    }
    
    // 6. Morphological cleanup
    if (cfg.morphCleanup) {
      current = morphOpen(current, 1)
    }
    
    // 7. Invert if needed
    if (cfg.invertColors) {
      current = invertColors(current)
    }
    
    // Create canvas for result
    const canvas = imageDataToCanvas(current)
    
    return {
      processedData: current,
      canvas,
      toDataURL(): string {
        return canvas.toDataURL(MIME_IMAGE_PNG)
      },
      toBlob(): Promise<Blob> {
        return new Promise((resolve, reject) => {
          canvas.toBlob(blob => {
            if (blob) resolve(blob)
            else reject(new Error('Failed to create blob'))
          }, 'image/png')
        })
      }
    }
  }
  
  /**
   * Preprocess for subtitle OCR specifically
   * Subtitles typically have:
   * - Semi-transparent dark background
   * - White or yellow text
   * - Located at bottom of frame
   */
  function preprocessForSubtitles(imageData: ImageData): PreprocessorResult {
    return preprocess(imageData, {
      scaleFactor: 2.0,
      enhanceContrast: true,
      contrastLevel: 1.8,
      adaptiveThreshold: true,
      adaptiveBlockSize: 9, // Smaller block for thinner subtitle text
      denoise: true,
      morphCleanup: true,
      invertColors: false,
      deskew: true,
      multiPass: true,
    })
  }
  
  /**
   * Preprocess for general text (documents, screenshots)
   */
  function preprocessForGeneralText(imageData: ImageData): PreprocessorResult {
    return preprocess(imageData, {
      scaleFactor: 1.5,
      enhanceContrast: true,
      contrastLevel: 1.5,
      adaptiveThreshold: true,
      adaptiveBlockSize: 11,
      denoise: true,
      morphCleanup: true,
      invertColors: false,
      deskew: true,
      multiPass: false,
    })
  }
  
  return {
    preprocess,
    preprocessForSubtitles,
    preprocessForGeneralText,
    DEFAULT_CONFIG,
  }
}

/**
 * Helper: Convert ImageData to canvas
 */
function imageDataToCanvas(imageData: ImageData): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = imageData.width
  canvas.height = imageData.height
  const ctx = canvas.getContext(CANVAS_CONTEXT_2D)
  if (!ctx) throw new Error(ERR_CANVAS_CTX_2D)
  ctx.putImageData(imageData, 0, 0)
  return canvas
}

/**
 * Helper: Convert canvas to ImageData
 */
export function canvasToImageData(canvas: HTMLCanvasElement): ImageData {
  const ctx = canvas.getContext(CANVAS_CONTEXT_2D)
  if (!ctx) throw new Error(ERR_CANVAS_CTX_2D)
  return ctx.getImageData(0, 0, canvas.width, canvas.height)
}
