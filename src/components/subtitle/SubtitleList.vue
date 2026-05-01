<script setup lang="ts">
/**
 * SubtitleList - 字幕列表容器组件
 * 
 * 职责：
 * - 字幕搜索和筛选
 * - 字幕卡片列表展示
 * - 分页加载
 * - 空状态和骨架屏
 * 
 * 拆分自原来的 1272 行组件
 */
import { watch } from 'vue'
import { useSubtitleStore } from '@/stores/subtitle'
import { useSubtitleList } from '@/composables/useSubtitleList'

// 子组件
import SubtitleCard from './SubtitleCard.vue'
import SkeletonCard from './SkeletonCard.vue'
import EmptyState from './EmptyState.vue'
import ConfidenceFilter from './ConfidenceFilter.vue'
import BatchActionBar from './BatchActionBar.vue'
import SubtitleListFooter from './SubtitleListFooter.vue'

const subtitleStore = useSubtitleStore()
const {
  displayCount,
  visibleSubtitles,
  hasMore,
  totalCount,
  filteredCount,
  isFiltered,
  lowConfCount,
  loadMore,
  resetDisplayCount,
} = useSubtitleList()

// Reset pagination when filter changes
watch(() => subtitleStore.confidenceFilter, resetDisplayCount)
</script>

<template>
  <aside class="subtitle-panel">
    <!-- ── Header ──────────────────────────────────── -->
    <header class="panel-header">
      <div class="header-left">
        <h3 class="panel-title">字幕列表</h3>
        <span class="count-badge">
          <template v-if="isFiltered">{{ filteredCount }} / {{ totalCount }}</template>
          <template v-else>{{ totalCount }}</template>
          条
        </span>
        
        <!-- Low-confidence alert -->
        <button
          v-if="lowConfCount > 0"
          class="alert-badge"
          :class="{ active: subtitleStore.confidenceFilter === 'low' }"
          @click="subtitleStore.setConfidenceFilter('low')"
          title="查看低置信度字幕"
        >
          <svg viewBox="0 0 12 12" fill="none" class="alert-icon">
            <path d="M6 1L1 10h10L6 1z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/>
            <path d="M6 5v2M6 8.5v.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
          </svg>
          {{ lowConfCount }} 低置信度
        </button>
      </div>

      <div class="header-actions">
        <button
          class="icon-btn"
          :disabled="!subtitleStore.canUndo"
          @click="subtitleStore.undo()"
          title="撤销 (Ctrl+Z)"
        >
          <svg viewBox="0 0 20 20" fill="none" class="icon-svg">
            <path d="M4 9H14a3 3 0 010 6H8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            <path d="M7 6L4 9l3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
        <button
          class="icon-btn"
          :disabled="!subtitleStore.canRedo"
          @click="subtitleStore.redo()"
          title="重做 (Ctrl+Y)"
        >
          <svg viewBox="0 0 20 20" fill="none" class="icon-svg">
            <path d="M16 9H6a3 3 0 000 6h6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            <path d="M13 6l3 3-3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </div>
    </header>

    <!-- ── Search ─────────────────────────────────── -->
    <div class="search-bar">
      <svg class="search-icon" viewBox="0 0 20 20" fill="none">
        <circle cx="9" cy="9" r="6" stroke="currentColor" stroke-width="1.5"/>
        <path d="M15 15l-2-2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      </svg>
      <input
        id="subtitle-search-input"
        v-model="subtitleStore.searchQuery"
        type="text"
        placeholder="搜索字幕内容..."
        class="search-input"
        aria-label="搜索字幕内容"
      />
      <span v-if="subtitleStore.searchQuery" class="search-count">
        {{ filteredCount }} 条
      </span>
    </div>

    <!-- ── Confidence Filter ──────────────────────── -->
    <ConfidenceFilter v-if="totalCount > 0" />

    <!-- ── Subtitle List ──────────────────────────── -->
    <div class="subtitle-list" role="list">
      <!-- Skeleton -->
      <template v-if="subtitleStore.isExtracting">
        <SkeletonCard v-for="i in 5" :key="i" />
      </template>

      <!-- Cards -->
      <template v-else>
        <SubtitleCard
          v-for="sub in visibleSubtitles"
          :key="sub.id"
          :subtitle="sub"
        />

        <!-- Load more button -->
        <button
          v-if="hasMore"
          class="load-more-btn"
          @click="loadMore"
        >
          <svg viewBox="0 0 20 20" fill="none" class="load-icon">
            <path d="M5 10h10M5 10l3-3M5 10l3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          加载更多 ({{ subtitleStore.filteredSubtitles.length - displayCount }} 剩余)
        </button>
      </template>

      <!-- Empty state -->
      <EmptyState
        v-if="!subtitleStore.isExtracting && filteredCount === 0"
        :has-search-query="!!subtitleStore.searchQuery"
      />
    </div>

    <!-- ── Footer ─────────────────────────────────── -->
    <footer class="panel-footer">
      <!-- Batch action -->
      <BatchActionBar />

      <!-- Format toggles + delete -->
      <SubtitleListFooter />
    </footer>
  </aside>
