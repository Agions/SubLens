<script setup lang="ts">
import { ref, computed, inject, watch, onMounted } from 'vue'
import type { Ref } from 'vue'

interface ExtractionSession {
  isExtracting: Ref<boolean>
  isPaused: Ref<boolean>
  currentFrame: Ref<number>
  totalFrames: Ref<number>
  extractedCount: Ref<number>
  startExtraction: () => Promise<void>
  pauseExtraction: () => void
  resumeExtraction: () => void
  stopExtraction: () => void
}
import { useProjectStore } from '@/stores/project'
import { useSubtitleStore } from '@/stores/subtitle'
import { useSettingsStore } from '@/stores/settings'
import { useTheme } from '@/composables/useTheme'
import { useSystemCheck } from '@/composables/useSystemCheck'
import { ROI_PRESETS, type OCREngine } from '@/types/video'
import type { ExportFormats } from '@/types/subtitle'

const projectStore = useProjectStore()
const subtitleStore = useSubtitleStore()
const settingsStore = useSettingsStore()
const { setTheme } = useTheme()
const { checkDependencies, lastResult } = useSystemCheck()

const openExportDialog = inject<() => void>('openExportDialog')
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const subtitleExtractor = (inject('subtitleExtractor') as any) as ExtractionSession | null

function handleExport(format: keyof ExportFormats) {
  subtitleStore.exportFormats[format] = !subtitleStore.exportFormats[format]
}

function openExport() {
  openExportDialog?.()
}

type TabKey = 'files' | 'progress' | 'roi' | 'ocr' | 'export' | 'settings'
const activeTab = ref<TabKey>('files')

// Settings tab local state
const localSettings = ref({ ...settingsStore.settings })

onMounted(() => {
  checkDependencies()
})

watch(localSettings, (newSettings) => {
  Object.assign(settingsStore.settings, newSettings)
}, { deep: true })

function handleThemeChange() {
  setTheme(localSettings.value.theme)
}

// System dependencies status
const systemDeps = computed(() => lastResult.value?.dependencies ?? [])

// OCR Engine definitions with detailed stats
const ocrEngines: {
  id: OCREngine
  name: string
  shortName: string
  desc: string
  accuracy: number    // 1-5 stars
  speed: number       // 1-5 stars
  langCount: number
  recommended: boolean
  tech: string        // tech badge
}[] = [
  { id: 'paddle', name: 'PaddleOCR', shortName: 'PP', desc: '百度开源·深度学习', accuracy: 5, speed: 4, langCount: 80, recommended: true, tech: 'PP-OCRv5' },
  { id: 'easyocr', name: 'EasyOCR', shortName: 'EO', desc: 'PyTorch·多语言', accuracy: 4, speed: 3, langCount: 80, recommended: false, tech: 'deep learning' },
  { id: 'tesseract', name: 'Tesseract.js', shortName: 'TS', desc: 'WASM·无需后端', accuracy: 3, speed: 5, langCount: 100, recommended: false, tech: 'LSTM+WASM' },
]

const selectedLanguages = ref<string[]>(['ch'])
const confidenceThreshold = ref(70)
const multiPassEnabled = ref(true)
const mergeEnabled = ref(true)
const mergeThreshold = ref(80)
const postProcessEnabled = ref(true)
const sceneSensitivity = ref(30)
const frameInterval = ref(1)
const showAdvanced = ref(false)
const isExtracting = computed(() => subtitleStore.isExtracting)
const extractStartTime = ref<number>(0)

const extractSpeed = computed(() => {
  if (!isExtracting.value || subtitleStore.extractProgress === 0 || extractStartTime.value === 0) return 0
  const elapsed = (Date.now() / 1000) - extractStartTime.value
  if (elapsed <= 0) return 0
  return Math.round(subtitleStore.currentExtractFrame / elapsed)
})

// How many already-extracted subtitles fall below the current threshold
const belowThresholdCount = computed(() =>
  subtitleStore.subtitles.filter(s => s.confidence < confidenceThreshold.value / 100).length
)

// Estimated extraction accuracy based on current settings
const estimatedAccuracy = computed(() => {
  const engine = projectStore.extractOptions.ocrEngine
  const baseAccuracy: Record<OCREngine, number> = {
    paddle: 95,
    easyocr: 88,
    tesseract: 78,
  }
  let score = baseAccuracy[engine] ?? 80

  // Multi-pass bonus
  if (multiPassEnabled.value) score += 4
  // Post-processing bonus
  if (postProcessEnabled.value) score += 3
  // Merge bonus
  if (mergeEnabled.value) score += 2
  // Language mixing penalty
  if (selectedLanguages.value.length > 1) score -= 2

  return Math.min(100, score)
})

// Language families for grouped display
const languageFamilies = [
  {
    name: 'CJK',
    langs: [
      { id: 'ch', name: '中文', flag: '🇨🇳' },
      { id: 'ja', name: '日文', flag: '🇯🇵' },
      { id: 'ko', name: '韩文', flag: '🇰🇷' },
    ]
  },
  {
    name: '欧洲',
    langs: [
      { id: 'en', name: '英文', flag: '🇬🇧' },
      { id: 'fr', name: '法文', flag: '🇫🇷' },
      { id: 'de', name: '德文', flag: '🇩🇪' },
      { id: 'es', name: '西班牙', flag: '🇪🇸' },
    ]
  },
  {
    name: '其他',
    langs: [
      { id: 'ru', name: '俄文', flag: '🇷🇺' },
      { id: 'ar', name: '阿拉伯', flag: '🇸🇦' },
      { id: 'vi', name: '越南', flag: '🇻🇳' },
      { id: 'th', name: '泰文', flag: '🇹🇭' },
    ]
  },
]

function toggleLanguage(id: string) {
  const idx = selectedLanguages.value.indexOf(id)
  if (idx === -1) {
    selectedLanguages.value.push(id)
  } else {
    if (selectedLanguages.value.length > 1) {
      selectedLanguages.value.splice(idx, 1)
    }
  }
  projectStore.setLanguages([...selectedLanguages.value])
}

async function handleStartExtraction() {
  if (!projectStore.hasVideo) return
  extractStartTime.value = Date.now() / 1000
  // Initialize language from selectedLanguages
  projectStore.setLanguages([...selectedLanguages.value])
  // Sync all advanced options to store
  projectStore.setOCROptions({
    ocrEngine: projectStore.extractOptions.ocrEngine,
    languages: [...selectedLanguages.value],
    confidenceThreshold: confidenceThreshold.value,
    multiPass: multiPassEnabled.value,
    postProcess: postProcessEnabled.value,
    mergeSubtitles: mergeEnabled.value,
    mergeThreshold: mergeThreshold.value / 100,
    sceneThreshold: sceneSensitivity.value / 100,
    frameInterval: frameInterval.value,
  })
  // Start extraction (reads all options from store)
  await subtitleExtractor!.startExtraction()
}

