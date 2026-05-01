<script setup lang="ts">
/**
 * EmptyState - 空状态展示组件
 */
defineProps<{
  hasSearchQuery: boolean
}>()
</script>

<template>
  <Transition name="fade">
    <div class="empty-state">
      <svg viewBox="0 0 80 60" fill="none" class="empty-svg">
        <rect x="10" y="10" width="60" height="8" rx="4" fill="currentColor" opacity="0.12"/>
        <rect x="10" y="24" width="40" height="6" rx="3" fill="currentColor" opacity="0.08"/>
        <rect x="10" y="36" width="50" height="6" rx="3" fill="currentColor" opacity="0.06"/>
        <rect x="10" y="48" width="30" height="6" rx="3" fill="currentColor" opacity="0.04"/>
        <circle cx="60" cy="44" r="12" fill="currentColor" opacity="0.05"/>
        <path d="M56 44h8M60 40v8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" opacity="0.3"/>
      </svg>
      <p class="empty-title">
        {{ hasSearchQuery ? '没有找到匹配的字幕' : '暂无字幕数据' }}
      </p>
      <p class="empty-hint">
        {{ hasSearchQuery ? '尝试调整搜索关键词' : '导入视频并开始提取字幕' }}
      </p>
    </div>
  </Transition>
</template>

<style lang="scss" scoped>
// Variables and mixins are automatically injected via vite.config.ts additionalData

.empty-state {
  display: flex;
  @include flex-column;
  align-items: center;
  justify-content: center;
  padding: $space-10 $space-4;
  text-align: center;
}

.empty-svg {
  width: 80px;
  height: 60px;
  color: var(--text-muted);
  margin-bottom: $space-4;
  opacity: 0.5;
}

.empty-title {
  font-size: $text-xs;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: $space-2;
}

.empty-hint {
  font-size: 12px;
  color: var(--text-muted);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity $duration-normal $ease-out-expo;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
