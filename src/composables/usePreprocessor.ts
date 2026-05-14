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
 *
 * Pure image processing primitives are in @/utils/image.
 * This file contains the DOM-dependent factory (useImagePreprocessor).
 */

import { CANVAS_CONTEXT_2D, MIME_IMAGE_PNG, ERR_CANVAS_CTX_2D } from '@/utils/constants'
import type { DeskewResult } from '@/utils/image'
import {
  toGrayscale,
  enhanceContrast,
  boxBlur,
  adaptiveThreshold,
  invertColors,
  scaleUp,
  applyDeskew,
  morphOpen,
} from '@/utils/image'

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
  multiPassScale: 3.0,
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
      const deskewResult: DeskewResult = applyDeskew(current)
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
      },
    }
  }

  /**
   * Preprocess for subtitle OCR specifically
   */
  function preprocessForSubtitles(imageData: ImageData): PreprocessorResult {
    return preprocess(imageData, {
      scaleFactor: 2.0,
      enhanceContrast: true,
      contrastLevel: 1.8,
      adaptiveThreshold: true,
      adaptiveBlockSize: 9,
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
 * Helper: Convert ImageData to canvas (DOM-dependent)
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
