<script setup lang="ts">
import { useROITab } from '@/composables/useROITab'

const { roiPresets, selectedROI, selectPreset } = useROITab()
</script>

<template>
  <div class="tab-content">
    <div class="section">
      <div class="section-header">
        <span class="section-title">字幕区域预设</span>
      </div>

      <div class="roi-cards">
        <button
          v-for="preset in roiPresets"
          :key="preset.id"
          :class="['roi-card', { active: selectedROI?.id === preset.id }]"
          @click="selectPreset(preset.id)"
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
            <svg v-if="selectedROI?.id === preset.id" viewBox="0 0 12 12" fill="none">
              <path d="M2 6l3 3 5-5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </span>
        </button>
      </div>
    </div>

    <div class="section" v-if="selectedROI">
      <div class="section-header">
        <span class="section-title">当前区域详情</span>
      </div>
      <div class="roi-detail-card">
        <div class="detail-row">
          <span class="detail-label">类型</span>
          <span class="detail-value">{{ selectedROI.type }}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">坐标</span>
          <span class="detail-value">X {{ selectedROI.x.toFixed(1) }}% · Y {{ selectedROI.y.toFixed(1) }}%</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">尺寸</span>
          <span class="detail-value">W {{ selectedROI.width.toFixed(1) }}% · H {{ selectedROI.height.toFixed(1) }}%</span>
        </div>
      </div>
    </div>
  </div>
</template>
