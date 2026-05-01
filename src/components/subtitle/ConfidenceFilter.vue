<script setup lang="ts">
/**
 * ConfidenceFilter - 置信度筛选标签组件
 */
import { useSubtitleStore } from '@/stores/subtitle'
import { CONFIDENCE_FILTER_LEVELS, type ConfidenceFilterValue } from '@/utils/confidence'

const subtitleStore = useSubtitleStore()

const levels = CONFIDENCE_FILTER_LEVELS

function getCount(level: ConfidenceFilterValue): number {
  if (level === 'all') return subtitleStore.subtitles.length
  if (level === 'high') return subtitleStore.confidenceStats.high
  if (level === 'mid') return subtitleStore.confidenceStats.mid
  return subtitleStore.confidenceStats.low
}

function getLabel(level: ConfidenceFilterValue): string {
  if (level === 'all') return '全部'
  if (level === 'high') return '高'
  if (level === 'mid') return '中'
  return '低'
}
</script>

<template>
  <div class="conf-filter">
    <span class="filter-label">质量</span>
    <div class="filter-group">
      <button
        v-for="level in levels"
        :key="level"
        :class="['filter-tab', `tab-${level}`, { active: subtitleStore.confidenceFilter === level }]"
        @click="subtitleStore.setConfidenceFilter(level)"
      >
        <span class="tab-dot"/>
        <span class="tab-label">{{ getLabel(level) }}</span>
        <span class="tab-count">{{ getCount(level) }}</span>
      </button>
    </div>
  </div>
</template>

<style lang="scss" scoped>
// Variables and mixins are automatically injected via vite.config.ts additionalData

.conf-filter {
  display: flex;
  align-items: center;
  gap: $space-2;
  padding: $space-2 $space-4;
  background: var(--bg-elevated);
  border-bottom: 1px solid var(--border);
  @include entrance(100ms);
}

.filter-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-muted);
  flex-shrink: 0;
}

.filter-group {
  display: flex;
  gap: $space-1;
}

.filter-tab {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  border-radius: $radius-full;
  font-size: 11px;
  font-weight: 600;
  border: 1.5px solid transparent;
  cursor: pointer;
  @include pressable;

  &.tab-all {
    color: var(--text-muted);
    background: var(--bg-surface);
    border-color: var(--border);

    &:hover {
      border-color: var(--border-light);
    }

    &.active {
      color: var(--text-primary);
      background: var(--bg-overlay);
      border-color: var(--text-muted);
    }
  }

  &.tab-high { @include conf-tab('high'); }
  &.tab-mid  { @include conf-tab('mid');  }
  &.tab-low  { @include conf-tab('low');  }

  .tab-dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: currentColor;
    opacity: 0.6;
  }

  .tab-label {
    line-height: 1;
  }

  .tab-count {
    font-family: $font-mono;
    font-size: 10px;
    opacity: 0.7;
  }
}
</style>
