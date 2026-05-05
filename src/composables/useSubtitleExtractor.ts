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
import { pixelLuma } from '@/utils/math'


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
      // 灰度值 (ITU-R BT.601)
      const gray = pixelLuma(data, idx)
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
    const frameInterval = opts.frameInterval

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
        const resumed = await sleepWithAbort(100)
        if (!resumed) break  // was cancelled via stop
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
        // 统一的校准+验证辅助函数 — 消除多通道/单通道 OCR 分支重复代码
        let result: { text: string; confidence: number } | null = null
        const _calibrateAndValidate = (
          text: string,
          confidence: number,
        ): { text: string; confidence: number } | null => {
          const trimmed = text.trim()
          if (!trimmed) return null
          const lang = opts.languages[0]
          const { confidence: calibrated } = calibrator.calibrateEnhanced(
            trimmed, confidence, langToScript(lang),
          )
          if (calibrated < opts.confidenceThreshold) return null
          return { text: trimmed, confidence: calibrated }
        }

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
          result = _calibrateAndValidate(fullText, avgConf)
        } else {
          // 单次 OCR
          const singleResult = await ocrEngine.processROI(frameData, roi, ocrConfig)
          result = _calibrateAndValidate(singleResult.text, singleResult.confidence)
        }

        if (result) {
          const fps = projectStore.videoMeta.fps
          const timestamp = frameIndex / fps
          const frameDuration = Math.max(frameInterval / fps, 2)

          rawSubs.push({
            startTime: timestamp,
            endTime: timestamp + frameDuration,
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

      // Build index in one pass — O(n), deduplicate + Map construction combined
      // Avoids calling _normKey twice (filter loop + Map loop)
      const _normKey = (r: { startTime: number; text: string }) =>
        `${(Math.round(r.startTime * 1000) / 1000).toFixed(3)}#${r.text}`
      const seen = new Set<string>()
      const deduped: SubtitleLite[] = []
      const rawIndex = new Map<string, SubtitleLite>()
      for (const r of rawSubs) {
        const key = _normKey(r)
        if (seen.has(key)) continue
        seen.add(key)
        deduped.push(r)
        rawIndex.set(key, r)
      }
      subtitleStore.setSubtitles(
        cleaned.map((s, i) => {
          const match = rawIndex.get(_normKey(s))
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

  /** Interruptible sleep — checks stop flag on each tick to allow cancellation. */
  async function sleepWithAbort(ms: number): Promise<boolean> {
    const interval = 100
    for (let elapsed = 0; elapsed < ms; elapsed += interval) {
      if (!isExtracting.value) return false  // cancelled
      await new Promise(resolve => setTimeout(resolve, Math.min(interval, ms - elapsed)))
    }
    return true
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