function handleStopExtraction() {
  subtitleExtractor!.stopExtraction()
}

// SVG progress ring constants
const RADIUS = 42
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

const progressOffset = computed(() => {
  return CIRCUMFERENCE - (CIRCUMFERENCE * subtitleStore.extractProgress) / 100
})

const formatDescriptions: Record<keyof ExportFormats, string> = {
  srt: '通用字幕格式',
  vtt: '网页视频字幕',
  ass: '高级字幕样式',
  ssa: 'SubStation Alpha',
  json: '含帧对应数据',
  txt: '纯文本',
  lrc: '歌词同步格式',
  sbv: 'YouTube字幕',
  csv: '表格数据'
}
</script>

<template>
  <aside class="side-panel">
    <!-- Tab Bar -->
    <div class="tab-bar">
      <button
        v-for="tab in [
          { key: 'files', icon: 'file', label: '文件' },
          { key: 'progress', icon: 'chart', label: '进度' },
          { key: 'roi', icon: 'crop', label: '区域' },
          { key: 'ocr', icon: 'ocr', label: 'OCR' },
          { key: 'export', icon: 'export', label: '导出' },
          { key: 'settings', icon: 'settings', label: '设置' },
        ] as const"
        :key="tab.key"
        :class="['tab-item', { active: activeTab === tab.key }]"
        @click="activeTab = tab.key"
      >
        <!-- File icon -->
        <svg v-if="tab.icon === 'file'" class="tab-icon" viewBox="0 0 20 20" fill="none">
          <path d="M4 3h8l4 4v10a1 1 0 01-1 1H4a1 1 0 01-1-1V4a1 1 0 011-1z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>
          <path d="M12 3v4h4" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>
        </svg>
        <!-- Chart icon -->
        <svg v-if="tab.icon === 'chart'" class="tab-icon" viewBox="0 0 20 20" fill="none">
          <path d="M3 17V7m0 4V5m0 8V9m4-5V7m0 6V3m0 10V9m4-6V5m0 8V7m4-4V3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
        <!-- Crop icon -->
        <svg v-if="tab.icon === 'crop'" class="tab-icon" viewBox="0 0 20 20" fill="none">
          <path d="M6 3v11a1 1 0 001 1h11" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
          <path d="M3 6h11a1 1 0 011 1v11" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
        </svg>
        <!-- OCR icon -->
        <svg v-if="tab.icon === 'ocr'" class="tab-icon" viewBox="0 0 20 20" fill="none">
          <rect x="3" y="4" width="14" height="12" rx="2" stroke="currentColor" stroke-width="1.4"/>
          <path d="M7 8h6M7 12h4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
        </svg>
        <!-- Export icon -->
        <svg v-if="tab.icon === 'export'" class="tab-icon" viewBox="0 0 20 20" fill="none">
          <path d="M10 3v10m0 0L6 9m4 4l4-4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M3 14v2a1 1 0 001 1h12a1 1 0 001-1v-2" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
        </svg>
        <!-- Settings icon -->
        <svg v-if="tab.icon === 'settings'" class="tab-icon" viewBox="0 0 20 20" fill="none">
          <circle cx="10" cy="10" r="3" stroke="currentColor" stroke-width="1.4"/>
          <path d="M10 3v2m0 10v2M3 10h2m10 0h2M5.05 5.05l1.41 1.41m7.08 7.08l1.41 1.41M5.05 14.95l1.41-1.41m7.08-7.08l1.41-1.41" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
        </svg>
        <span class="tab-label">{{ tab.label }}</span>
      </button>
    </div>

    <!-- ── Files Tab ─────────────────────────────────────── -->
    <div v-if="activeTab === 'files'" class="tab-content">
      <div class="section">
        <div class="section-header">
          <span class="section-title">当前视频</span>
        </div>

        <div v-if="projectStore.hasVideo" class="video-card">
          <!-- File icon -->
          <div class="video-icon">
            <svg viewBox="0 0 40 40" fill="none">
              <rect x="4" y="8" width="32" height="24" rx="4" fill="rgba(10,132,255,0.1)" stroke="currentColor" stroke-width="1.5"/>
              <path d="M14 15l8 5-8 5V15z" fill="currentColor" opacity="0.7"/>
              <rect x="8" y="28" width="10" height="3" rx="1.5" fill="currentColor" opacity="0.2"/>
              <rect x="20" y="28" width="12" height="3" rx="1.5" fill="currentColor" opacity="0.2"/>
            </svg>
          </div>

          <div class="video-meta">
            <div class="meta-row">
              <span class="meta-label">文件名</span>
              <span class="meta-value truncate">{{ projectStore.videoPath?.split('/').pop() ?? '-' }}</span>
            </div>
            <div class="meta-row">
              <span class="meta-label">分辨率</span>
              <span class="meta-value">{{ projectStore.videoMeta?.width }} × {{ projectStore.videoMeta?.height }}</span>
            </div>
            <div class="meta-row">
              <span class="meta-label">时长</span>
              <span class="meta-value">{{ projectStore.duration.toFixed(1) }}s</span>
            </div>
            <div class="meta-row">
              <span class="meta-label">帧率</span>
              <span class="meta-value">{{ projectStore.videoMeta?.fps }} fps</span>
            </div>
            <div class="meta-row">
              <span class="meta-label">总帧数</span>
              <span class="meta-value">{{ projectStore.videoMeta?.totalFrames?.toLocaleString() }}</span>
            </div>
          </div>
        </div>

        <div v-else class="empty-card">
          <svg class="empty-icon" viewBox="0 0 48 48" fill="none">
            <circle cx="24" cy="24" r="20" stroke="currentColor" stroke-width="1.5" stroke-dasharray="3 3"/>
            <path d="M20 18h8m-4 4v8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
          <p class="empty-text">未加载视频</p>
        </div>
      </div>
    </div>

    <!-- ── Progress Tab ──────────────────────────────────── -->
    <div v-if="activeTab === 'progress'" class="tab-content">
      <div class="section">
        <div class="section-header">
          <span class="section-title">处理进度</span>
          <span v-if="isExtracting" class="extracting-badge">
            <span class="pulse-dot"/>
            提取中
          </span>
        </div>

        <!-- SVG Progress Ring -->
        <div class="progress-ring-wrapper">
          <svg class="progress-ring" viewBox="0 0 100 100">
            <!-- Glow effect -->
            <circle
              cx="50" cy="50" r="42"
              fill="none"
              stroke="rgba(10,132,255,0.08)"
              stroke-width="8"
            />
            <!-- Track -->
            <circle
              class="ring-track"
              cx="50" cy="50" r="42"
              fill="none"
              stroke-width="6"
            />
            <!-- Progress -->
            <circle
              class="ring-progress"
              cx="50" cy="50" r="42"
              fill="none"
              stroke-width="6"
              stroke-linecap="round"
              :stroke-dasharray="CIRCUMFERENCE"
              :stroke-dashoffset="progressOffset"
            />
          </svg>
          <div class="ring-center">
            <span class="ring-percent">{{ Math.round(subtitleStore.extractProgress) }}</span>
            <span class="ring-unit">%</span>
          </div>
        </div>

        <!-- Stats grid -->
        <div class="stats-grid">
          <div class="stat-card">
            <span class="stat-value">{{ subtitleStore.currentExtractFrame.toLocaleString() }}</span>
            <span class="stat-label">已处理帧</span>
          </div>
          <div class="stat-card">
            <span class="stat-value">{{ subtitleStore.totalCount }}</span>
            <span class="stat-label">字幕条数</span>
          </div>
          <div class="stat-card">
            <span class="stat-value">{{ extractSpeed || '-' }}</span>
            <span class="stat-label">帧/秒</span>
          </div>
          <div class="stat-card">
            <span class="stat-value" :class="subtitleStore.extractProgress > 0 ? 'text-success' : ''">
              {{ subtitleStore.extractProgress > 0 ? Math.ceil((100 - subtitleStore.extractProgress) / Math.max(subtitleStore.extractProgress, 1) * (Date.now() / 1000 - extractStartTime)) + 's' : '-' }}
            </span>
            <span class="stat-label">预计剩余</span>
          </div>
        </div>

        <!-- Action button -->
        <button
          v-if="!isExtracting"
          class="action-btn action-btn--primary"
          :disabled="!projectStore.hasVideo"
          @click="handleStartExtraction"
        >
          <svg class="btn-icon" viewBox="0 0 20 20" fill="none">
            <path d="M6 4l10 6-10 6V4z" fill="currentColor"/>
          </svg>
          开始提取
        </button>
        <button
          v-else
          class="action-btn action-btn--danger"
          @click="handleStopExtraction"
        >
          <svg class="btn-icon" viewBox="0 0 20 20" fill="none">
            <rect x="4" y="4" width="5" height="12" rx="1" fill="currentColor"/>
            <rect x="11" y="4" width="5" height="12" rx="1" fill="currentColor"/>
          </svg>
          停止提取
        </button>
      </div>
    </div>

    <!-- ── ROI Tab ──────────────────────────────────────── -->
    <div v-if="activeTab === 'roi'" class="tab-content">
      <div class="section">
        <div class="section-header">
          <span class="section-title">字幕区域预设</span>
        </div>

        <div class="roi-cards">
          <button
            v-for="preset in ROI_PRESETS"
            :key="preset.id"
            :class="['roi-card', { active: projectStore.selectedROI?.id === preset.id }]"
            @click="projectStore.selectROIPreset(preset.id)"
          >
            <!-- ROI preview illustration -->
            <div class="roi-preview">
              <div
                class="roi-zone"
                :style="{
                  top: preset.rect.y + '%',
                  left: preset.rect.x + '%',
                  width: preset.rect.width + '%',
                  height: preset.rect.height + '%',
                }"
              />
            </div>
            <span class="roi-name">{{ preset.name }}</span>
            <span class="roi-check">
              <svg v-if="projectStore.selectedROI?.id === preset.id" viewBox="0 0 12 12" fill="none">
                <path d="M2 6l3 3 5-5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </span>
          </button>
        </div>
      </div>

      <div class="section" v-if="projectStore.selectedROI">
        <div class="section-header">
          <span class="section-title">当前区域详情</span>
        </div>
        <div class="roi-detail-card">
          <div class="detail-row">
            <span class="detail-label">类型</span>
            <span class="detail-value">{{ projectStore.selectedROI.type }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">坐标</span>
            <span class="detail-value">X {{ projectStore.selectedROI.x.toFixed(1) }}% · Y {{ projectStore.selectedROI.y.toFixed(1) }}%</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">尺寸</span>
            <span class="detail-value">W {{ projectStore.selectedROI.width.toFixed(1) }}% · H {{ projectStore.selectedROI.height.toFixed(1) }}%</span>
          </div>
        </div>
      </div>
    </div>

    <!-- ── OCR Tab ───────────────────────────────────────── -->
    <div v-if="activeTab === 'ocr'" class="tab-content ocr-tab">

      <!-- Accuracy Meter -->
      <div class="accuracy-meter">
        <div class="meter-label">
          <svg viewBox="0 0 16 16" fill="none" class="meter-icon">
            <circle cx="8" cy="8" r="6.5" stroke="currentColor" stroke-width="1.2"/>
            <path d="M5 8l2 2 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span>预估准确率</span>
        </div>
        <div class="meter-track">
          <div
            class="meter-fill"
            :style="{ width: estimatedAccuracy + '%' }"
            :class="{
              'meter-high': estimatedAccuracy >= 90,
              'meter-mid': estimatedAccuracy >= 70 && estimatedAccuracy < 90,
              'meter-low': estimatedAccuracy < 70,
            }"
          />
        </div>
        <span class="meter-value">{{ estimatedAccuracy }}%</span>
      </div>

      <!-- Engine Selection -->
      <div class="section">
        <div class="section-header">
          <span class="section-title">OCR 引擎</span>
        </div>
        <div class="engine-list">
          <button
            v-for="engine in ocrEngines"
            :key="engine.id"
            :class="['engine-card', { active: projectStore.extractOptions.ocrEngine === engine.id }]"
            @click="projectStore.setOCREngine(engine.id)"
          >
            <div class="engine-header">
              <div class="engine-avatar" :class="'avatar-' + engine.id">
                <span class="avatar-text">{{ engine.shortName }}</span>
              </div>
              <div class="engine-info">
                <div class="engine-name-row">
                  <span class="engine-name">{{ engine.name }}</span>
                  <span v-if="engine.recommended" class="rec-chip">推荐</span>
                </div>
                <span class="engine-tech">{{ engine.tech }}</span>
              </div>
              <div class="engine-check">
                <svg v-if="projectStore.extractOptions.ocrEngine === engine.id" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="6" fill="currentColor" opacity="0.15"/>
                  <path d="M5 8l2 2 4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </div>
            </div>

            <!-- Engine Stats -->
            <div class="engine-stats">
              <div class="stat-item">
                <svg viewBox="0 0 10 10" fill="none">
                  <path d="M1 7l3-3 2 2 3-4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <div class="star-row">
                  <div
                    v-for="n in 5"
                    :key="n"
                    :class="['star', { filled: n <= engine.accuracy }]"
                  />
                </div>
              </div>
              <div class="stat-item">
                <svg viewBox="0 0 10 10" fill="none">
                  <path d="M1 8h8M2 6l2-2 2 2 2-2 2 2" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <div class="star-row">
                  <div
                    v-for="n in 5"
                    :key="n"
                    :class="['star', { filled: n <= engine.speed }]"
                  />
                </div>
              </div>
              <div class="stat-item stat-lang">
                <svg viewBox="0 0 10 10" fill="none">
                  <circle cx="5" cy="5" r="4" stroke="currentColor" stroke-width="1.2"/>
                  <path d="M2 5h6M5 1c-1.5 2-1.5 6 0 8M5 1c1.5 2 1.5 6 0 8" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
                </svg>
                <span>{{ engine.langCount }}+</span>
              </div>
            </div>

            <div class="engine-desc-text">{{ engine.desc }}</div>
          </button>
        </div>
      </div>

      <!-- Language Selection -->
      <div class="section">
        <div class="section-header">
          <span class="section-title">识别语言</span>
          <span class="lang-count">{{ selectedLanguages.length }} 种</span>
        </div>

        <div
          v-for="family in languageFamilies"
          :key="family.name"
          class="lang-family"
        >
          <span class="family-label">{{ family.name }}</span>
          <div class="lang-chips">
            <button
              v-for="lang in family.langs"
              :key="lang.id"
              :class="['lang-chip', { active: selectedLanguages.includes(lang.id) }]"
              @click="toggleLanguage(lang.id)"
            >
              <span class="lang-flag">{{ lang.flag }}</span>
              <span>{{ lang.name }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Advanced Settings -->
      <div class="section">
        <div class="section-header">
          <span class="section-title">高级选项</span>
          <button
            class="toggle-btn"
            :class="{ active: showAdvanced }"
            @click="showAdvanced = !showAdvanced"
          >
            {{ showAdvanced ? '收起' : '展开' }}
            <svg :class="['toggle-arrow', { open: showAdvanced }]" viewBox="0 0 10 6" fill="none">
              <path d="M1 1l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </div>

        <transition name="slide-down">
          <div v-if="showAdvanced" class="advanced-panel">
            <!-- Multi-pass OCR -->
            <div class="option-row">
              <div class="option-info">
                <span class="option-name">多通道 OCR</span>
                <span class="option-hint">多次识别取最优结果，提升准确率</span>
              </div>
              <button
                :class="['toggle-switch', { on: multiPassEnabled }]"
                @click="multiPassEnabled = !multiPassEnabled"
              >
                <span class="toggle-thumb"/>
              </button>
            </div>

            <!-- Text Post-processing -->
            <div class="option-row">
              <div class="option-info">
                <span class="option-name">文字后处理</span>
                <span class="option-hint">自动修正标点、繁简转换</span>
              </div>
              <button
                :class="['toggle-switch', { on: postProcessEnabled }]"
                @click="postProcessEnabled = !postProcessEnabled"
              >
                <span class="toggle-thumb"/>
              </button>
            </div>

            <!-- Merge Similar Subtitles -->
            <div class="option-row">
              <div class="option-info">
                <span class="option-name">字幕合并</span>
                <span class="option-hint">自动合并相似相邻字幕</span>
              </div>
              <button
                :class="['toggle-switch', { on: mergeEnabled }]"
                @click="mergeEnabled = !mergeEnabled"
              >
                <span class="toggle-thumb"/>
              </button>
            </div>

            <!-- Merge Threshold -->
            <div v-if="mergeEnabled" class="option-sub-row">
              <span class="sub-label">相似度阈值</span>
              <div class="slider-track small">
                <div class="slider-fill" :style="{ width: mergeThreshold + '%' }"/>
                <input type="range" v-model.number="mergeThreshold" min="50" max="100" class="slider"/>
              </div>
              <span class="sub-value">{{ mergeThreshold }}%</span>
            </div>

            <!-- Scene Detection Sensitivity -->
            <div class="option-row">
              <div class="option-info">
                <span class="option-name">场景检测灵敏度</span>
                <span class="option-hint">越高越敏感，跳过更多相似帧</span>
              </div>
              <span class="sensitivity-val">{{ sceneSensitivity }}%</span>
            </div>
            <div class="slider-track">
              <div class="slider-fill" :style="{ width: sceneSensitivity + '%' }"/>
              <input type="range" v-model.number="sceneSensitivity" min="0" max="100" class="slider"/>
            </div>
            <div class="slider-labels">
              <span>低（保留更多帧）</span>
              <span>高（跳过更多帧）</span>
            </div>

            <!-- Frame Interval -->
            <div class="option-row" style="margin-top: 12px">
              <div class="option-info">
                <span class="option-name">帧采样间隔</span>
                <span class="option-hint">每隔 N 帧处理一次（1=全部）</span>
              </div>
              <div class="stepper">
                <button class="stepper-btn" @click="frameInterval = Math.max(1, frameInterval - 1)">
                  <svg viewBox="0 0 10 10" fill="none"><path d="M2 5h6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
                </button>
                <span class="stepper-val">{{ frameInterval }}</span>
                <button class="stepper-btn" @click="frameInterval = Math.min(10, frameInterval + 1)">
                  <svg viewBox="0 0 10 10" fill="none"><path d="M5 2v6M2 5h6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
                </button>
              </div>
            </div>
          </div>
        </transition>
      </div>

      <!-- Confidence Threshold -->
      <div class="section">
        <div class="section-header">
          <span class="section-title">置信度阈值</span>
          <span class="threshold-value">{{ confidenceThreshold }}%</span>
        </div>
        <div class="slider-track">
          <div
            class="slider-fill"
            :style="{ width: confidenceThreshold + '%' }"
            :class="{
              'fill-green': confidenceThreshold >= 80,
              'fill-yellow': confidenceThreshold >= 50 && confidenceThreshold < 80,
              'fill-red': confidenceThreshold < 50,
            }"
          />
          <input type="range" v-model.number="confidenceThreshold" min="0" max="100" class="slider"/>
        </div>
        <div class="slider-labels">
          <span>0%（接受全部）</span>
          <span>50%</span>
          <span>100%（仅高置信度）</span>
        </div>
        <div v-if="subtitleStore.totalCount > 0" class="threshold-hint">
          当前设置下，将排除 <strong>{{ belowThresholdCount }}</strong> 条低于 {{ confidenceThreshold }}% 的字幕
          <span v-if="belowThresholdCount > 0" class="threshold-action" @click="subtitleStore.setConfidenceFilter('low')">
            → 查看低置信度字幕
          </span>
        </div>
      </div>

    </div>

    <!-- ── Export Tab ────────────────────────────────────── -->
    <div v-if="activeTab === 'export'" class="tab-content">
      <div class="section">
        <div class="section-header">
          <span class="section-title">导出格式</span>
        </div>
        <div class="export-list">
          <button
            v-for="format in (Object.keys(subtitleStore.exportFormats) as (keyof ExportFormats)[])"
            :key="format"
            :class="['export-card', { selected: !!subtitleStore.exportFormats[format] }]"
            @click="handleExport(format)"
          >
            <div class="export-left">
              <div class="export-check">
                <svg v-if="subtitleStore.exportFormats[format]" viewBox="0 0 12 12" fill="none">
                  <path d="M2 6l3 3 5-5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </div>
              <div class="export-info">
                <span class="export-name">{{ format.toUpperCase() }}</span>
                <span class="export-desc">{{ formatDescriptions[format] ?? '' }}</span>
              </div>
            </div>
            <div class="export-badge" v-if="subtitleStore.exportFormats[format]">
              <svg viewBox="0 0 12 12" fill="none">
                <path d="M6 1v6m0 0l-3-3m3 3l3-3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
          </button>
        </div>
        <button class="export-action-btn" @click="openExport">
          <svg class="export-btn-icon" viewBox="0 0 20 20" fill="none">
            <path d="M3 14v3h14v-3M10 3v10m0-10L6 7m4-4l4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          导出字幕文件
        </button>
      </div>
    </div>

    <!-- ── Settings Tab ─────────────────────────────────── -->
    <div v-if="activeTab === 'settings'" class="tab-content settings-tab">
      <div class="section">
        <div class="section-header">
          <span class="section-title">外观</span>
        </div>
        <div class="setting-item">
          <div class="setting-info">
            <span class="setting-label">主题</span>
            <span class="setting-desc">选择应用界面主题</span>
          </div>
          <div class="setting-control">
            <select v-model="localSettings.theme" class="select-input" @change="handleThemeChange">
              <option value="dark">深色</option>
              <option value="light">浅色</option>
            </select>
          </div>
        </div>
        <div class="setting-item">
          <div class="setting-info">
            <span class="setting-label">语言</span>
            <span class="setting-desc">界面显示语言</span>
          </div>
          <div class="setting-control">
            <select v-model="localSettings.language" class="select-input">
              <option value="zh-CN">中文</option>
              <option value="en-US">English</option>
            </select>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-header">
          <span class="section-title">字幕列表</span>
        </div>
        <div class="setting-item toggle-item">
          <div class="setting-info">
            <span class="setting-label">显示缩略图</span>
            <span class="setting-desc">在字幕列表中显示帧缩略图</span>
          </div>
          <div class="setting-control">
            <button
              :class="['toggle-btn', { active: localSettings.showThumbnails }]"
              @click="localSettings.showThumbnails = !localSettings.showThumbnails"
            >
              <span class="toggle-thumb" />
            </button>
          </div>
        </div>
        <div class="setting-item toggle-item">
          <div class="setting-info">
            <span class="setting-label">删除确认</span>
            <span class="setting-desc">删除字幕时显示确认对话框</span>
          </div>
          <div class="setting-control">
            <button
              :class="['toggle-btn', { active: localSettings.confirmDelete }]"
              @click="localSettings.confirmDelete = !localSettings.confirmDelete"
            >
              <span class="toggle-thumb" />
            </button>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-header">
          <span class="section-title">自动保存</span>
        </div>
        <div class="setting-item toggle-item">
          <div class="setting-info">
            <span class="setting-label">启用自动保存</span>
            <span class="setting-desc">定期自动保存项目进度</span>
          </div>
          <div class="setting-control">
            <button
              :class="['toggle-btn', { active: localSettings.autoSave }]"
              @click="localSettings.autoSave = !localSettings.autoSave"
            >
              <span class="toggle-thumb" />
            </button>
          </div>
        </div>
        <div class="setting-item" v-if="localSettings.autoSave">
          <div class="setting-info">
            <span class="setting-label">保存间隔</span>
            <span class="setting-desc">自动保存间隔（秒）</span>
          </div>
          <div class="setting-control">
            <input
              type="number"
              v-model.number="localSettings.autoSaveInterval"
              min="10"
              max="300"
              class="number-input"
            />
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-header">
          <span class="section-title">系统状态</span>
        </div>
        <div class="system-status">
          <div
            v-for="dep in systemDeps"
            :key="dep.name"
            :class="['dep-item', dep.installed ? 'dep-ok' : 'dep-missing']"
          >
            <span class="dep-icon">{{ dep.installed ? '✓' : '✗' }}</span>
            <span class="dep-name">{{ dep.name }}</span>
            <span class="dep-status">{{ dep.installed ? '已安装' : '未安装' }}</span>
          </div>
        </div>
      </div>
    </div>
  </aside>