</template>

<style lang="scss" scoped>
// Variables and mixins are automatically injected via vite.config.ts additionalData

.subtitle-panel {
  width: $subtitle-panel-width;
  background: var(--bg-surface);
  border-left: 1px solid var(--border);
  display: flex;
  @include flex-column;
  overflow: hidden;
}

// ── Header ──────────────────────────────────────────────────
.panel-header {
  padding: $space-4;
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  @include entrance;
}

.header-left {
  display: flex;
  align-items: center;
  gap: $space-2;
}

.panel-title {
  font-size: $text-xs;
  font-weight: 700;
  color: var(--text-primary);
}

.count-badge {
  @include badge;
}

.alert-badge {
  @include badge(rgba($warning, 0.1), $warning);
  cursor: pointer;
  @include pressable;

  &:hover {
    background: rgba($warning, 0.15);
  }

  &.active {
    background: rgba($warning, 0.2);
    border-color: $warning;
  }

  .alert-icon {
    width: 12px;
    height: 12px;
  }
}

.header-actions {
  display: flex;
  gap: $space-1;
}

.icon-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-md);
  color: var(--text-muted);
  @include pressable;

  &:hover:not(:disabled) {
    background: var(--bg-overlay);
    color: var(--text-primary);
  }

  &:disabled {
    opacity: 0.3;
  }

  .icon-svg {
    width: 16px;
    height: 16px;
  }
}

// ── Search ──────────────────────────────────────────────────
.search-bar {
  padding: $space-3 $space-4;
  display: flex;
  align-items: center;
  gap: $space-2;
  border-bottom: 1px solid var(--border);
  @include entrance(50ms);
}

.search-icon {
  width: 16px;
  height: 16px;
  color: var(--text-muted);
  flex-shrink: 0;
}

.search-input {
  flex: 1;
  background: transparent;
  border: none;
  font-size: $text-xs;
  color: var(--text-primary);

  &::placeholder {
    color: var(--text-muted);
  }

  &:focus {
    outline: none;
  }
}

.search-count {
  font-size: 11px;
  color: var(--text-muted);
  flex-shrink: 0;
}

// ── Subtitle List ───────────────────────────────────────────
.subtitle-list {
  flex: 1;
  overflow-y: auto;
  padding: $space-3;
  display: flex;
  @include flex-column;
  gap: $space-2;
  @include custom-scrollbar;
}

// ── Load More ──────────────────────────────────────────────
.load-more-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: $space-2;
  width: 100%;
  padding: $space-3 $space-4;
  margin-top: $space-2;
  background: $bg-elevated;
  border: 1px dashed $border;
  border-radius: $radius-md;
  color: $text-secondary;
  font-size: $text-sm;
  cursor: pointer;
  transition: all $transition-base;
  
  .load-icon {
    width: 16px;
    height: 16px;
  }
  
  &:hover {
    background: $bg-overlay;
    border-color: $primary;
    color: $primary;
  }
}

// ── Footer ─────────────────────────────────────────────────
.panel-footer {
  padding: $space-3 $space-4;
  border-top: 1px solid var(--border);
  @include entrance(100ms);
  display: flex;
  @include flex-column;
  gap: $space-2;
}
</style>
