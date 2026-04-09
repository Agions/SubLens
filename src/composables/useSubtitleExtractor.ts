import { ref } from 'vue'
import { useProjectStore } from '@/stores/project'
import { useSubtitleStore } from '@/stores/subtitle'
import { useVideoPlayer } from './useVideoPlayer'
import { useOCREngine } from './useOCREngine'
import type { OCRConfig } from '@/types'

export function useSubtitleExtractor() {
  const projectStore = useProjectStore()
  const subtitleStore = useSubtitleStore()
  const videoPlayer = useVideoPlayer()
  const ocrEngine = useOCREngine()

  const isExtracting = ref(false)
  const isPaused = ref(false)
  const currentFrame = ref(0)
  const totalFrames = ref(0)
  const extractedCount = ref(0)

  // Scene detection: quantized histogram comparison
  // Faster than per-pixel diff - quantizes to 16 bins per channel
  function detectSceneChange(prevFrame: ImageData, currFrame: ImageData, threshold: number = 0.3): boolean {
    const binCount = 16
    const binSize = 256 / binCount  // 16 levels per channel = 4096 total bins

    // Build histograms (skip alpha channel)
    const prevHist = new Array(binCount * 3).fill(0)
    const currHist = new Array(binCount * 3).fill(0)

    // Sample ~500 pixels across the full frame for reliable chi-square statistic
    const pixelCount = Math.floor(Math.min(prevFrame.data.length, currFrame.data.length) / 4)
    const sampleStep = Math.max(1, Math.floor(pixelCount / 500))

    for (let p = 0; p < pixelCount; p += sampleStep) {
      const i = p * 4
      // R channel bin
      prevHist[Math.floor(prevFrame.data[i] / binSize)]++
      currHist[Math.floor(currFrame.data[i] / binSize)]++
      // G channel bin (use data[i+1], not data[i])
      prevHist[binCount + Math.floor(prevFrame.data[i + 1] / binSize)]++
      currHist[binCount + Math.floor(currFrame.data[i + 1] / binSize)]++
      // B channel bin (use data[i+2], not data[i])
      prevHist[binCount * 2 + Math.floor(prevFrame.data[i + 2] / binSize)]++
      currHist[binCount * 2 + Math.floor(currFrame.data[i + 2] / binSize)]++
    }

    // chi-square comparison of histograms
    let chiSquare = 0
    for (let b = 0; b < prevHist.length; b++) {
      const e = prevHist[b] || 0.1
      const o = currHist[b]
      chiSquare += ((o - e) * (o - e)) / e
    }

    // chiSquare > threshold means significant scene change
    return chiSquare > threshold * binCount * 3
  }

  // Main extraction loop — reads all options from projectStore.extractOptions
  async function startExtraction() {
    if (!projectStore.videoMeta) {
      throw new Error('No video loaded')
    }

    const opts = projectStore.extractOptions
    const roi = projectStore.selectedROI

    isExtracting.value = true
    isPaused.value = false
    extractedCount.value = 0
    totalFrames.value = projectStore.videoMeta.totalFrames

    // Build OCR config from store options
    const ocrConfig: OCRConfig = {
      engine: opts.ocrEngine,
      language: opts.languages,
      confidenceThreshold: opts.confidenceThreshold,
    }

    // Initialize OCR engine
    await ocrEngine.init(ocrConfig.engine, ocrConfig.language)

    subtitleStore.startExtraction()

    let prevFrameData: ImageData | null = null

    for (let frameIndex = 0; frameIndex < totalFrames.value; frameIndex++) {
      // Check if paused or stopped
      if (!isExtracting.value || isPaused.value) {
        await waitForResume()
        if (!isExtracting.value) break
      }

      // Capture frame
      const frameData = videoPlayer.captureFrame()
      if (!frameData) continue

      // Scene detection
      if (prevFrameData && !detectSceneChange(prevFrameData, frameData, opts.sceneThreshold)) {
        prevFrameData = frameData
        continue
      }

      // Frame interval skip
      if (frameIndex % opts.frameInterval !== 0) {
        prevFrameData = frameData
        continue
      }

      // Process OCR - optionally multi-pass for higher accuracy
      try {
        let result: { text: string; confidence: number } | null = null

        if (opts.multiPass && opts.postProcess) {
          // Multi-pass: run multiple times and merge
          const passes = await ocrEngine.processMultiPass(frameData, ocrConfig, {
            multiPass: true,
            preprocessMode: 'subtitle',
          })
          // Merge word-level results from multi-pass
          const mergedWords = passes ?? []
          const fullText = mergedWords.map(r => r.text).join(' ')
          const avgConf = mergedWords.length > 0
            ? mergedWords.reduce((s, r) => s + r.confidence, 0) / mergedWords.length
            : 0

          // Apply post-processing
          const processed = ocrEngine.postProcessText(fullText, opts.languages[0])
          const calibrated = ocrEngine.calibrateConfidenceEnhanced(processed, avgConf, opts.languages[0])

          if (processed.trim().length > 0 && calibrated >= opts.confidenceThreshold) {
            result = { text: processed, confidence: calibrated }
          }
        } else {
          // Single-pass OCR
          const singleResult = await ocrEngine.processROI(frameData, roi, ocrConfig)
          if (singleResult.text.trim().length > 0 && singleResult.confidence >= opts.confidenceThreshold) {
            // Apply enhanced post-processing to single-pass results too
            const processed = ocrEngine.postProcessText(singleResult.text, opts.languages[0])
            const calibrated = ocrEngine.calibrateConfidenceEnhanced(
              processed, singleResult.confidence, opts.languages[0]
            )
            result = { text: processed, confidence: calibrated }
          }
        }

        if (result) {
          const fps = projectStore.videoMeta?.fps ?? 30
          const timestamp = frameIndex / fps
          subtitleStore.addSubtitle({
            id: `sub-${frameIndex}-${Date.now()}`,
            index: extractedCount.value + 1,
            startTime: timestamp,
            endTime: 0,
            startFrame: frameIndex,
            endFrame: frameIndex,
            text: result.text,
            confidence: result.confidence,
            language: opts.languages[0],
            roi,
            thumbnailUrls: [],
            edited: false,
          })
          extractedCount.value++
        }
      } catch (e) {
        console.error(`[Extractor] Frame ${frameIndex} OCR failed:`, e)
      }

      // Update progress
      subtitleStore.updateExtractionProgress(frameIndex, totalFrames.value)
      currentFrame.value = frameIndex

      prevFrameData = frameData
    }

    // Enhanced post-processing pipeline────────────────────────────────
    // Stage 1: Filter jitter subtitles (very short, low-conf, same as neighbors)
    const rawSubs = subtitleStore.subtitles
    if (opts.mergeSubtitles && rawSubs.length > 1) {
      let processed = rawSubs.map(s => ({
        startTime: s.startTime,
        endTime: s.endTime,
        startFrame: s.startFrame,
        endFrame: s.endFrame,
        text: s.text,
        confidence: s.confidence,
      }))

      // Stage 1: Filter jitter (OCR noise from unstable frames)
      processed = ocrEngine.filterJitterSubtitles(processed, 0.3, opts.confidenceThreshold)

      // Stage 2: Merge split subtitles (same text separated by scene-change gap)
      processed = ocrEngine.mergeSplitSubtitles(processed, opts.mergeThreshold, 1.5)

      // Stage 3: Merge similar consecutive subtitles (Levenshtein-based)
      processed = ocrEngine.mergeSimilarSubtitles(processed, opts.mergeThreshold, 0.5)

      // Reconstruct subtitle items - endTime computed from next subtitle for accurate duration
      subtitleStore.setSubtitles(
        processed.map((s, i) => {
          const match = rawSubs.find(r =>
            Math.abs(r.startTime - s.startTime) < 0.1 &&
            r.text === s.text
          )
          if (!match) return null
          const next = processed[i + 1]
          return {
            ...match,
            ...s,
            index: i + 1,
            endTime: next ? next.startTime : (s.startTime + 2),
          }
        }).filter(Boolean) as typeof rawSubs
      )
    }

    subtitleStore.finishExtraction()
    isExtracting.value = false
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

  function waitForResume(): Promise<void> {
    return new Promise(resolve => {
      const check = () => {
        if (!isPaused.value || !isExtracting.value) {
          resolve()
        } else {
          setTimeout(check, 100)
        }
      }
      check()
    })
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
    stopExtraction
  }
}