</template>

<style lang="scss" scoped>
.side-panel {
  width: $sidebar-width;
  background: $bg-surface;
  border-right: 1px solid $border;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

// ── Tab Bar ─────────────────────────────────────────────────
.tab-bar {
  display: flex;
  padding: $space-2;
  gap: $space-1;
  border-bottom: 1px solid $border;
  animation: fade-up 0.3s ease-out both;
}

.tab-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: $space-2 $space-1;
  border-radius: $radius-md;
  color: $text-muted;
  transition: all $transition-base;

  &:hover {
    color: $text-secondary;
    background: $bg-overlay;
  }

  &.active {
    color: $primary;
    background: rgba($primary, 0.1);

    .tab-icon {
      filter: drop-shadow(0 0 4px rgba($primary, 0.4));
    }
  }

  .tab-icon {
    width: 18px;
    height: 18px;
    transition: filter $transition-base;
  }

  .tab-label {
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.02em;
  }
}

// ── Content ─────────────────────────────────────────────────
.tab-content {
  flex: 1;
  overflow-y: auto;
  padding: $space-4;
  @include custom-scrollbar;
  animation: fade-up 0.3s ease-out both;
}

.section {
  margin-bottom: $space-6;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: $space-3;
}

.section-title {
  font-size: $text-xs;
  font-weight: 700;
  color: $text-muted;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

// ── Video Card ────────────────────────────────────────────────
.video-card {
  background: $bg-elevated;
  border: 1px solid $border;
  border-radius: $radius-lg;
  padding: $space-4;
  animation: fade-up 0.3s 0.05s ease-out both;
}

.video-icon {
  display: flex;
  justify-content: center;
  margin-bottom: $space-4;

  svg {
    width: 48px;
    height: 48px;
    color: $primary;
    opacity: 0.7;
  }
}

.video-meta {
  display: flex;
  flex-direction: column;
  gap: $space-2;
}

.meta-row {
  display: flex;
  justify-content: space-between;
  align-items: center;

  .meta-label {
    font-size: $text-xs;
    color: $text-muted;
  }

  .meta-value {
    font-size: $text-sm;
    font-weight: 500;
    color: $text-secondary;

    &.truncate {
      max-width: 130px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }
}

// ── Empty Card ──────────────────────────────────────────────
.empty-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: $space-8 $space-4;
  background: $bg-elevated;
  border: 1.5px dashed $border;
  border-radius: $radius-lg;
  animation: fade-up 0.3s 0.05s ease-out both;

  .empty-icon {
    width: 48px;
    height: 48px;
    color: $text-muted;
    margin-bottom: $space-3;
    opacity: 0.5;
  }

  .empty-text {
    font-size: $text-sm;
    color: $text-muted;
  }
}

// ── Progress Ring ───────────────────────────────────────────
.progress-ring-wrapper {
  position: relative;
  width: 140px;
  height: 140px;
  margin: 0 auto $space-5;
  animation: fade-up 0.3s 0.05s ease-out both;
}

.progress-ring {
  width: 140px;
  height: 140px;
  transform: rotate(-90deg);

  .ring-track {
    stroke: $bg-overlay;
  }

  .ring-progress {
    stroke: var(--primary);
    filter: drop-shadow(0 0 6px color-mix(in oklch, var(--primary) 50%, transparent));
    transition: stroke-dashoffset 0.4s ease;
  }
}

.ring-center {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1px;

  .ring-percent {
    font-family: $font-display;
    font-size: 32px;
    font-weight: 800;
    color: $text-primary;
    line-height: 1;
  }

  .ring-unit {
    font-family: $font-display;
    font-size: $text-base;
    font-weight: 600;
    color: $text-muted;
    align-self: flex-end;
    margin-bottom: 4px;
  }
}

// ── Stats Grid ──────────────────────────────────────────────
.stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: $space-2;
  margin-bottom: $space-4;
}

