<script setup lang="ts">
import { ref, computed } from 'vue'
import { useOCRTab } from '@/composables/useOCRTab'
import { useSubtitleStore } from '@/stores/subtitle'

const {
  ocrEngines,
  languageOptions,
  showAdvanced,
  multiPass,
  postProcess,
  mergeSubtitles,
  mergeThreshold,
  sceneThreshold,
  frameInterval,
  estimatedAccuracy,
  setLanguage,
  toggleMultiPass,
  togglePostProcess,
  toggleMergeSubtitles,
  setMergeThreshold,
  setSceneThreshold,
  setFrameInterval,
} = useOCRTab()

const subtitleStore = useSubtitleStore()
const confidenceThreshold = ref(70)

const belowThresholdCount = computed(() =>
  subtitleStore.subtitles.filter(s => s.confidence < confidenceThreshold.value / 100).length
)
</script>

<template>
  <div class="tab-content ocr-tab">
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
          class="engine-card"
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
          </div>
          <div class="engine-stats">
            <div class="stat-item">
              <span class="stat-label">速度</span>
              <span class="stat-value">{{ engine.speed }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">准确</span>
              <span class="stat-value">{{ engine.accuracy }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">语言</span>
              <span class="stat-value">{{ engine.langs }}+</span>
            </div>
          </div>
          <p class="engine-desc-text">{{ engine.description }}</p>
        </button>
      </div>
    </div>

    <!-- Language Selection -->
    <div class="section">
      <div class="section-header">
        <span class="section-title">识别语言</span>
        <span class="lang-count">{{ languageOptions.length }} 种</span>
      </div>
      <div class="lang-chips">
        <button
          v-for="lang in languageOptions"
          :key="lang.value"
          :class="['lang-chip', { active: languageOptions.includes(lang) }]"
          @click="setLanguage(lang.value)"
        >
          <span>{{ lang.abbr }}</span>
          <span>{{ lang.label }}</span>
        </button>
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

      <div v-if="showAdvanced" class="advanced-panel">
        <!-- Multi-pass OCR -->
        <div class="option-row">
          <div class="option-info">
            <span class="option-name">多通道 OCR</span>
            <span class="option-hint">多次识别取最优结果</span>
          </div>
          <button
            :class="['toggle-switch', { on: multiPass }]"
            @click="toggleMultiPass"
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
            :class="['toggle-switch', { on: postProcess }]"
            @click="togglePostProcess"
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
            :class="['toggle-switch', { on: mergeSubtitles }]"
            @click="toggleMergeSubtitles"
          >
            <span class="toggle-thumb"/>
          </button>
        </div>

        <!-- Merge Threshold -->
        <div v-if="mergeSubtitles" class="option-sub-row">
          <span class="sub-label">相似度阈值</span>
          <div class="slider-track small">
            <div class="slider-fill" :style="{ width: mergeThreshold * 100 + '%' }"/>
            <input type="range" :value="mergeThreshold * 100" min="50" max="100" @input="setMergeThreshold(Number(($event.target as HTMLInputElement).value) / 100)"/>
          </div>
          <span class="sub-value">{{ Math.round(mergeThreshold * 100) }}%</span>
        </div>

        <!-- Scene Detection Sensitivity -->
        <div class="option-row">
          <div class="option-info">
            <span class="option-name">场景检测灵敏度</span>
            <span class="option-hint">越高越敏感，跳过更多相似帧</span>
          </div>
          <span class="sensitivity-val">{{ Math.round(sceneThreshold * 100) }}%</span>
        </div>
        <div class="slider-track">
          <div class="slider-fill" :style="{ width: sceneThreshold * 100 + '%' }"/>
          <input type="range" :value="sceneThreshold * 100" min="0" max="100" @input="setSceneThreshold(Number(($event.target as HTMLInputElement).value) / 100)"/>
        </div>

        <!-- Frame Interval -->
        <div class="option-row" style="margin-top: 12px">
          <div class="option-info">
            <span class="option-name">帧采样间隔</span>
            <span class="option-hint">每隔 N 帧处理一次（1=全部）</span>
          </div>
          <div class="stepper">
            <button class="stepper-btn" @click="setFrameInterval(Math.max(1, frameInterval - 1))">
              <svg viewBox="0 0 10 10" fill="none"><path d="M2 5h6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
            </button>
            <span class="stepper-val">{{ frameInterval }}</span>
            <button class="stepper-btn" @click="setFrameInterval(Math.min(10, frameInterval + 1))">
              <svg viewBox="0 0 10 10" fill="none"><path d="M5 2v6M2 5h6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
            </button>
          </div>
        </div>
      </div>
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
        <input type="range" v-model.number="confidenceThreshold" min="0" max="100" />
      </div>
      <div class="slider-labels">
        <span>0%（接受全部）</span>
        <span>50%</span>
        <span>100%（仅高置信度）</span>
      </div>
      <div v-if="subtitleStore.totalCount > 0" class="threshold-hint">
        当前设置下，将排除 <strong>{{ belowThresholdCount }}</strong> 条低于 {{ confidenceThreshold }}% 的字幕
      </div>
    </div>
  </div>
</template>
