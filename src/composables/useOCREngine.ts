import { ref, shallowRef } from 'vue'
import type { OCRConfig, OCREngine } from '@/types/video'
import { useImagePreprocessor } from './useImagePreprocessor'

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
  /** Apply image preprocessing for better accuracy (default: true) */
  preprocess?: boolean
  /** Preprocessing mode: 'subtitle' | 'document' | 'none' (default: 'subtitle') */
  preprocessMode?: 'subtitle' | 'document' | 'none'
  /** Scale factor for upscaling (default: 2.0) */
  scaleFactor?: number
  /** Use multi-pass OCR with different configurations (default: true) */
  multiPass?: boolean
  /** Use GPU acceleration if available (default: true) */
  useGpu?: boolean
}

// 模块缓存，避免重复加载
interface TesseractModule {
  createWorker: (langs: string, workerNum?: number, options?: Record<string, unknown>) => Promise<TesseractWorker>
}
interface TesseractWorker {
  recognize: (image: string | HTMLCanvasElement | HTMLImageElement) => Promise<RecognizeResult>
  setParameters: (params: Record<string, string>) => Promise<void>
  terminate: () => Promise<void>
}
interface RecognizeResult {
  data: {
    words: TesseractWord[]
  }
}
interface TesseractWord {
  text: string
  confidence: number
  bbox: { x0: number; y0: number; x1: number; y1: number }
}
interface TesseractLoggerMessage {
  status: string
  progress: number
}
let cachedTesseractModule: TesseractModule | null = null