.stat-card {
  background: $bg-elevated;
  border: 1px solid $border;
  border-radius: $radius-md;
  padding: $space-3;
  text-align: center;
  transition: border-color $transition-fast;

  &:hover {
    border-color: $border-light;
  }

  .stat-value {
    display: block;
    font-family: $font-display;
    font-size: $text-lg;
    font-weight: 700;
    color: $text-primary;
    margin-bottom: 2px;

    &.text-success { color: $success; }
  }

  .stat-label {
    font-size: 10px;
    color: $text-muted;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
}

// ── Action Button ────────────────────────────────────────────
.action-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: $space-2;
  padding: 12px;
  font-weight: 700;
  font-size: $text-base;
  border-radius: $radius-lg;
  transition: all $transition-base;

  .btn-icon {
    width: 18px;
    height: 18px;
  }

  &--primary {
    background: linear-gradient(135deg, var(--primary), color-mix(in oklch, var(--primary) 85%, white));
    color: #fff;
    box-shadow: 0 4px 16px color-mix(in oklch, var(--primary) 40%, transparent);

    &:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 8px 24px color-mix(in oklch, var(--primary) 50%, transparent);
    }

    &:active:not(:disabled) {
      transform: translateY(0) scale(0.98);
    }

    &:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
  }

  &--danger {
    background: $bg-elevated;
    border: 1.5px solid rgba($error, 0.3);
    color: $error;

    &:hover {
      background: rgba($error, 0.08);
      border-color: rgba($error, 0.5);
    }
  }
}

