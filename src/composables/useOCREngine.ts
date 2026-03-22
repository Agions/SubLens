import { ref, shallowRef } from 'vue'
import type { OCRConfig, OCREngine } from '@/types/video'

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

// 模块缓存，避免重复加载
let cachedTesseractModule: any = null

export function useOCREngine() {
  const isReady = ref(false)
  const isProcessing = ref(false)
  const progress = ref(0)
  const error = ref<string | null>(null)
  
  // Tesseract worker (lazy loaded)
  const worker = shallowRef<any>(null)
  
  /**
   * 安全地提取ROI，处理边界情况
   */
  function safeExtractROI(
    imageData: ImageData,
    roiX: number,
    roiY: number,
    roiWidth: number,
    roiHeight: number
  ): ImageData {
    // 确保ROI在图像范围内
    const safeX = Math.max(0, Math.min(Math.floor(roiX), imageData.width - 1))
    const safeY = Math.max(0, Math.min(Math.floor(roiY), imageData.height - 1))
    const safeW = Math.max(1, Math.min(Math.floor(roiWidth), imageData.width - safeX))
    const safeH = Math.max(1, Math.min(Math.floor(roiHeight), imageData.height - safeY))
    
    const roiImageData = new ImageData(safeW, safeH)
    
    for (let y = 0; y < safeH; y++) {
      for (let x = 0; x < safeW; x++) {
        const srcIdx = ((safeY + y) * imageData.width + (safeX + x)) * 4
        const dstIdx = (y * safeW + x) * 4
        
        // 严格边界检查
        if (srcIdx + 3 < imageData.data.length && dstIdx + 3 < roiImageData.data.length) {
          roiImageData.data[dstIdx] = imageData.data[srcIdx]
          roiImageData.data[dstIdx + 1] = imageData.data[srcIdx + 1]
          roiImageData.data[dstIdx + 2] = imageData.data[srcIdx + 2]
          roiImageData.data[dstIdx + 3] = 255 // Alpha 通道
        }
      }
    }
    
    return roiImageData
  }
  
  // Initialize OCR engine
  async function init(engine: OCREngine = 'tesseract', langs: string[] = ['eng', 'chi_sim']) {
    error.value = null
    
    try {
      if (engine === 'tesseract') {
        // 缓存 Tesseract 模块避免重复加载
        if (!cachedTesseractModule) {
          cachedTesseractModule = await import('tesseract.js')
        }
        const Tesseract = cachedTesseractModule
        
        // 如果已有 worker，先终止
        if (worker.value) {
          await worker.value.terminate()
        }
        
        // Create worker
        worker.value = await Tesseract.createWorker(langs.join('+'), 1, {
          logger: (m: any) => {
            if (m.status === 'recognizing text') {
              progress.value = Math.round(m.progress * 100)
            }
          }
        })
        
        isReady.value = true
      }
      // Other engines would be initialized here
    } catch (e) {
      error.value = `Failed to initialize OCR engine: ${e}`
      isReady.value = false
    }
  }
  
  // Process image data
  async function processImageData(
    imageData: ImageData,
    config: OCRConfig
  ): Promise<OCRResult[]> {
    if (!isReady.value || !worker.value) {
      throw new Error('OCR engine not initialized')
    }
    
    isProcessing.value = true
    progress.value = 0
    error.value = null
    
    try {
      // Convert ImageData to canvas to get image URL
      const canvas = document.createElement('canvas')
      canvas.width = imageData.width
      canvas.height = imageData.height
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Failed to get canvas context')
      
      ctx.putImageData(imageData, 0, 0)
      const imageUrl = canvas.toDataURL('image/png')
      
      // Process with Tesseract
      const result = await worker.value.recognize(imageUrl)
      
      progress.value = 100
      
      return result.data.words.map((word: any) => ({
        text: word.text,
        confidence: word.confidence / 100,
        boundingBox: {
          x: word.bbox.x0,
          y: word.bbox.y0,
          width: word.bbox.x1 - word.bbox.x0,
          height: word.bbox.y1 - word.bbox.y0
        }
      }))
    } catch (e) {
      error.value = `OCR processing failed: ${e}`
      throw e
    } finally {
      isProcessing.value = false
    }
  }
  
  // Process ROI region from image
  async function processROI(
    imageData: ImageData,
    roi: { x: number; y: number; width: number; height: number },
    config: OCRConfig
  ): Promise<OCRResult> {
    // 安全地提取ROI，处理边界情况
    const roiImageData = safeExtractROI(
      imageData,
      roi.x,
      roi.y,
      roi.width,
      roi.height
    )
    
    const results = await processImageData(roiImageData, config)
    
    // Combine all text results
    const fullText = results.map(r => r.text).join(' ')
    const avgConfidence = results.length > 0 
      ? results.reduce((sum, r) => sum + r.confidence, 0) / results.length 
      : 0
    
    return {
      text: fullText,
      confidence: avgConfidence,
      boundingBox: {
        x: roi.x,
        y: roi.y,
        width: roi.width,
        height: roi.height
      }
    }
  }
  
  // Terminate worker
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
    terminate
  }
}
