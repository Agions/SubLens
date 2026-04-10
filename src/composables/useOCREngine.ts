/**
 * useOCREngine — OCR 引擎 composable
 * ====================================
 * 职责：
 * - Tesseract.js 生命周期管理（init/terminate）
 * - 单帧 OCR 处理（processROI / processImageData）
 * - 多通道 OCR（processMultiPass）
 *
 * 不再负责（已迁移到 core/）：
 * - 置信度校准 → ConfidenceCalibrator
 * - 文本后处理 → ConfidenceCalibrator.postProcessText
 * - 后处理管道 → SubtitlePipeline
 * - 相似度计算 → SubtitlePipeline.textSimilarity
 */

import { ref, shallowRef } from 'vue'
import type { OCRConfig, OCREngine } from '@/types/video'
import { useImagePreprocessor } from './useImagePreprocessor'
import { getCalibrator } from '@/core'

// ─── 类型保留（供外部使用）───────────────────────────────────────
export interface OCRResult {
  text: string
  confidence: number
  boundingBox: {
    x: number
    y: number
    width: number
    height: number
  }
}

export interface OCRProcessingOptions {
  preprocess?: boolean
  preprocessMode?: 'subtitle' | 'document' | 'none'
  scaleFactor?: number
  multiPass?: boolean
  useGpu?: boolean
}

// ─── Tesseract 缓存 ───────────────────────────────────────────────
let cachedTesseractModule: typeof import('tesseract.js') | null = null

interface TesseractLoggerMessage {
  status: string
  progress: number
}

