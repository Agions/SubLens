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
import { useVideoPlayer } from './useVideoPlayer'
import { useOCREngine } from './useOCREngine'
import type { OCRConfig } from '@/types'
import type { SubtitleLite } from '@/types/subtitle'
import {
  SubtitlePipeline,
  SceneDetector,
  getCalibrator,
} from '@/core'

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
      throw new Error('No video loaded')
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

      // ── 捕获帧 ───────────────────────────────────────
      const frameData = videoPlayer.captureFrame()
      if (!frameData) continue

      // ── 场景变化检测 ──────────────────────────────────
      if (prevFrameData && !sceneDetector.detect(prevFrameData, frameData)) {
        prevFrameData = frameData
        continue
      }

      // ── 帧间隔跳帧 ────────────────────────────────────
      if (frameIndex % opts.frameInterval !== 0) {
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
          const { confidence: calibrated } = calibrator.calibrateEnhanced(fullText, avgConf, lang)

          if (fullText.trim().length > 0 && calibrated >= opts.confidenceThreshold) {
            result = { text: fullText.trim(), confidence: calibrated }
          }
        } else {
          // 单次 OCR
          const singleResult = await ocrEngine.processROI(frameData, roi, ocrConfig)
          if (singleResult.text.trim().length > 0 && singleResult.confidence >= opts.confidenceThreshold) {
            const lang = opts.languages[0]
            const { confidence: calibrated } = calibrator.calibrateEnhanced(
              singleResult.text, singleResult.confidence, lang
            )
            result = { text: singleResult.text.trim(), confidence: calibrated }
          }
        }

        if (result) {
          const fps = projectStore.videoMeta?.fps ?? 30
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
      subtitleStore.setSubtitles(
        cleaned.map((s, i) => {
          const match = rawSubs.find(r =>
            Math.abs(r.startTime - s.startTime) < 0.1 && r.text === s.text
          )
          return {
            id: match ? `sub-${s.startFrame}-${Date.now()}-${i}` : `sub-${i}`,
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
  }
}
