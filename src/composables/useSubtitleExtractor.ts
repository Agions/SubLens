import { ref } from 'vue'
import { useProjectStore } from '@/stores/project'
import { useSubtitleStore } from '@/stores/subtitle'
import { useVideoPlayer } from './useVideoPlayer'
import { useOCREngine } from './useOCREngine'
import type { ROI, OCRConfig, SubtitleItem } from '@/types'

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
  // Faster than per-pixel diff — quantizes to 16 bins per channel
  function detectSceneChange(prevFrame: ImageData, currFrame: ImageData, threshold: number = 0.3): boolean {
    const binCount = 16
    const binSize = 256 / binCount  // 16 levels per channel = 4096 total bins

    // Build histograms (skip alpha channel)
    const prevHist = new Array(binCount * 3).fill(0)
    const currHist = new Array(binCount * 3).fill(0)
    const sampleCount = Math.min(prevFrame.data.length, currFrame.data.length, 2000)

    for (let i = 0; i < sampleCount; i += 4) {
      // R channel
      prevHist[Math.floor(prevFrame.data[i] / binSize)]++
      currHist[Math.floor(currFrame.data[i] / binSize)]++
      // G channel
      prevHist[binCount + Math.floor(prevFrame.data[i + 1] / binSize)]++
      currHist[binCount + Math.floor(currFrame.data[i + 1] / binSize)]++
      // B channel
      prevHist[binCount * 2 + Math.floor(prevFrame.data[i + 2] / binSize)]++
      currHist[binCount * 2 + Math.floor(currFrame.data[i + 2] / binSize)]++
    }

    // Normalize histograms
    const norm = sampleCount / 4
    let chiSquare = 0
    for (let b = 0; b < prevHist.length; b++) {
      const e = prevHist[b] || 0.1
      const o = currHist[b]
      chiSquare += ((o - e) * (o - e)) / e
    }

    // chiSquare > threshold means significant scene change
    return chiSquare > threshold * binCount * 3
  }

  // Process single frame
  async function processFrame(
    frame: ImageData,
    frameIndex: number,
    roi: ROI,
    ocrConfig: OCRConfig
  ): Promise<SubtitleItem | null> {
    // Delegate ROI extraction to OCREngine (avoids duplicate implementation)
    const roiData = ocrEngine.safeExtractROI(
      frame,
      roi.x, roi.y, roi.width, roi.height
    )
    const result = await ocrEngine.processROI(roiData, roi, ocrConfig)
    
    if (result.text.trim().length === 0) {
      return null
    }
    
    if (result.confidence < ocrConfig.confidenceThreshold) {
      return null
    }
    
    const fps = projectStore.videoMeta?.fps ?? 30
    const timestamp = frameIndex / fps
    
    return {
      id: `sub-${frameIndex}-${Date.now()}`,
      index: extractedCount.value + 1,
      startTime: timestamp,
      endTime: timestamp + 2, // Default 2 second duration
      startFrame: frameIndex,
      endFrame: frameIndex,
      text: result.text.trim(),
      confidence: result.confidence,
      language: ocrConfig.language[0],
      roi: roi,
      thumbnailUrls: [],
      edited: false
    }
  }

  // Main extraction loop
  async function startExtraction(roi: ROI, ocrConfig: OCRConfig) {
    if (!projectStore.videoMeta) {
      throw new Error('No video loaded')
    }

    isExtracting.value = true
    isPaused.value = false
    extractedCount.value = 0
    totalFrames.value = projectStore.videoMeta.totalFrames

    // Initialize OCR engine — use config's engine and language mapping
    await ocrEngine.init(ocrConfig.engine, ocrConfig.language)

    subtitleStore.startExtraction()

    let prevFrameData: ImageData | null = null
    const sceneThreshold = projectStore.extractOptions.sceneThreshold
    const frameInterval = projectStore.extractOptions.frameInterval

    for (let frameIndex = 0; frameIndex < totalFrames.value; frameIndex++) {
      // Check if paused or stopped
      if (!isExtracting.value || isPaused.value) {
        await waitForResume()
        if (!isExtracting.value) break
      }

      // Seek to frame
      const timestamp = frameIndex / projectStore.videoMeta.fps
      // Note: In real implementation, we'd seek the video element
      
      // Capture frame
      const frameData = videoPlayer.captureFrame()
      if (!frameData) continue

      // Scene detection
      if (prevFrameData && !detectSceneChange(prevFrameData, frameData, sceneThreshold)) {
        // Skip this frame - too similar to previous
        continue
      }

      // Only process every Nth frame based on interval
      if (frameIndex % frameInterval !== 0) {
        prevFrameData = frameData
        continue
      }

      // Process OCR
      try {
        const subtitle = await processFrame(frameData, frameIndex, roi, ocrConfig)
        
        if (subtitle) {
          subtitleStore.addSubtitle(subtitle)
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

    // Post-processing: merge similar consecutive subtitles
    const rawSubs = subtitleStore.subtitles
    if (rawSubs.length > 1) {
      const merged = ocrEngine.mergeSimilarSubtitles(
        rawSubs.map(s => ({
          startTime: s.startTime,
          endTime: s.endTime,
          startFrame: s.startFrame,
          endFrame: s.endFrame,
          text: s.text,
          confidence: s.confidence,
        })),
        0.80,   // similarity threshold
        0.5     // max time gap (seconds)
      )
      // Replace subtitles with merged results (re-index)
      subtitleStore.setSubtitles(
        merged.map((s, i) => ({
          ...rawSubs.find(r => r.text === s.text && Math.abs(r.startTime - s.startTime) < 0.1)!,
          ...s,
          index: i + 1,
        })).filter(Boolean)
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
