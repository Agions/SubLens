<script setup lang="ts">
import { useProjectStore } from '@/stores/project'

const projectStore = useProjectStore()
</script>

<template>
  <div class="tab-content">
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
</template>
