<script setup lang="ts">
import { inject } from 'vue'
import { useProgressTab } from '@/composables/useProgressTab'
import { useSubtitleStore } from '@/stores/subtitle'

interface ExtractionSession {
  isExtracting: { value: boolean }
}

const subtitleExtractor = inject<ExtractionSession | null>('subtitleExtractor')
const { extractSpeed } = useProgressTab()
const subtitleStore = useSubtitleStore()

const isExtracting = subtitleExtractor?.isExtracting ?? { value: false }
</script>

<template>
  <div class="tab-content">
    <div class="section">
      <div class="section-header">
        <span class="section-title">处理进度</span>
        <span v-if="isExtracting.value" class="extracting-badge">
          <span class="pulse-dot"/>
          提取中
        </span>
      </div>

      <!-- Placeholder for progress ring - requires extraction session -->
      <div class="progress-placeholder">
        <span class="placeholder-text">打开视频后显示进度</span>
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
          <span class="stat-value">{{ extractSpeed }}</span>
          <span class="stat-label">处理速度</span>
        </div>
      </div>
    </div>
  </div>
</template>