// ── Extracting Badge ────────────────────────────────────────
.extracting-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 10px;
  font-weight: 600;
  color: $success;
  background: rgba($success, 0.1);
  padding: 3px 8px;
  border-radius: $radius-full;
}

.pulse-dot {
  width: 6px;
  height: 6px;
  background: $success;
  border-radius: 50%;
  animation: pulse-anim 1.5s ease-in-out infinite;
}

// ── ROI Cards ───────────────────────────────────────────────
.roi-cards {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: $space-2;
}

.roi-card {
  position: relative;
  background: $bg-elevated;
  border: 1.5px solid $border;
  border-radius: $radius-lg;
  padding: $space-3;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: $space-2;
  transition: all $transition-base;
  animation: card-enter 0.3s ease-out both;

  &:hover {
    border-color: $border-light;
    transform: translateY(-1px);
  }

  &.active {
    border-color: $primary;
    background: rgba($primary, 0.05);
    box-shadow: 0 0 0 1px rgba($primary, 0.1);
  }

  .roi-preview {
    width: 100%;
    height: 40px;
    background: $bg-overlay;
    border-radius: $radius-sm;
    position: relative;
    overflow: hidden;
  }

  .roi-zone {
    position: absolute;
    background: rgba($primary, 0.5);
    border: 1px solid rgba($primary, 0.8);
    border-radius: 2px;
  }

  .roi-name {
    font-size: $text-xs;
    font-weight: 600;
    color: $text-secondary;
  }

  .roi-check {
    position: absolute;
    top: 6px;
    right: 6px;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: $primary;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;

    svg { width: 10px; height: 10px; }
  }
}

