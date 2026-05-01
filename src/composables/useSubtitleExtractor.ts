/**
 * useSubtitleExtractor — 字幕提取 composable
 * ===========================================
 * 职责：
 * - 管理提取状态（isExtracting, isPaused 等）
 * - 协调 VideoPlayer、OCREngine、SubtitlePipeline
 * - 与 SubtitleStore 交互（更新进度、添加字幕）
 *
 * 不再负责：
 * - 场景检测（→ SceneDetector）
 * - 后处理管道（→ SubtitlePipeline）
 * - 置信度校准（→ ConfidenceCalibrator）
 */

import { ref } from 'vue'
import { useProjectStore } from '@/stores/project'
import { useSubtitleStore } from '@/stores/subtitle'
import { ERR_NO_VIDEO } from '@/utils/constants'
import { useVideoPlayer } from './useVideoPlayer'
import { useOCREngine } from './useOCREngine'
import type { OCRConfig } from '@/types'
import type { SubtitleLite } from '@/types/subtitle'
import {
  SubtitlePipeline,
  SceneDetector,
  getCalibrator,
  langToScript,
} from '@/core'


/**
 * Computes ROI region variance to detect likely empty (solid-color) regions.
 * Exported for unit testing.
 */
export function _isRoiRegionLikelyEmpty(
  frameData: { data: Uint8ClampedArray; width: number; height: number },
  roi: { x: number; y: number; width: number; height: number },
  threshold = 100,
): boolean {
  const { data, width, height } = frameData

  // Convert percentage ROI to pixel coordinates with proper clamping
  let x0 = Math.floor((roi.x / 100) * width)
  let y0 = Math.floor((roi.y / 100) * height)
  let rw = Math.floor((roi.width / 100) * width)
  let rh = Math.floor((roi.height / 100) * height)

  // Clamp ROI coordinates to valid image bounds [0, width/height]
  // to prevent out-of-bounds access when ROI percentages are invalid
  x0 = Math.max(0, Math.min(x0, width))
  y0 = Math.max(0, Math.min(y0, height))
  rw = Math.max(0, Math.min(rw, width - x0))
  rh = Math.max(0, Math.min(rh, height - y0))

  // Early exit if ROI is completely out of bounds
  if (rw <= 0 || rh <= 0) return false

  let sum = 0
  let sumSq = 0
  let count = 0

  // Use clamped end coordinates to prevent overflow
  const xEnd = Math.min(x0 + rw, width)
  const yEnd = Math.min(y0 + rh, height)

  for (let y = y0; y < yEnd; y += 2) {
    for (let x = x0; x < xEnd; x += 2) {
      const idx = (y * width + x) * 4
      // 灰度值 (Luminance formula)
      const gray = (data[idx] * 299 + data[idx + 1] * 587 + data[idx + 2] * 114) / 1000
      sum += gray
      sumSq += gray * gray
      count++
    }
  }

  if (count === 0) return false

  const mean = sum / count
  const variance = (sumSq / count) - mean * mean

  // Variance < threshold → likely empty (solid background)
  return variance < threshold
}

