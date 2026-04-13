<script setup lang="ts">
import { ref } from 'vue'
import { useOCRTab } from '@/composables/useOCRTab'

const { ocrEngines, languageOptions, showAdvanced, estimatedAccuracy } = useOCRTab()
const selectedLanguage = ref('ch')
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
          <span class="engine-name">{{ engine.name }}</span>
          <span v-if="engine.recommended" class="rec-chip">推荐</span>
        </button>
      </div>
    </div>

    <!-- Language Selection -->
    <div class="section">
      <div class="section-header">
        <span class="section-title">识别语言</span>
      </div>
      <div class="lang-chips">
        <button
          v-for="lang in languageOptions"
          :key="lang.value"
          :class="['lang-chip', { active: selectedLanguage === lang.value }]"
        >
          {{ lang.abbr }}
        </button>
      </div>
    </div>

    <!-- Advanced Settings Toggle -->
    <div class="section">
      <div class="section-header">
        <span class="section-title">高级选项</span>
        <button
          class="toggle-btn"
          :class="{ active: showAdvanced }"
          @click="showAdvanced = !showAdvanced"
        >
          {{ showAdvanced ? '收起' : '展开' }}
        </button>
      </div>
    </div>
  </div>
</template>