// ── ROI Detail ───────────────────────────────────────────────
.roi-detail-card {
  background: $bg-elevated;
  border: 1px solid $border;
  border-radius: $radius-md;
  padding: $space-3;
  display: flex;
  flex-direction: column;
  gap: $space-2;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;

  .detail-label {
    font-size: $text-xs;
    color: $text-muted;
  }

  .detail-value {
    font-size: $text-xs;
    font-weight: 600;
    color: $text-secondary;
    font-family: $font-display;
  }
}

// ── Engine List ─────────────────────────────────────────────

.engine-list {
  display: flex;
  flex-direction: column;
  gap: $space-2;
}

.engine-card {
  background: $bg-elevated;
  border: 1.5px solid $border;
  border-radius: $radius-lg;
  padding: $space-3;
  transition: all $transition-base;
  animation: card-enter 0.3s ease-out both;
  cursor: pointer;

  &:hover {
    border-color: $border-light;
  }

  &.active {
    border-color: rgba($primary, 0.5);
    background: rgba($primary, 0.04);
    box-shadow: 0 0 16px rgba($primary, 0.1);
  }
}

.engine-header {
  display: flex;
  align-items: center;
  gap: $space-3;
  margin-bottom: $space-3;
}

.engine-avatar {
  width: 36px;
  height: 36px;
  border-radius: $radius-md;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: -0.5px;

  &.avatar-paddle { background: linear-gradient(135deg, oklch(0.65 0.2 250), oklch(0.55 0.22 260)); color: #fff; }
  &.avatar-easyocr { background: linear-gradient(135deg, oklch(0.65 0.2 50), oklch(0.70 0.18 65)); color: #fff; }
  &.avatar-tesseract { background: linear-gradient(135deg, oklch(0.45 0.02 260), oklch(0.35 0.02 260)); color: #fff; }
}

.engine-info {
  flex: 1;
  min-width: 0;
}

.engine-name-row {
  display: flex;
  align-items: center;
  gap: $space-2;
  margin-bottom: 2px;
}

.engine-name {
  font-size: $text-sm;
  font-weight: 700;
  color: $text-primary;
}

.rec-chip {
  font-size: 9px;
  font-weight: 700;
  background: rgba($success, 0.12);
  color: $success;
  padding: 2px 6px;
  border-radius: $radius-full;
  border: 1px solid rgba($success, 0.2);
  letter-spacing: 0.02em;
}

.engine-tech {
  font-size: 10px;
  color: $text-muted;
  font-family: $font-display;
}

.engine-check {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 1.5px solid $border;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all $transition-fast;

  svg { width: 14px; height: 14px; }

  .engine-card.active & {
    background: $primary;
    border-color: $primary;
    svg { color: #fff; }
  }
}

.engine-stats {
  display: flex;
  gap: $space-4;
  margin-bottom: $space-2;
  padding: $space-2 0;
  border-top: 1px solid $border;
  border-bottom: 1px solid $border;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 10px;
  color: $text-muted;

  svg { width: 10px; height: 10px; }

  &.stat-lang {
    margin-left: auto;
    font-weight: 600;
    font-family: $font-display;
    color: $text-secondary;
  }
}

.star-row {
  display: flex;
  gap: 2px;
}

.star {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: $bg-overlay;
  transition: background $transition-fast;

  &.filled { background: $warning; }
}

.engine-desc-text {
  font-size: 10px;
  color: $text-muted;
}

// ── Language Chips ───────────────────────────────────────────
.lang-count {
  font-size: 10px;
  color: $text-muted;
  background: $bg-overlay;
  padding: 2px 6px;
  border-radius: $radius-full;
}

.lang-family {
  margin-bottom: $space-3;
}

.family-label {
  font-size: 10px;
  font-weight: 700;
  color: $text-muted;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  display: block;
  margin-bottom: $space-2;
}

.lang-chips {
  display: flex;
  flex-wrap: wrap;
  gap: $space-2;
}

.lang-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: $space-1 $space-3;
  background: $bg-elevated;
  border: 1.5px solid $border;
  border-radius: $radius-full;
  font-size: 12px;
  font-weight: 500;
  color: $text-secondary;
  transition: all $transition-base;

  .lang-flag { font-size: 12px; }

  &:hover {
    border-color: $border-light;
    color: $text-primary;
  }

  &.active {
    border-color: $primary;
    background: rgba($primary, 0.1);
    color: $primary;
  }
}

// ── Accuracy Meter ───────────────────────────────────────────
.accuracy-meter {
  display: flex;
  align-items: center;
  gap: $space-3;
  padding: $space-3 $space-4;
  background: rgba($primary, 0.04);
  border: 1px solid rgba($primary, 0.15);
  border-radius: $radius-xl;
  margin-bottom: $space-4;
  animation: fade-up 0.3s ease-out both;
}

.meter-icon {
  width: 16px;
  height: 16px;
  color: $primary;
  flex-shrink: 0;
}

.meter-label {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: $text-xs;
  font-weight: 600;
  color: $text-secondary;
  white-space: nowrap;
}

.meter-track {
  flex: 1;
  height: 6px;
  background: $bg-overlay;
  border-radius: $radius-full;
  overflow: hidden;
}

.meter-fill {
  height: 100%;
  border-radius: $radius-full;
  transition: width 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), background 0.3s;

  &.meter-high { background: linear-gradient(90deg, var(--success), color-mix(in oklch, var(--success) 80%, white)); }
  &.meter-mid { background: linear-gradient(90deg, var(--warning), color-mix(in oklch, var(--warning) 80%, white)); }
  &.meter-low { background: linear-gradient(90deg, var(--error), color-mix(in oklch, var(--error) 80%, white)); }
}

.meter-value {
  font-family: $font-display;
  font-size: $text-sm;
  font-weight: 800;
  min-width: 36px;
  text-align: right;
  color: $primary;
}

// ── Advanced Panel ───────────────────────────────────────────
.toggle-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  font-weight: 600;
  color: $text-muted;
  padding: 3px 8px;
  border-radius: $radius-sm;
  background: $bg-overlay;
  border: none;
  cursor: pointer;
  transition: all $transition-fast;

  &:hover { color: $text-secondary; background: $border; }
  &.active { color: $primary; }
}

.toggle-arrow {
  width: 10px;
  height: 6px;
  transition: transform $transition-base;

  &.open { transform: rotate(180deg); }
}

.advanced-panel {
  display: flex;
  flex-direction: column;
  gap: $space-3;
  padding: $space-3;
  background: rgba($bg-overlay, 0.5);
  border: 1px solid $border;
  border-radius: $radius-lg;
  margin-top: $space-2;
}

.option-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: $space-3;
}