export function useOCREngine() {
  const isReady = ref(false)
  const isProcessing = ref(false)
  const progress = ref(0)
  const error = ref<string | null>(null)
  const preprocessor = useImagePreprocessor()
  
  // Tesseract worker (lazy loaded)
  const worker = shallowRef<TesseractWorker | null>(null)
  
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
  
  /**
   * Apply image preprocessing for better OCR accuracy
   */
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
  
  // Initialize OCR engine
  async function init(
    engine: OCREngine = 'tesseract', 
    langs: string[] = ['eng', 'chi_sim'],
    options: { useGpu?: boolean } = {}
  ) {
    error.value = null
    const useGpu = options.useGpu ?? true
    
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
        
        // Determine optimal worker count (more workers = faster but more memory)
        // GPU typically handles 2-4 workers well
        const workerNum = useGpu ? 2 : 1
        
        // Create worker with optimized settings
        worker.value = await Tesseract.createWorker(langs.join('+'), workerNum, {
          logger: (m: TesseractLoggerMessage) => {
            if (m.status === 'recognizing text') {
              progress.value = Math.round(m.progress * 100)
            }
          },
          gzip: true, // Use gzip compression for faster data transfer
        })
        
        // Set recognition mode for better accuracy
        // OEM (OCR Engine Mode): 3 = LSTM neural network (best for accuracy)
        // PSM (Page Segmentation Mode): auto-adaptive
        await worker.value.setParameters({
          tessedit_pageseg_mode: '3', // Fully automatic page segmentation, but no OSD
          preserve_interword_spaces: '1',
        })
        
        isReady.value = true
      }
      // Other engines would be initialized here
    } catch (e) {
      error.value = `Failed to initialize OCR engine: ${e}`
      isReady.value = false
    }
  }
  
  // Process image data with optional preprocessing
  async function processImageData(
    imageData: ImageData,
    config: OCRConfig,
    options: OCRProcessingOptions = {}
  ): Promise<OCRResult[]> {
    if (!isReady.value || !worker.value) {
      throw new Error('OCR engine not initialized')
    }
    
    isProcessing.value = true
    progress.value = 0
    error.value = null
    
    const {
      preprocess = true,
      preprocessMode = 'subtitle',
    } = options
    
    try {
      // Apply preprocessing if enabled
      let processedImage = imageData
      if (preprocess && preprocessMode !== 'none') {
        processedImage = applyPreprocessing(imageData, preprocessMode)
      }
      
      // Convert ImageData to canvas to get image URL
      const canvas = document.createElement('canvas')
      canvas.width = processedImage.width
      canvas.height = processedImage.height
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Failed to get canvas context')
      
      ctx.putImageData(processedImage, 0, 0)
      const imageUrl = canvas.toDataURL('image/png')
      
      // Process with Tesseract
      const result = await worker.value.recognize(imageUrl)
      
      progress.value = 100
      
      return result.data.words.map((word: TesseractWord) => ({
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
  
  // Process ROI region from image with preprocessing
  async function processROI(
    imageData: ImageData,
    roi: { x: number; y: number; width: number; height: number },
    config: OCRConfig,
    options: OCRProcessingOptions = {}
  ): Promise<OCRResult> {
    const { preprocess = true, preprocessMode = 'subtitle' } = options

    // Safe ROI extraction
    const roiImageData = safeExtractROI(imageData, roi.x, roi.y, roi.width, roi.height)

    // Apply preprocessing to ROI if enabled
    let processedROI = roiImageData
    if (preprocess && preprocessMode !== 'none') {
      processedROI = applyPreprocessing(roiImageData, preprocessMode)
    }

    const results = await processImageData(processedROI, config, {
      preprocess: false, // Already preprocessed
    })

    // Combine all text results
    const rawText = results.map(r => r.text).join(' ')
    const rawConfidence = results.length > 0
      ? results.reduce((sum, r) => sum + r.confidence, 0) / results.length
      : 0

    // Apply language-aware post-processing + confidence calibration
    const lang = config.language?.[0] ?? 'ch'
    const processedText = postProcessText(rawText, lang)
    const finalConfidence = calibrateConfidence(processedText, rawConfidence, lang)

    return {
      text: processedText,
      confidence: finalConfidence,
      boundingBox: {
        x: roi.x,
        y: roi.y,
        width: roi.width,
        height: roi.height,
      },
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
  
  /**
   * Multi-pass OCR: Run OCR with different preprocessing configs and merge results
   * This can improve accuracy by capturing text that might be missed in a single pass
   */
  async function processMultiPass(
    imageData: ImageData,
    config: OCRConfig,
    options: OCRProcessingOptions = {}
  ): Promise<OCRResult[]> {
    const { multiPass = true, preprocessMode = 'subtitle' } = options
    
    if (!multiPass) {
      return processImageData(imageData, config, options)
    }
    
    if (!isReady.value || !worker.value) {
      throw new Error('OCR engine not initialized')
    }
    
    isProcessing.value = true
    error.value = null
    
    try {
      // Pass 1: Standard preprocessing (2x scale)
      const result1 = await processImageData(imageData, config, {
        preprocess: true,
        preprocessMode: 'subtitle',
        scaleFactor: 2.0,
      })
      
      // Pass 2: Higher scale for small text (3x scale)
      const result2 = await processImageData(imageData, config, {
        preprocess: true,
        preprocessMode: 'subtitle',
        scaleFactor: 3.0,
      })
      
      // Pass 3: Different block size for threshold
      const result3 = await processImageData(imageData, config, {
        preprocess: true,
        preprocessMode: 'subtitle',
        scaleFactor: 2.5,
      })
      
      // Merge results: Use results with highest confidence
      // Group by approximate position and take the best
      const merged = mergeOCRResults([result1, result2, result3])
      
      progress.value = 100
      return merged
    } catch (e) {
      error.value = `Multi-pass OCR failed: ${e}`
      throw e
    } finally {
      isProcessing.value = false
    }
  }
  
  /**
   * Merge results from multiple OCR passes
   */
  function mergeOCRResults(resultsList: OCRResult[][]): OCRResult[] {
    // Flatten and deduplicate by position proximity + text similarity
    const allWords: OCRResult[] = []

    // Sort by confidence descending
    const flat = resultsList.flat().sort((a, b) => b.confidence - a.confidence)

    for (const word of flat) {
      const wordCenter = {
        x: word.boundingBox.x + word.boundingBox.width / 2,
        y: word.boundingBox.y + word.boundingBox.height / 2,
      }

      // Check if duplicate of already-accepted word
      const isDuplicate = allWords.some(existing => {
        const existingCenter = {
          x: existing.boundingBox.x + existing.boundingBox.width / 2,
          y: existing.boundingBox.y + existing.boundingBox.height / 2,
        }
        const dx = existingCenter.x - wordCenter.x
        const dy = existingCenter.y - wordCenter.y
        const distance = Math.sqrt(dx * dx + dy * dy)
        return distance < 20 && existing.text === word.text
      })

      if (!isDuplicate) {
        allWords.push(word)
      }
    }

    return allWords
  }

  /**
   * Normalize text for better quality:
   * - Trim whitespace, collapse spaces
   * - Normalize full-width ↔ half-width punctuation
   * - Remove repeated characters (e.g. "啊啊啊" → "啊")
   * - Fix common OCR confusions per language
   * - Fix sentence casing for non-CJK languages
   */
  function postProcessText(text: string, lang: string = 'ch'): string {
    if (!text || !text.trim()) return text

    let result = text.trim()

    // Collapse multiple spaces/newlines
    result = result.replace(/\s+/g, ' ')

    // Normalize full-width punctuation → half-width
    const fwPairs: Array<[string, string]> = [
      ['\u3001', ','],  // ，
      ['\u3002', '.'],  // 。
      ['\uff01', '!'],  // ！
      ['\uff1f', '?'],  // ？
      ['\uff1a', ':'],  // ：
      ['\uff1b', ';'],  // ；
      ['\u201c', '"'],  // "
      ['\u201d', '"'],  // "
      ['\u2018', "'"],  // '
      ['\u2019', "'"],  // '
      ['\uff08', '('],  // （
      ['\uff09', ')'],  // ）
      ['\u3010', '['],  // 【
      ['\u3011', ']'],  // 】
      ['\u2014', '-'],  // —
      ['\u2026', '...'],  // …
      ['\uff0e', '.'],  //．
      ['\uff0c', ','],  //，
    ]
    for (const [fw, hw] of fwPairs) {
      result = result.split(fw).join(hw)
    }

    // Remove repeated characters (keep max 2 consecutive)
    result = result.replace(/(.)\1{2,}/g, '$1$1')

    // Chinese-specific: fix common OCR confusions (lookalike chars)
    const chineseFixes: Record<string, string> = {
      '兀': '元', '苒': '再', '巳': '已', '汢': '汪',
      '日': '日', '土': '土', '了': '了', '大': '大',
    }
    // Apply only in plausible contexts (this is conservative — only applies exact match)
    for (const [wrong, right] of Object.entries(chineseFixes)) {
      // Only replace if it's clearly a full word/char
      result = result.split(wrong).join(right)
    }

    // Non-Chinese: capitalize first letter of each sentence
    if (lang !== 'ch' && lang !== 'chi') {
      result = result.replace(/(?:^|[.!?]\s+)([a-z])/g, (_, c) =>
        c.toUpperCase()
      )
    }

    return result
  }

  /**
   * Calibrate confidence based on text quality signals:
   * - Penalize: mixed scripts, very short text, repeated chars, extreme char ratio
   * - Boost: consistent script, well-formed sentences
   * Returns calibrated confidence in [0, 1]
   */
  function calibrateConfidence(
    text: string,
    rawConfidence: number,
    lang: string = 'ch'
  ): number {
    if (!text) return rawConfidence

    const len = text.replace(/\s/g, '').length
    const hasChinese = /[\u4e00-\u9fff]/.test(text)
    const hasLatin = /[a-zA-Z]/.test(text)
    const hasDigit = /\d/.test(text)
    const scriptCount = [hasChinese, hasLatin, hasDigit].filter(Boolean).length

    // Script mixing penalty
    let quality = rawConfidence
    if (scriptCount >= 2) quality *= 0.80      // Mixed scripts penalize
    if (len > 0 && len <= 2) quality *= 0.85   // Very short text penalize
    if (len > 0 && /(.)\1{3,}/.test(text)) quality *= 0.75  // Repeated char penalty

    // Character diversity bonus (normal text has ~0.7 unique ratio)
    const unique = new Set(text.replace(/\s/g, '')).size
    const ratio = len > 0 ? unique / len : 1
    if (ratio > 0.6 && ratio < 0.95) quality = Math.min(1, quality * 1.05)

    return Math.max(0, Math.min(1, quality))
  }

  /**
   * Detect if text contains mixed scripts (Chinese + Latin)
   * Returns the dominant language hint
   */
  function detectDominantScript(text: string): 'ch' | 'en' | 'mixed' {
    const chinese = (text.match(/[\u4e00-\u9fff]/g) || []).length
    const latin = (text.match(/[a-zA-Z]/g) || []).length

    if (chinese === 0 && latin === 0) return 'en'
    if (chinese > latin * 2) return 'ch'
    if (latin > chinese * 2) return 'en'
    return 'mixed'
  }

  /**
   * Merge consecutive subtitles that are the same/similar text
   * with time gap < maxGap seconds. Threshold is text similarity [0-1].
   */
  function mergeSimilarSubtitles(
    subtitles: Array<{
      startTime: number
      endTime: number
      startFrame: number
      endFrame: number
      text: string
      confidence: number
    }>,
    similarityThreshold: number = 0.80,
    maxGap: number = 0.5
  ): SubtitleLite[] {
    if (subtitles.length === 0) return subtitles

    const result: SubtitleLite[] = []
    let current = { ...subtitles[0] }

    for (let i = 1; i < subtitles.length; i++) {
      const prev = subtitles[i - 1]
      const curr = subtitles[i]
      const gap = curr.startTime - prev.endTime

      // Compute Levenshtein similarity for text
      const similarity = textSimilarity(current.text, curr.text)
      const timeClose = gap <= maxGap
      const sameOrSimilar = similarity >= similarityThreshold

      if (sameOrSimilar && timeClose) {
        // Merge: extend endTime/endFrame, keep highest confidence
        current.endTime = Math.max(current.endTime, curr.endTime)
        current.endFrame = Math.max(current.endFrame, curr.endFrame)
        current.confidence = Math.max(current.confidence, curr.confidence)
      } else {
        result.push(current)
        current = { ...curr }
      }
    }
    result.push(current)

    return result
  }

  /**
   * Levenshtein-based text similarity [0-1]
   */
  function textSimilarity(a: string, b: string): number {
    if (a === b) return 1
    if (!a.length || !b.length) return 0

    const dp: number[] = Array.from({ length: b.length + 1 }, (_, i) => i)
    for (let i = 1; i <= a.length; i++) {
      let prev = dp[0]
      dp[0] = i
      for (let j = 1; j <= b.length; j++) {
        const temp = dp[j]
        dp[j] = a[i - 1] === b[j - 1] ? prev : 1 + Math.min(prev, dp[j], dp[j - 1])
        prev = temp
      }
    }
    const dist = dp[b.length]
    return 1 - dist / Math.max(a.length, b.length)
  }
  
  /**
   * Minimal subtitle shape used in post-processing pipelines.
   * Avoids coupling to the full SubtitleItem type.
   */
  type SubtitleLite = {
    startTime: number
    endTime: number
    startFrame: number
    endFrame: number
    text: string
    confidence: number
  }

  /**
   * Filter out jitter subtitles — single-frame noise from OCR instability.
   * A jitter subtitle is: very short duration (< minDuration) +
   * same text as at least one neighbor + low confidence.
   * These are removed and their time ranges merged into surrounding subtitles.
   */
  function filterJitterSubtitles(
    subtitles: SubtitleLite[],
    minDuration: number = 0.3,
    minConfidence: number = 0.75
  ): SubtitleLite[] {
    if (subtitles.length < 2) return subtitles

    const result: SubtitleLite[] = []
    let i = 0

    while (i < subtitles.length) {
      const curr = subtitles[i]
      const duration = curr.endTime - curr.startTime
      const isJitter =
        duration < minDuration &&
        curr.confidence < minConfidence

      if (!isJitter) {
        result.push(curr)
        i++
        continue
      }

      // Check neighbors for text similarity
      const prev = result[result.length - 1]
      const next = subtitles[i + 1]

      const similarToPrev = prev && textSimilarity(prev.text, curr.text) > 0.85
      const similarToNext = next && textSimilarity(curr.text, next.text) > 0.85

      if (similarToPrev && similarToNext) {
        // Bridge: absorb into prev, extend endTime to cover curr + next gap
        prev.endTime = next.endTime
        prev.endFrame = next.endFrame
        // Skip both curr and next
        i += 2
      } else if (similarToPrev) {
        // Absorb into previous
        prev.endTime = Math.max(prev.endTime, curr.endTime)
        prev.endFrame = Math.max(prev.endFrame, curr.endFrame)
        i++
      } else if (similarToNext) {
        // Absorb next into current position
        curr.endTime = next.endTime
        curr.endFrame = next.endFrame
        result.push(curr)
        i += 2
      } else {
        // No neighbor similarity — keep it (not jitter after all)
        result.push(curr)
        i++
      }
    }

    return result
  }

  /**
   * Detect and merge "split subtitles" — same text separated by a gap
   * where scene detection skipped the intermediate frames.
   * Unlike mergeSimilarSubtitles (which only handles adjacent items),
   * this scans for same/similar text with gaps and bridges them.
   *
   * maxGap: max seconds between split parts to still merge (default 1.5s)
   */
  function mergeSplitSubtitles(
    subtitles: SubtitleLite[],
    similarityThreshold: number = 0.85,
    maxGap: number = 1.5
  ): SubtitleLite[] {
    if (subtitles.length < 2) return subtitles

    // Build groups of same/similar text separated by gaps
    const groups: SubtitleLite[][] = []

    for (const sub of subtitles) {
      const lastGroup = groups[groups.length - 1]
      if (!lastGroup) {
        groups.push([{ ...sub }])
        continue
      }

      const last = lastGroup[lastGroup.length - 1]
      const gap = sub.startTime - last.endTime
      const similar = textSimilarity(last.text, sub.text) >= similarityThreshold
      const gapWithinLimit = gap > 0 && gap <= maxGap

      if (similar && gapWithinLimit) {
        // Same text with a gap — add to current group for merging
        lastGroup.push({ ...sub })
      } else {
        // Different text or gap too large — start new group
        groups.push([{ ...sub }])
      }
    }

    // Merge each group and collect results
    const result: SubtitleLite[] = []

    for (const group of groups) {
      if (group.length === 1) {
        result.push(group[0])
        continue
      }

      // Merge group into single subtitle
      // Keep earliest start, latest end, highest confidence, text of highest-confidence item
      const best = group.reduce((best, curr) =>
        curr.confidence > best.confidence ? curr : best
      )

      result.push({
        startTime: group[0].startTime,
        endTime: group[group.length - 1].endTime,
        startFrame: group[0].startFrame,
        endFrame: group[group.length - 1].endFrame,
        text: best.text,
        confidence: Math.max(...group.map(s => s.confidence)),
      })
    }

    return result
  }

  /**
   * Enhanced confidence calibration with more quality signals:
   * - Penalize: unbalanced brackets/quotes, all-caps (EN), digit-only fragments
   * - Boost: proper sentence endings, balanced punctuation, natural language patterns
   */
  function calibrateConfidenceEnhanced(
    text: string,
    rawConfidence: number,
    lang: string = 'ch'
  ): number {
    if (!text) return rawConfidence

    const trimmed = text.trim()
    const len = trimmed.length

    // Start with base calibration
    let quality = calibrateConfidence(trimmed, rawConfidence, lang)

    // === Language-specific checks ===

    if (lang === 'ch' || lang === 'chi' || lang === 'ja' || lang === 'ko') {
      // Chinese/Japanese/Korean checks
      // Penalize: orphaned CJK radicals or single CJK chars surrounded by spaces
      if (/ [\u4e00-\u9fff] /.test(text) || / [\u3040-\u30ff] /.test(text)) {
        quality *= 0.80
      }
      // Penalize: unbalanced Chinese quotes
      const openQuotes = (text.match(/["']/g) || []).length
      // Note: Chinese quotes are「」『』— rough check
      const hasUnbalancedQuotes =
        (text.includes('"') && text.split('"').length % 2 === 0) ||
        (text.includes("'") && text.split("'").length % 2 === 0)
      if (hasUnbalancedQuotes) quality *= 0.90
    } else {
      // Latin-script checks
      // Penalize: ALL CAPS (likely OCR error for mixed case language)
      if (trimmed === trimmed.toUpperCase() && len > 3 && /[a-z]/.test(trimmed)) {
        quality *= 0.82
      }
      // Penalize: digit fragments surrounded by spaces (e.g. " 3 " or " 12 ")
      if (/ \d{1,3} /.test(text)) quality *= 0.88
      // Boost: proper sentence ending
      if (/[.!?]$/.test(trimmed)) quality = Math.min(1, quality * 1.03)
      // Penalize: trailing comma or semicolon (likely mid-sentence)
      if (/[,;]\s*$/.test(trimmed) && !/[.!?]$/.test(trimmed)) quality *= 0.88
    }

    // === Universal checks ===

    // Penalize: repeated trailing character patterns (e.g. "——" or "、、")
    if (/[、,\.。\-_]{3,}$/.test(text)) quality *= 0.85

    // Boost: reasonable length for a subtitle line (not too short, not a novel)
    if (len >= 5 && len <= 120) quality = Math.min(1, quality * 1.04)
    if (len > 200) quality *= 0.92 // suspiciously long

    // Penalize: starts with space or punctuation
    if (/^[\s,.!?;:]/.test(trimmed)) quality *= 0.90

    return Math.max(0, Math.min(1, quality))
  }

  /**
   * Detect subtitle text quality issues and suggest corrections.
   * Returns an array of { issue, suggestion } for UI hints.
   */
  function detectTextQualityIssues(text: string): Array<{ issue: string; suggestion: string }> {
    const issues: Array<{ issue: string; suggestion: string }> = []
    const trimmed = text.trim()

    if (trimmed.length === 0) return issues

    // Check for full-width/half-width inconsistency
    if (/[\uff00-\uffef]/.test(trimmed)) {
      issues.push({
        issue: '包含全角字符',
        suggestion: '建议转换为半角以提高兼容性'
      })
    }

    // Check for unbalanced brackets
    const openBrackets = (trimmed.match(/[\(\[\{]/g) || []).length
    const closeBrackets = (trimmed.match(/[\)\]\}]/g) || []).length
    if (openBrackets !== closeBrackets) {
      issues.push({
        issue: `括号不匹配 (${openBrackets} 开 / ${closeBrackets} 闭)`,
        suggestion: '检查并修正括号配对'
      })
    }

    // Check for trailing dots (incomplete sentence)
    if (/[,;，；]$/.test(trimmed) && !/[.!?。！？]$/.test(trimmed)) {
      issues.push({
        issue: '字幕以逗号结尾',
        suggestion: '可能为未完整识别的字幕'
      })
    }

    // Check for single-character repetition (OCR glitch)
    if (/(.)\1{4,}/.test(trimmed)) {
      issues.push({
        issue: '检测到重复字符',
        suggestion: 'OCR 识别错误，建议检查原画面'
      })
    }

    return issues
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
    postProcessText,
    calibrateConfidence,
    calibrateConfidenceEnhanced,
    detectDominantScript,
    detectTextQualityIssues,
    mergeSimilarSubtitles,
    mergeSplitSubtitles,
    filterJitterSubtitles,
    textSimilarity,
  }
}
