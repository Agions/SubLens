<script setup lang="ts">
import { inject } from 'vue'

const openExportDialog = inject<() => void>('openExportDialog')

function openExport() {
  openExportDialog?.()
}
</script>

<template>
  <div class="tab-content">
    <div class="section">
      <div class="section-header">
        <span class="section-title">导出格式</span>
      </div>
      <!-- Export format cards rendered by parent SidePanel -->
      <button class="export-action-btn" @click="openExport">
        <svg class="export-btn-icon" viewBox="0 0 20 20" fill="none">
          <path d="M3 14v3h14v-3M10 3v10m0-10L6 7m4-4l4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        导出字幕文件
      </button>
    </div>
  </div>
</template>