.option-sub-row {
  display: flex;
  align-items: center;
  gap: $space-2;
  padding-left: $space-2;
  margin-top: -$space-1;
  margin-bottom: $space-1;
}

.option-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
}

.option-name {
  font-size: $text-sm;
  font-weight: 600;
  color: $text-secondary;
}

.option-hint {
  font-size: 10px;
  color: $text-muted;
}

.sensitivity-val {
  font-family: $font-display;
  font-size: $text-xs;
  font-weight: 700;
  color: $primary;
  min-width: 32px;
  text-align: right;
}

.sub-label {
  font-size: 10px;
  color: $text-muted;
  white-space: nowrap;
}

.sub-value {
  font-family: $font-display;
  font-size: 10px;
  font-weight: 700;
  color: $primary;
  min-width: 28px;
  text-align: right;
}

// ── Toggle Switch ────────────────────────────────────────────
.toggle-switch {
  width: 36px;
  height: 20px;
  background: $bg-overlay;
  border: 1.5px solid $border;
  border-radius: $radius-full;
  padding: 2px;
  cursor: pointer;
  transition: all $transition-base;
  flex-shrink: 0;

  &.on {
    background: $primary;
    border-color: $primary;
  }
}

.toggle-thumb {
  display: block;
  width: 14px;
  height: 14px;
  background: #fff;
  border-radius: 50%;
  transition: transform $transition-base;
  box-shadow: 0 1px 3px rgba(0,0,0,0.3);

  .toggle-switch.on & { transform: translateX(16px); }
}

// ── Stepper ─────────────────────────────────────────────────
.stepper {
  display: flex;
  align-items: center;
  gap: $space-2;
  background: $bg-elevated;
  border: 1px solid $border;
  border-radius: $radius-md;
  padding: 2px;
}

.stepper-btn {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: $radius-sm;
  border: none;
  background: transparent;
  color: $text-secondary;
  cursor: pointer;
  transition: all $transition-fast;

  svg { width: 10px; height: 10px; }
  &:hover { background: $bg-overlay; color: $text-primary; }
}

