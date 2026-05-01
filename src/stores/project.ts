import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { VideoMetadata, ROI, ExtractOptions, OCREngine } from '@/types/video'
import { ROI_PRESETS } from '@/types/video'
import {
  DEFAULT_OCR_ENGINE,
  DEFAULT_LANGUAGES,
  DEFAULT_CONFIDENCE_THRESHOLD,
  DEFAULT_MERGE_THRESHOLD,
  DEFAULT_SCENE_THRESHOLD,
  DEFAULT_FRAME_INTERVAL,
  DEFAULT_ROI_NAME,
  DEFAULT_ROI_Y,
  DEFAULT_ROI_HEIGHT,
} from '@/utils/constants'

export const useProjectStore = defineStore('project', () => {
  // State
  const videoPath = ref<string | null>(null)
  const videoMeta = ref<VideoMetadata | null>(null)
  const currentFrame = ref(0)
  const isPlaying = ref(false)
  const volume = ref(1)
  const isMuted = ref(false)
  
  // ROI State
  const selectedROI = ref<ROI>({
    id: 'bottom',
    name: DEFAULT_ROI_NAME,
    type: 'bottom',
    x: 0,
    y: DEFAULT_ROI_Y,
    width: 100,
    height: DEFAULT_ROI_HEIGHT,
    unit: 'percent',
    enabled: true
  })

  // Extract Options
  const extractOptions = ref<ExtractOptions>({
    ocrEngine: DEFAULT_OCR_ENGINE,
    languages: [...DEFAULT_LANGUAGES],
    confidenceThreshold: DEFAULT_CONFIDENCE_THRESHOLD,
    multiPass: true,
    postProcess: true,
    mergeSubtitles: true,
    mergeThreshold: DEFAULT_MERGE_THRESHOLD,
    sceneThreshold: DEFAULT_SCENE_THRESHOLD,
    frameInterval: DEFAULT_FRAME_INTERVAL,
  })
  
  // Computed
  const hasVideo = computed(() => videoPath.value !== null)
  
  const currentTime = computed(() => {
    if (!videoMeta.value) return 0
    return currentFrame.value / videoMeta.value.fps
  })
  
  const duration = computed(() => videoMeta.value?.duration ?? 0)
  
  const progress = computed(() => {
    if (!videoMeta.value || videoMeta.value.totalFrames === 0) return 0
    return (currentFrame.value / videoMeta.value.totalFrames) * 100
  })
  
  // Actions
  function setVideo(path: string, meta: VideoMetadata) {
    videoPath.value = path
    videoMeta.value = meta
    currentFrame.value = 0
  }
  
  function clearVideo() {
    videoPath.value = null
    videoMeta.value = null
    currentFrame.value = 0
    isPlaying.value = false
  }
  
  function setCurrentFrame(frame: number) {
    if (!videoMeta.value) return
    currentFrame.value = Math.max(0, Math.min(frame, videoMeta.value.totalFrames - 1))
  }
  
  function setPlaying(playing: boolean) {
    isPlaying.value = playing
  }
  
  function togglePlay() {
    isPlaying.value = !isPlaying.value
  }
  
  function selectROIPreset(presetId: string) {
    const preset = ROI_PRESETS.find(p => p.id === presetId)
    if (preset) {
      selectedROI.value = {
        ...preset.rect,
        id: preset.id,
        name: preset.name,
        type: preset.id as ROI['type'],
        enabled: true
      }
    }
  }
  
  function updateROI(updates: Partial<ROI>) {
    selectedROI.value = { ...selectedROI.value, ...updates }
  }
  
  function setOCROptions(options: Partial<ExtractOptions>) {
    extractOptions.value = { ...extractOptions.value, ...options }
  }
  
  function setOCREngine(engine: OCREngine) {
    extractOptions.value.ocrEngine = engine
  }
  
  function setLanguages(langs: string[]) {
    extractOptions.value.languages = langs
  }
  
  return {
    // State
    videoPath,
    videoMeta,
    currentFrame,
    isPlaying,
    volume,
    isMuted,
    selectedROI,
    extractOptions,
    
    // Computed
    hasVideo,
    currentTime,
    duration,
    progress,
    
    // Actions
    setVideo,
    clearVideo,
    setCurrentFrame,
    setPlaying,
    togglePlay,
    selectROIPreset,
    updateROI,
    setOCROptions,
    setOCREngine,
    setLanguages
  }
})
