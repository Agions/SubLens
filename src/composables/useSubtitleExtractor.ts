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

  // Scene detection: skip frames that are too similar
  function detectSceneChange(prevFrame: ImageData, currFrame: ImageData, threshold: number = 0.3): boolean {
    // Simple histogram comparison
    let diff = 0
    const sampleSize = Math.min(prevFrame.data.length, currFrame.data.length, 1000)
    
    for (let i = 0; i < sampleSize; i += 4) {
      // Compare RGB values
      const rDiff = Math.abs(prevFrame.data[i] - currFrame.data[i])
      const gDiff = Math.abs(prevFrame.data[i + 1] - currFrame.data[i + 1])
      const bDiff = Math.abs(prevFrame.data[i + 2] - currFrame.data[i + 2])
      diff += (rDiff + gDiff + bDiff) / 3
    }
    
    const avgDiff = diff / (sampleSize / 4)
    return avgDiff > threshold * 255
  }

  // Extract ROI from full frame
  function extractROIFromFrame(frame: ImageData, roi: ROI): ImageData {
    const { x, y, width, height, unit } = roi
    
    // Convert percentage to pixels
    const left = unit === 'percent' ? (x / 100) * frame.width : x
    const top = unit === 'percent' ? (y / 100) * frame.height : y
    const w = unit === 'percent' ? (width / 100) * frame.width : width
    const h = unit === 'percent' ? (height / 100) * frame.height : height

    const roiData = new ImageData(Math.floor(w), Math.floor(h))
    
    for (let py = 0; py < Math.floor(h); py++) {
      for (let px = 0; px < Math.floor(w); px++) {
        const srcIdx = ((Math.floor(top) + py) * frame.width + Math.floor(left) + px) * 4
        const dstIdx = (py * Math.floor(w) + px) * 4
        
        if (srcIdx + 3 < frame.data.length && dstIdx + 3 < roiData.data.length) {
          roiData.data[dstIdx] = frame.data[srcIdx]
          roiData.data[dstIdx + 1] = frame.data[srcIdx + 1]
          roiData.data[dstIdx + 2] = frame.data[srcIdx + 2]
          roiData.data[dstIdx + 3] = 255
        }
      }
    }
    
    return roiData
  }

  // Process single frame
  async function processFrame(
    frame: ImageData,
    frameIndex: number,
    roi: ROI,
    ocrConfig: OCRConfig
  ): Promise<SubtitleItem | null> {
    const roiData = extractROIFromFrame(frame, roi)
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

    // Initialize OCR engine
    const langMap: Record<string, string[]> = {
      ch: ['eng', 'chi_sim'],
      en: ['eng'],
      ja: ['eng', 'jpn'],
      ko: ['eng', 'kor']
    }
    
    const langs = langMap[ocrConfig.language[0]] || ['eng']
    await ocrEngine.init('tesseract', langs)

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