.stepper-val {
  font-family: $font-display;
  font-size: $text-sm;
  font-weight: 700;
  color: $text-primary;
  min-width: 20px;
  text-align: center;
}

// ── Slider ────────────────────────────────────────────────────
.threshold-value {
  font-family: $font-display;
  font-size: $text-sm;
  font-weight: 700;
  color: $primary;
}

.threshold-hint {
  display: flex;
  align-items: center;
  gap: $space-1;
  font-size: 10px;
  color: $text-muted;
  margin-top: $space-1;
  flex-wrap: wrap;

  strong {
    color: $warning;
    font-weight: 700;
  }
}

.threshold-action {
  color: $primary;
  cursor: pointer;
  font-weight: 600;
  transition: opacity $transition-fast;

  &:hover { opacity: 0.75; }
}

.slider-track {
  position: relative;
  height: 6px;
  background: $bg-overlay;
  border-radius: $radius-full;
  margin-bottom: $space-2;

  &.small { height: 4px; margin-bottom: 0; }

  .slider-fill {
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    background: linear-gradient(90deg, $primary, $accent);
    border-radius: $radius-full;
    pointer-events: none;
    transition: width 0.1s;

    &.fill-green { background: linear-gradient(90deg, var(--success), color-mix(in oklch, var(--success) 85%, white)); }
    &.fill-yellow { background: linear-gradient(90deg, var(--warning), color-mix(in oklch, var(--warning) 85%, white)); }
    &.fill-red { background: linear-gradient(90deg, var(--error), color-mix(in oklch, var(--error) 85%, white)); }
  }

  .slider {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    opacity: 0;
    cursor: pointer;
  }
}

.slider-labels {
  display: flex;
  justify-content: space-between;
  font-size: 10px;
  color: $text-muted;
}

// ── Export ───────────────────────────────────────────────────

// ── Export ───────────────────────────────────────────────────
.export-list {
  display: flex;
  flex-direction: column;
  gap: $space-2;
  margin-bottom: $space-4;
}

.export-card {
  background: $bg-elevated;
  border: 1.5px solid $border;
  border-radius: $radius-lg;
  padding: $space-3;
  display: flex;
  align-items: center;
  justify-content: space-between;
  transition: all $transition-base;
  animation: card-enter 0.3s ease-out both;

  &:hover {
    border-color: $border-light;
  }

  &.selected {
    border-color: $primary;
    background: rgba($primary, 0.04);
  }
}

.export-left {
  display: flex;
  align-items: center;
  gap: $space-3;
}

.export-check {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 1.5px solid $border;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all $transition-fast;

  svg { width: 12px; height: 12px; color: #fff; }

  .export-card.selected & {
    background: $primary;
    border-color: $primary;
  }
}

.export-info {
  display: flex;
  flex-direction: column;
  gap: 1px;

  .export-name {
    font-family: $font-display;
    font-size: $text-sm;
    font-weight: 600;
    color: $text-primary;
  }

  .export-desc {
    font-size: 10px;
    color: $text-muted;
  }
}

.export-badge {
  color: $primary;
  opacity: 0.7;

  svg {
    width: 14px;
    height: 14px;
  }
}

.export-action-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: $space-2;
  padding: 12px;
  background: $bg-elevated;
  border: 1.5px solid $border;
  border-radius: $radius-lg;
  font-weight: 700;
  font-size: $text-base;
  color: $text-primary;
  transition: all $transition-base;

  &:hover {
    border-color: $primary;
    background: rgba($primary, 0.05);
    color: $primary;
  }

  .export-btn-icon {
    width: 18px;
    height: 18px;
  }
}

// ── Settings Tab ─────────────────────────────────────────────
.settings-tab {
  padding: $space-3;
  overflow-y: auto;
  @include custom-scrollbar;
}

.setting-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: $space-3 $space-2;
  border-bottom: 1px solid $border-light;
  
  &:last-child { border-bottom: none; }
}

.setting-info {
  flex: 1;
  min-width: 0;
  
  .setting-label {
    display: block;
    font-size: $text-sm;
    font-weight: 500;
    color: $text-primary;
    margin-bottom: 2px;
  }
  
  .setting-desc {
    font-size: $text-xs;
    color: $text-muted;
    line-height: 1.4;
  }
}

.setting-control {
  display: flex;
  align-items: center;
  gap: $space-2;
  flex-shrink: 0;
  margin-left: $space-3;
}

.select-input {
  padding: $space-1 $space-2;
  font-size: $text-xs;
  background: $bg-elevated;
  border: 1px solid $border;
  border-radius: $radius-md;
  color: $text-primary;
  cursor: pointer;
  min-width: 70px;
  
  &:focus {
    outline: none;
    border-color: $primary;
  }
}

.number-input {
  padding: $space-1 $space-2;
  font-size: $text-xs;
  background: $bg-elevated;
  border: 1px solid $border;
  border-radius: $radius-md;
  color: $text-primary;
  width: 60px;
  text-align: center;
  
  &:focus {
    outline: none;
    border-color: $primary;
  }
}

.range-input {
  width: 80px;
  accent-color: $primary;
}

.range-value {
  font-size: $text-xs;
  color: $text-secondary;
  min-width: 32px;
  text-align: right;
}

.toggle-item {
  .setting-info { flex: 1; }
}

.toggle-btn {
  position: relative;
  width: 36px;
  height: 20px;
  border-radius: $radius-full;
  background: $bg-overlay;
  border: none;
  cursor: pointer;
  transition: background $transition-fast;
  flex-shrink: 0;
  
  .toggle-thumb {
    position: absolute;
    top: 2px;
    left: 2px;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: $text-muted;
    transition: all $transition-fast;
  }
  
  &.active {
    background: $primary;
    
    .toggle-thumb {
      left: 18px;
      background: white;
    }
  }
}

.system-status {
  display: flex;
  flex-direction: column;
  gap: $space-2;
}

.dep-item {
  display: flex;
  align-items: center;
  gap: $space-2;
  padding: $space-2;
  border-radius: $radius-md;
  font-size: $text-xs;
  
  &.dep-ok {
    background: rgba($secondary, 0.1);
    .dep-icon { color: $secondary; }
    .dep-status { color: $secondary; }
  }
  
  &.dep-missing {
    background: rgba($error, 0.1);
    .dep-icon { color: $error; }
    .dep-status { color: $error; }
  }
}

.dep-icon {
  font-weight: 600;
  width: 16px;
  text-align: center;
}

.dep-name {
  flex: 1;
  color: $text-primary;
}

.dep-status {
  font-size: 10px;
}

// ── Animations ─────────────────────────────────────────────
@keyframes fade-up {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes card-enter {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes pulse-anim {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
</style>