export function useOCREngine() {
  const isReady = ref(false)
  const isProcessing = ref(false)
  const progress = ref(0)
  const error = ref<string | null>(null)
  const preprocessor = useImagePreprocessor()
  const calibrator = getCalibrator()

  const worker = shallowRef<unknown>(null)

  // ─── 安全 ROI 裁剪 ───────────────────────────────────────────
  function safeExtractROI(
    imageData: ImageData,
    roiX: number,
    roiY: number,
    roiWidth: number,
    roiHeight: number
  ): ImageData {
    const safeX = Math.max(0, Math.min(Math.floor(roiX), imageData.width - 1))
    const safeY = Math.max(0, Math.min(Math.floor(roiY), imageData.height - 1))
    const safeW = Math.max(1, Math.min(Math.floor(roiWidth),  imageData.width  - safeX))
    const safeH = Math.max(1, Math.min(Math.floor(roiHeight), imageData.height - safeY))

    const roiImageData = new ImageData(safeW, safeH)

    for (let y = 0; y < safeH; y++) {
      for (let x = 0; x < safeW; x++) {
        const srcIdx = ((safeY + y) * imageData.width + (safeX + x)) * 4
        const dstIdx = (y * safeW + x) * 4

        if (srcIdx + 3 < imageData.data.length && dstIdx + 3 < roiImageData.data.length) {
          roiImageData.data[dstIdx]     = imageData.data[srcIdx]
          roiImageData.data[dstIdx + 1] = imageData.data[srcIdx + 1]
          roiImageData.data[dstIdx + 2] = imageData.data[srcIdx + 2]
          roiImageData.data[dstIdx + 3] = 255
        }
      }
    }

    return roiImageData
  }

  // ─── 预处理 ───────────────────────────────────────────────────
  function applyPreprocessing(
    imageData: ImageData,
    mode: 'subtitle' | 'document' | 'none' = 'subtitle'
  ): ImageData {
    if (mode === 'none') return imageData
    const result = mode === 'subtitle'
      ? preprocessor.preprocessForSubtitles(imageData)
      : preprocessor.preprocessForGeneralText(imageData)
    return result.processedData
  }

  // ─── 初始化 ───────────────────────────────────────────────────
  async function init(
    engine: OCREngine = 'tesseract',
    langs: string[] = ['eng', 'chi_sim'],
    options: { useGpu?: boolean } = {}
  ) {
    error.value = null

    try {
      if (engine === 'tesseract') {
        if (!cachedTesseractModule) {
          cachedTesseractModule = await import('tesseract.js')
        }
        const Tesseract = cachedTesseractModule!

        if (worker.value) {
          await (worker.value as { terminate: () => Promise<void> }).terminate()
        }

        const workerNum = options.useGpu ?? true ? 2 : 1

        worker.value = await Tesseract.createWorker(langs.join('+'), workerNum, {
          logger: (m: TesseractLoggerMessage) => {
            if (m.status === 'recognizing text') {
              progress.value = Math.round(m.progress * 100)
            }
          },
          gzip: true,
        })

        await (worker.value as { setParameters: (p: Record<string, string>) => Promise<void> }).setParameters({
          tessedit_pageseg_mode: '3',
          preserve_interword_spaces: '1',
        })

        isReady.value = true
      }
      // 其他引擎占位
    } catch (e) {
      error.value = `Failed to initialize OCR engine: ${e}`
      isReady.value = false
    }
  }

  // ─── 核心识别 ─────────────────────────────────────────────────
  async function processImageData(
    imageData: ImageData,
    _config: OCRConfig,
    options: OCRProcessingOptions = {}
  ): Promise<OCRResult[]> {
    if (!isReady.value || !worker.value) {
      throw new Error('OCR engine not initialized')
    }

    isProcessing.value = true
    progress.value = 0
    error.value = null

    try {
      let processedImage = imageData
      if (options.preprocess !== false && options.preprocessMode !== 'none') {
        processedImage = applyPreprocessing(imageData, options.preprocessMode ?? 'subtitle')
      }

      const canvas = document.createElement('canvas')
      canvas.width = processedImage.width
      canvas.height = processedImage.height
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Failed to get canvas context')

      ctx.putImageData(processedImage, 0, 0)
      const imageUrl = canvas.toDataURL('image/png')

      const w = worker.value as {
        recognize: (img: string) => Promise<{
          data: { words: Array<{
            text: string
            confidence: number
            bbox: { x0: number; y0: number; x1: number; y1: number }
          }> }
        }>
      }
      const result = await w.recognize(imageUrl)

      progress.value = 100

      return result.data.words.map(word => ({
        text: word.text,
        confidence: word.confidence / 100,
        boundingBox: {
          x: word.bbox.x0,
          y: word.bbox.y0,
          width: word.bbox.x1 - word.bbox.x0,
          height: word.bbox.y1 - word.bbox.y0,
        },
      }))
    } catch (e) {
      error.value = `OCR processing failed: ${e}`
      throw e
    } finally {
      isProcessing.value = false
    }
  }

  // ─── ROI 处理 ─────────────────────────────────────────────────
  async function processROI(
    imageData: ImageData,
    roi: { x: number; y: number; width: number; height: number },
    config: OCRConfig,
    options: OCRProcessingOptions = {}
  ): Promise<OCRResult> {
    const { preprocess = true, preprocessMode = 'subtitle' } = options

    const roiImageData = safeExtractROI(imageData, roi.x, roi.y, roi.width, roi.height)

    let processedROI = roiImageData
    if (preprocess && preprocessMode !== 'none') {
      processedROI = applyPreprocessing(roiImageData, preprocessMode)
    }

    const results = await processImageData(processedROI, config, { preprocess: false })

    const rawText = results.map(r => r.text).join(' ')
    const rawConfidence = results.length > 0
      ? results.reduce((sum, r) => sum + r.confidence, 0) / results.length
      : 0

    const lang = config.language?.[0] ?? 'ch'
    const { confidence: finalConfidence } = calibrator.calibrateEnhanced(rawText, rawConfidence, lang)

    return {
      text: rawText.trim(),
      confidence: finalConfidence,
      boundingBox: { x: roi.x, y: roi.y, width: roi.width, height: roi.height },
    }
  }

  // ─── 多通道 OCR ───────────────────────────────────────────────
  async function processMultiPass(
    imageData: ImageData,
    config: OCRConfig,
    options: OCRProcessingOptions = {}
  ): Promise<OCRResult[]> {
    if (!options.multiPass) {
      return processImageData(imageData, config, options)
    }

    if (!isReady.value || !worker.value) {
      throw new Error('OCR engine not initialized')
    }

    isProcessing.value = true
    error.value = null

    try {
      // Pass 1: 标准预处理
      const r1 = await processImageData(imageData, config, {
        preprocess: true,
        preprocessMode: 'subtitle',
        scaleFactor: 2.0,
      })

      // Pass 2: 更高缩放（小字）
      const r2 = await processImageData(imageData, config, {
        preprocess: true,
        preprocessMode: 'subtitle',
        scaleFactor: 3.0,
      })

      // Pass 3: 不同阈值
      const r3 = await processImageData(imageData, config, {
        preprocess: true,
        preprocessMode: 'subtitle',
        scaleFactor: 2.5,
      })

      // 空间网格合并（去重）
      const merged = mergeOCRResults([r1, r2, r3])
      progress.value = 100
      return merged
    } catch (e) {
      error.value = `Multi-pass OCR failed: ${e}`
      throw e
    } finally {
      isProcessing.value = false
    }
  }

  // ─── OCR 结果合并（空间网格）─────────────────────────────────
  function mergeOCRResults(resultsList: OCRResult[][]): OCRResult[] {
    const flat = resultsList.flat().sort((a, b) => b.confidence - a.confidence)
    const cellSize = 20
    const grid = new Map<string, OCRResult>()

    for (const word of flat) {
      const cx = word.boundingBox.x + word.boundingBox.width / 2
      const cy = word.boundingBox.y + word.boundingBox.height / 2
      const cellKey = `${Math.floor(cx / cellSize)},${Math.floor(cy / cellSize)}`

      let isDuplicate = false
      for (let dx = -1; dx <= 1 && !isDuplicate; dx++) {
        for (let dy = -1; dy <= 1 && !isDuplicate; dy++) {
          const neighborKey = `${Math.floor(cx / cellSize) + dx},${Math.floor(cy / cellSize) + dy}`
          const existing = grid.get(neighborKey)
          if (existing && existing.text === word.text) {
            isDuplicate = true
          }
        }
      }

      if (!isDuplicate) {
        grid.set(cellKey, word)
      }
    }

    return Array.from(grid.values())
  }

  // ─── 终止 ─────────────────────────────────────────────────────
  async function terminate() {
    if (worker.value) {
      await (worker.value as { terminate: () => Promise<void> }).terminate()
      worker.value = null
      isReady.value = false
    }
  }

  return {
    isReady,
    isProcessing,
    progress,
    error,
    init,
    processImageData,
    processROI,
    processMultiPass,
    terminate,
    applyPreprocessing,
    safeExtractROI,
  }
}
