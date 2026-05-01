<script setup lang="ts">
/**
 * BatchActionBar - 批量操作栏组件
 */
import { useSubtitleStore } from '@/stores/subtitle'
const subtitleStore = useSubtitleStore()
</script>

<template>
  <Transition name="slide">
    <div v-if="subtitleStore.confidenceFilter === 'low'" class="batch-bar">
      <span class="batch-info">
        <svg viewBox="0 0 16 16" fill="none" class="batch-icon">
          <path d="M8 3v5l3 2" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
          <circle cx="8" cy="8" r="6.5" stroke="currentColor" stroke-width="1.3"/>
        </svg>
        <strong>{{ subtitleStore.confidenceStats.low }}</strong> 条低置信度待检查
      </span>
      <div class="batch-actions">
        <button
          class="btn btn-danger"
          @click="subtitleStore.batchDeleteLowConfidence()"
        >
          删除全部
        </button>
        <button
          class="btn btn-ghost"
          @click="subtitleStore.setConfidenceFilter('all')"
        >
          清除
        </button>
      </div>
    </div>
  </Transition>
</template>

<style lang="scss" scoped>
// Variables and mixins are automatically injected via vite.config.ts additionalData

.batch-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: $space-3;
  padding: $space-2 $space-3;
  background: rgba($warning, 0.06);
  border: 1px solid rgba($warning, 0.2);
  border-radius: var(--radius-md);
}

.batch-info {
  display: flex;
  align-items: center;
  gap: $space-2;
  font-size: 12px;
  color: var(--text-secondary);

  strong {
    color: $warning;
    font-weight: 700;
  }

  .batch-icon {
    width: 14px;
    height: 14px;
    color: $warning;
    flex-shrink: 0;
  }
}

.batch-actions {
  display: flex;
  gap: $space-2;
}

.btn {
  @include btn-base;
  padding: $space-1 $space-3;
}

.btn-ghost {
  @include btn-ghost;
}

.btn-danger {
  @include btn-danger;
}

.slide-enter-active,
.slide-leave-active {
  transition: opacity $duration-normal $ease-out-expo,
              transform $duration-normal $ease-out-expo;
}
.slide-enter-from,
.slide-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
