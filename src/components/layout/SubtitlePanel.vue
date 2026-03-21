<script setup lang="ts">
import { ref } from 'vue'

const subtitles = ref([
  { id: '1', index: 1, start: '00:00:01', end: '00:00:03', text: '欢迎使用 VisionSub', confidence: 0.95 },
  { id: '2', index: 2, start: '00:00:04', end: '00:00:07', text: '专业的视频字幕提取工具', confidence: 0.92 },
  { id: '3', index: 3, start: '00:00:08', end: '00:00:12', text: '支持多种字幕格式导出', confidence: 0.88 },
])

const selectedId = ref<string | null>(null)
const searchQuery = ref('')

function selectSubtitle(id: string) {
  selectedId.value = id
}

function formatConfidence(val: number): string {
  return `${Math.round(val * 100)}%`
}
</script>

<template>
  <aside class="subtitle-panel">
    <div class="panel-header">
      <h3 class="panel-title">字幕列表</h3>
      <span class="subtitle-count">{{ subtitles.length }} 条</span>
    </div>
    
    <div class="search-bar">
      <span class="search-icon">🔍</span>
      <input
        v-model="searchQuery"
        type="text"
        placeholder="搜索字幕..."
        class="search-input"
      />
    </div>
    
    <div class="subtitle-list">
      <div
        v-for="sub in subtitles"
        :key="sub.id"
        :class="['subtitle-item', { selected: selectedId === sub.id }]"
        @click="selectSubtitle(sub.id)"
      >
        <div class="item-header">
          <span class="item-index">{{ sub.index }}</span>
          <span class="item-time">{{ sub.start }} → {{ sub.end }}</span>
          <span class="item-confidence" :style="{ color: sub.confidence > 0.9 ? '#30D158' : '#FFD60A' }">
            {{ formatConfidence(sub.confidence) }}
          </span>
        </div>
        <p class="item-text">{{ sub.text }}</p>
      </div>
    </div>
    
    <div class="panel-footer">
      <div class="export-info">
        <span class="export-icon">📤</span>
        <span class="export-text">导出格式</span>
      </div>
      <div class="format-chips">
        <span class="chip">SRT</span>
        <span class="chip">WebVTT</span>
        <span class="chip">ASS</span>
        <span class="chip">JSON</span>
      </div>
    </div>
  </aside>
</template>

<style lang="scss" scoped>
.subtitle-panel {
  width: $subtitle-panel-width;
  background: $bg-surface;
  border-left: 1px solid $border;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.panel-header {
  padding: $space-4;
  border-bottom: 1px solid $border;
  @include flex-between;
}

.panel-title {
  font-size: $text-base;
  font-weight: 600;
}

.subtitle-count {
  font-size: $text-sm;
  color: $text-muted;
  background: $bg-overlay;
  padding: 2px 8px;
  border-radius: $radius-full;
}

.search-bar {
  padding: $space-3 $space-4;
  display: flex;
  align-items: center;
  gap: $space-2;
  border-bottom: 1px solid $border;
}

.search-icon {
  font-size: 14px;
  opacity: 0.5;
}

.search-input {
  flex: 1;
  background: transparent;
  border: none;
  font-size: $text-sm;
  color: $text-primary;
  
  &::placeholder {
    color: $text-muted;
  }
  
  &:focus {
    outline: none;
  }
}

.subtitle-list {
  flex: 1;
  overflow-y: auto;
  padding: $space-2;
  @include custom-scrollbar;
}

.subtitle-item {
  padding: $space-3;
  border-radius: $radius-md;
  cursor: pointer;
  margin-bottom: $space-2;
  border: 1px solid transparent;
  transition: all $transition-fast;
  
  &:hover {
    background: $bg-overlay;
  }
  
  &.selected {
    background: $primary-dim;
    border-color: $primary;
  }
}

.item-header {
  display: flex;
  align-items: center;
  gap: $space-2;
  margin-bottom: $space-2;
}

.item-index {
  width: 24px;
  height: 24px;
  @include flex-center;
  background: $bg-overlay;
  border-radius: $radius-sm;
  font-size: $text-xs;
  font-weight: 600;
  color: $text-secondary;
}

.item-time {
  flex: 1;
  font-family: $font-display;
  font-size: $text-xs;
  color: $text-muted;
}

.item-confidence {
  font-family: $font-display;
  font-size: $text-xs;
  font-weight: 600;
}

.item-text {
  font-size: $text-sm;
  color: $text-primary;
  line-height: 1.4;
}

.panel-footer {
  padding: $space-4;
  border-top: 1px solid $border;
}

.export-info {
  display: flex;
  align-items: center;
  gap: $space-2;
  margin-bottom: $space-3;
  
  .export-text {
    font-size: $text-sm;
    color: $text-secondary;
  }
}

.format-chips {
  display: flex;
  gap: $space-2;
  flex-wrap: wrap;
}

.chip {
  padding: $space-1 $space-3;
  background: $bg-overlay;
  border: 1px solid $border;
  border-radius: $radius-full;
  font-size: $text-xs;
  font-weight: 500;
  color: $text-secondary;
  cursor: pointer;
  transition: all $transition-fast;
  
  &:hover {
    border-color: $primary;
    color: $primary;
  }
}
</style>
