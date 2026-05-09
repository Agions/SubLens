/**
 * useOCREngine — OCR 引擎 composable
 * ====================================
 * 职责：
 * - Tesseract.js 生命周期管理（init/terminate）
 * - 单帧 OCR 处理（processROI / processImageData）
 * - 多通道 OCR（processMultiPass）
 *
 * 不再负责（已迁移到 core/）：
 * - 置信度校准 → Calibrator
 * - 文本后处理 → Calibrator.postProcessText
 * - 后处理管道 → Pipeline
 * - 相似度计算 → Pipeline.textSimilarity
 */

import { ref, shallowRef } from 'vue'
import type { OCRConfig, OCREngine } from '@/types/video'
import { CANVAS_CONTEXT_2D, ERR_OCR_NOT_READY, MIME_IMAGE_PNG } from '@/utils/constants'
import { useImagePreprocessor } from './Preprocessor'
import { getCalibrator, langToScript } from '@/core'

// ─── Canvas context guard ────────────────────────────────────────────
// Throws if canvas 2D context is unavailable (critical — OCR cannot proceed without it)
function requireCanvasContext(ctx: CanvasRenderingContext2D | null, message = 'Failed to get canvas context'): asserts ctx is CanvasRenderingContext2D {
  if (!ctx) throw new Error(message)
}

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

// ─── Tesseract Worker 接口 ───────────────────────────────────────
interface TesseractWord {
  text: string
  confidence: number
  bbox: { x0: number; y0: number; x1: number; y1: number }
}

interface TesseractRecognizeResult {
  data: { words: TesseractWord[] }
}

interface TesseractWorkerInterface {
  terminate(): Promise<unknown>
  setParameters(p: Record<string, string>): Promise<unknown>
  recognize(img: string): Promise<TesseractRecognizeResult>
}

// ─── Tesseract 缓存 ───────────────────────────────────────────────
let cachedTesseractModule: typeof import('tesseract.js') | null = null

interface TesseractLoggerMessage {
  status: string
  progress: number
}

/**
 * Spatial grid deduplication for multi-pass OCR results.
 * Exported for unit testing; call through useOCREngine().mergeOCRResults in production.
 */
const DEDUP_GRID_CELL_SIZE = 20  // pixels per grid cell for spatial deduplication

export function _mergeOCRResults(resultsList: OCRResult[][]): OCRResult[] {
  const flat = resultsList.flat().sort((a, b) => b.confidence - a.confidence)
  const grid = new Map<string, OCRResult>()

  for (const word of flat) {
    const cx = word.boundingBox.x + word.boundingBox.width / 2
    const cy = word.boundingBox.y + word.boundingBox.height / 2
    const cellKey = `${Math.floor(cx / DEDUP_GRID_CELL_SIZE)},${Math.floor(cy / DEDUP_GRID_CELL_SIZE)}`

    let isDuplicate = false
    for (let dx = -1; dx <= 1 && !isDuplicate; dx++) {
      for (let dy = -1; dy <= 1 && !isDuplicate; dy++) {
        const neighborKey = `${Math.floor(cx / DEDUP_GRID_CELL_SIZE) + dx},${Math.floor(cy / DEDUP_GRID_CELL_SIZE) + dy}`
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

export function useOCREngine() {
  const isReady = ref(false)
  const isProcessing = ref(false)
  const progress = ref(0)
  const error = ref<string | null>(null)
  const preprocessor = useImagePreprocessor()
  const calibrator = getCalibrator()

  const worker = shallowRef<TesseractWorkerInterface | null>(null)

  // ─── 安全 ROI 裁剪 ───────────────────────────────────────────
  /**
   * 安全裁剪 ROI 区域。
   * 优化：使用 TypedArray.set() 按行批量复制 RGBA 数据，
   * 替代逐像素的四次索引写入（提升约 3-4× 吞吐量）。
   */
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
    const srcData = imageData.data
    const srcW = imageData.width
    const dstData = roiImageData.data
    const dstRowLen = safeW * 4

    for (let y = 0; y < safeH; y++) {
      const srcStart = ((safeY + y) * srcW + safeX) * 4
      const dstStart = y * dstRowLen
      // Bulk-copy one row's RGBA pixels in a single TypedArray operation
      dstData.set(srcData.subarray(srcStart, srcStart + dstRowLen), dstStart)
      // Set alpha to 255 (fully opaque) for every pixel in this row
      dstData.fill(255, dstStart + 3, dstStart + dstRowLen)
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
        const Tesseract = cachedTesseractModule

        if (worker.value) {
          await worker.value.terminate()
        }

        const workerNum = (options.useGpu ?? false) ? 2 : 1

        const newWorker = await Tesseract.createWorker(langs.join('+'), workerNum, {
          logger: (m: TesseractLoggerMessage) => {
            if (m.status === 'recognizing text') {
              progress.value = Math.round(m.progress * 100)
            }
          },
          gzip: true,
        })

        worker.value = newWorker
        await worker.value.setParameters({
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
      throw new Error(ERR_OCR_NOT_READY)
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
      const ctx = canvas.getContext(CANVAS_CONTEXT_2D)
      requireCanvasContext(ctx)

      ctx.putImageData(processedImage, 0, 0)
      const imageUrl = canvas.toDataURL(MIME_IMAGE_PNG)

      const result = await worker.value.recognize(imageUrl)

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
    const { confidence: finalConfidence } = calibrator.calibrateEnhanced(rawText, rawConfidence, langToScript(lang))

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
      throw new Error(ERR_OCR_NOT_READY)
    }

    isProcessing.value = true
    error.value = null

    try {
      // Run all passes concurrently — the Tesseract worker serializes internally,
      // but Promise.all avoids blocking the event loop between passes.
      const [r1, r2, r3] = await Promise.all([
        processImageData(imageData, config, {
          preprocess: true,
          preprocessMode: 'subtitle',
          scaleFactor: 2.0,
        }),
        processImageData(imageData, config, {
          preprocess: true,
          preprocessMode: 'subtitle',
          scaleFactor: 3.0,
        }),
        processImageData(imageData, config, {
          preprocess: true,
          preprocessMode: 'subtitle',
          scaleFactor: 2.5,
        }),
      ])

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
    return _mergeOCRResults(resultsList)
  }

  // ─── 终止 ─────────────────────────────────────────────────────
  async function terminate() {
    if (worker.value) {
      await worker.value.terminate()
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
