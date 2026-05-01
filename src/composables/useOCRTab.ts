/**
 * useOCRTab - OCR tab state and logic
 * Extracted from SidePanel.vue OCR tab
 */
import { ref, computed } from 'vue'
import { useProjectStore } from '@/stores/project'
import type { OCREngine } from '@/types/video'

export interface OCREngineInfo {
  id: OCREngine
  name: string
  shortName: string
  tech: string
  recommended: boolean
  speed: string
  accuracy: string
  langs: number
  description: string
}

export function useOCRTab() {
  const projectStore = useProjectStore()

  // OCR Engine definitions
  const ocrEngines: OCREngineInfo[] = [
    {
      id: 'paddle',
      name: 'PaddleOCR',
      shortName: 'PP',
      tech: '深度学习',
      recommended: true,
      speed: '快',
      accuracy: '高',
      langs: 80,
      description: '支持80+语言，适合字幕识别'
    },
    {
      id: 'easyocr',
      name: 'EasyOCR',
      shortName: 'EZ',
      tech: '深度学习',
      recommended: false,
      speed: '中',
      accuracy: '高',
      langs: 40,
      description: '支持40+语言，GPU加速'
    },
    {
      id: 'tesseract',
      name: 'Tesseract.js',
      shortName: 'TS',
      tech: '传统算法',
      recommended: false,
      speed: '慢',
      accuracy: '中',
      langs: 100,
      description: '纯JS实现，无需服务器'
    }
  ]

  // Language options
  const languageOptions = [
    { value: 'ch', label: '中文', abbr: '中' },
    { value: 'en', label: 'English', abbr: 'EN' },
    { value: 'ja', label: '日本語', abbr: '日' },
    { value: 'ko', label: '한국어', abbr: '한' },
    { value: 'fr', label: 'Français', abbr: 'FR' },
    { value: 'de', label: 'Deutsch', abbr: 'DE' },
    { value: 'es', label: 'Español', abbr: 'ES' },
    { value: 'pt', label: 'Português', abbr: 'PT' },
    { value: 'it', label: 'Italiano', abbr: 'IT' },
    { value: 'ru', label: 'Русский', abbr: 'RU' },
    { value: 'ar', label: 'العربية', abbr: 'AR' },
  ]

  // Advanced options state
  const showAdvanced = ref(false)
  const multiPass = ref(true)
  const postProcess = ref(true)
  const mergeSubtitles = ref(true)
  const mergeThreshold = ref(0.8)
  const sceneThreshold = ref(0.3)
  const frameInterval = ref(1)

  // Confidence threshold - synchronized with store
  const confidenceThreshold = computed({
    get: () => Math.round(projectStore.extractOptions.confidenceThreshold * 100),
    set: (val: number) => {
      projectStore.extractOptions.confidenceThreshold = val / 100
    }
  })

  // Computed: estimated accuracy
  const estimatedAccuracy = computed(() => {
    const engine = projectStore.extractOptions.ocrEngine
    const baseAccuracy = {
      paddle: 92,
      easyocr: 90,
      tesseract: 78
    }[engine] ?? 80

    let adjusted = baseAccuracy
    if (multiPass.value) adjusted += 3
    if (postProcess.value) adjusted += 2
    return Math.min(adjusted, 99)
  })

  // Methods
  function setLanguage(lang: string) {
    projectStore.extractOptions.languages = [lang]
  }

  function toggleMultiPass() {
    multiPass.value = !multiPass.value
    projectStore.extractOptions.multiPass = multiPass.value
  }

  function togglePostProcess() {
    postProcess.value = !postProcess.value
    projectStore.extractOptions.postProcess = postProcess.value
  }

  function toggleMergeSubtitles() {
    mergeSubtitles.value = !mergeSubtitles.value
    projectStore.extractOptions.mergeSubtitles = mergeSubtitles.value
  }

  function setMergeThreshold(value: number) {
    mergeThreshold.value = value
    projectStore.extractOptions.mergeThreshold = value
  }

  function setSceneThreshold(value: number) {
    sceneThreshold.value = value
    projectStore.extractOptions.sceneThreshold = value
  }

  function setFrameInterval(value: number) {
    frameInterval.value = value
    projectStore.extractOptions.frameInterval = value
  }

  return {
    ocrEngines,
    languageOptions,
    showAdvanced,
    multiPass,
    postProcess,
    mergeSubtitles,
    mergeThreshold,
    sceneThreshold,
    frameInterval,
    confidenceThreshold,
    estimatedAccuracy,
    setLanguage,
    toggleMultiPass,
    togglePostProcess,
    toggleMergeSubtitles,
    setMergeThreshold,
    setSceneThreshold,
    setFrameInterval,
  }
}