export function useSubtitleExtractor() {
  const projectStore = useProjectStore()
  const subtitleStore = useSubtitleStore()
  const videoPlayer = useVideoPlayer()
  const ocrEngine = useOCREngine()
  const calibrator = getCalibrator()

  // ─── 状态 ───────────────────────────────────────────────────
  const isExtracting = ref(false)
  const isPaused = ref(false)
  const currentFrame = ref(0)
  const totalFrames = ref(0)
  const extractedCount = ref(0)

  // ─── 管道实例（延迟创建）──────────────────────────────────
  let pipeline: SubtitlePipeline | null = null
  let sceneDetector: SceneDetector | null = null

  // ─── 提取主循环 ───────────────────────────────────────────
  async function startExtraction() {
    if (!projectStore.videoMeta) {
      throw new Error(ERR_NO_VIDEO)
    }

    const opts = projectStore.extractOptions
    const roi = projectStore.selectedROI

    // 初始化管道
    pipeline = new SubtitlePipeline({
      jitterMinDuration: 0.3,
      jitterMaxConfidence: opts.confidenceThreshold,
      splitMaxGap: 1.5,
      splitSimilarityThreshold: opts.mergeThreshold,
      similarMaxGap: 0.5,
      similarSimilarityThreshold: opts.mergeThreshold,
    })

    // 初始化场景检测器
    sceneDetector = new SceneDetector({
      threshold: opts.sceneThreshold,
    })

    isExtracting.value = true
    isPaused.value = false
    extractedCount.value = 0
    totalFrames.value = projectStore.videoMeta.totalFrames

    // 构建 OCR 配置
    const ocrConfig: OCRConfig = {
      engine: opts.ocrEngine,
      language: opts.languages,
      confidenceThreshold: opts.confidenceThreshold,
    }

    // 初始化 OCR 引擎
    await ocrEngine.init(ocrConfig.engine, ocrConfig.language)

    subtitleStore.startExtraction()

    // 原始字幕收集（未经后处理）
    const rawSubs: SubtitleLite[] = []
    let prevFrameData: ImageData | null = null

    for (let frameIndex = 0; frameIndex < totalFrames.value; frameIndex++) {
      // ── 暂停/停止检查 ──────────────────────────────────
      if (!isExtracting.value) break
      while (isPaused.value && isExtracting.value) {
        await sleep(100)
      }
      if (!isExtracting.value) break

      // ── 帧间隔跳帧（优先检查，避免无效帧捕获）───────────
      if (frameIndex % opts.frameInterval !== 0) {
        continue
      }

      // ── 捕获帧 ───────────────────────────────────────
      const frameData = videoPlayer.captureFrame()
      if (!frameData) continue

      // ── ROI 预检测：跳过全黑/低方差帧（无字幕概率高）───
      let skipFrame = false
      try {
        if (_isRoiRegionLikelyEmpty(frameData, roi)) {
          prevFrameData = frameData
          skipFrame = true
        }
      } catch (e) {
        console.warn(`[Extractor] ROI check failed for frame ${frameIndex}, skipping:`, e)
        skipFrame = true
      }
      if (skipFrame) continue

      // ── 场景变化检测 ────────────────────────────────────
      try {
        if (prevFrameData && !sceneDetector.detect(prevFrameData, frameData)) {
          prevFrameData = frameData
          continue
        }
      } catch (e) {
        console.warn(`[Extractor] Scene detection failed for frame ${frameIndex}, skipping:`, e)
        prevFrameData = frameData
        continue
      }

      // ── OCR 识别 ─────────────────────────────────────
      try {
        let result: { text: string; confidence: number } | null = null

        if (opts.multiPass && opts.postProcess) {
          // 多通道 OCR
          const passes = await ocrEngine.processMultiPass(frameData, ocrConfig, {
            multiPass: true,
            preprocessMode: 'subtitle',
          })

          const mergedWords = passes ?? []
          const fullText = mergedWords.map(r => r.text).join(' ')
          const avgConf = mergedWords.length > 0
            ? mergedWords.reduce((s, r) => s + r.confidence, 0) / mergedWords.length
            : 0

          // 校准置信度
          const lang = opts.languages[0]
          const { confidence: calibrated } = calibrator.calibrateEnhanced(fullText, avgConf, langToScript(lang))

          if (fullText.trim().length > 0 && calibrated >= opts.confidenceThreshold) {
            result = { text: fullText.trim(), confidence: calibrated }
          }
        } else {
          // 单次 OCR
          const singleResult = await ocrEngine.processROI(frameData, roi, ocrConfig)
          if (singleResult.text.trim().length > 0 && singleResult.confidence >= opts.confidenceThreshold) {
            const lang = opts.languages[0]
            const { confidence: calibrated } = calibrator.calibrateEnhanced(
              singleResult.text, singleResult.confidence, langToScript(lang)
            )
            result = { text: singleResult.text.trim(), confidence: calibrated }
          }
        }

        if (result) {
          const fps = projectStore.videoMeta.fps
          const timestamp = frameIndex / fps

          rawSubs.push({
            startTime: timestamp,
            endTime: timestamp + 2,
            startFrame: frameIndex,
            endFrame: frameIndex,
            text: result.text,
            confidence: result.confidence,
          })
          extractedCount.value++
        }
      } catch (e) {
        console.error(`[Extractor] Frame ${frameIndex} OCR failed:`, e)
      }

      // ── 进度更新 ─────────────────────────────────────
      subtitleStore.updateExtractionProgress(frameIndex, totalFrames.value)
      currentFrame.value = frameIndex
      prevFrameData = frameData
    }

    // ── 后处理管道 ─────────────────────────────────────────
    if (opts.mergeSubtitles && rawSubs.length > 0) {
      const cleaned = pipeline.process(rawSubs)

      // 转换回 SubtitleItem（需要 id, index 等完整字段）
      // Build index once — O(n), then each map lookup is O(1) instead of O(n)
      // Deduplicate rawSubs to avoid key collisions in the index
      const seen = new Set<string>()
      const deduped = rawSubs.filter(r => {
        const key = `${r.startTime}#${r.text}`
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
      const rawIndex = new Map(deduped.map(r => [`${r.startTime}#${r.text}`, r]))
      subtitleStore.setSubtitles(
        cleaned.map((s, i) => {
          const match = rawIndex.get(`${s.startTime}#${s.text}`)
          // Use crypto.randomUUID() to avoid ID collisions in batch processing
          // Fallback format: sub-{startFrame}-{startTimeMs}-{cleanIndex}
          const id = match
            ? `sub-${s.startFrame}-${Math.round(s.startTime * 1000)}-${i}`
            : `sub-${i}`
          return {
            id,
            index: i + 1,
            startTime: s.startTime,
            endTime: s.endTime,
            startFrame: s.startFrame,
            endFrame: s.endFrame,
            text: s.text,
            confidence: s.confidence,
            language: opts.languages[0],
            roi,
            thumbnailUrls: [],
            edited: false,
          }
        })
      )
    } else {
      // 无需后处理，直接设置
      subtitleStore.setSubtitles(
        rawSubs.map((s, i) => ({
          id: `sub-${s.startFrame}-${Date.now()}-${i}`,
          index: i + 1,
          startTime: s.startTime,
          endTime: s.endTime,
          startFrame: s.startFrame,
          endFrame: s.endFrame,
          text: s.text,
          confidence: s.confidence,
          language: opts.languages[0],
          roi,
          thumbnailUrls: [],
          edited: false,
        }))
      )
    }

    subtitleStore.finishExtraction()
    isExtracting.value = false

    // 清理
    pipeline.clearCache()
    sceneDetector.reset()
  }

  function pauseExtraction() {
    isPaused.value = true
  }

  function resumeExtraction() {
    isPaused.value = false
  }

  function stopExtraction() {
    isExtracting.value = false
    isPaused.value = false
    subtitleStore.finishExtraction()
  }

  function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * ROI 预检测：计算 ROI 区域的像素方差和亮度，跳过无字幕的高概率帧。
   * 原理：字幕区域通常有中高频文字笔画（高方差），
   *       纯色背景/Logo/黑边方差极低。
   * 
   * 注意：此函数导出用于单元测试，内部直接使用导出版本。
   */
  function isRoiRegionLikelyEmpty(frameData: ImageData, roi: { x: number; y: number; width: number; height: number }): boolean {
    return _isRoiRegionLikelyEmpty(frameData, roi)
  }

  return {
    isExtracting,
    isPaused,
    currentFrame,
    totalFrames,
    extractedCount,
    startExtraction,
    pauseExtraction,
    resumeExtraction,
    stopExtraction,
    isRoiRegionLikelyEmpty,
  }
}
