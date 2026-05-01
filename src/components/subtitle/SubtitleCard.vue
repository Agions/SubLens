<script setup lang="ts">
/**
 * SubtitleCard - 单条字幕卡片组件
 * 职责：展示字幕信息、处理编辑、提供hover效果和操作按钮
 */
import { computed } from 'vue'
import type { SubtitleItem } from '@/types/subtitle'
import { useSubtitleStore } from '@/stores/subtitle'
import { useSubtitleList } from '@/composables/useSubtitleList'
import { getConfidenceLevel } from '@/utils/confidence'

const props = defineProps<{
  subtitle: SubtitleItem
}>()

const subtitleStore = useSubtitleStore()
const {
  hoveredId,
  editingId,
  editText,
  editStartTime,
  editEndTime,
  startEdit,
  cancelEdit,
  saveEdit,
  formatTimeShort,
  getConfidenceHeatmap,
} = useSubtitleList()

const isSelected = computed(() => subtitleStore.selectedId === props.subtitle.id)
const isHovered = computed(() => hoveredId.value === props.subtitle.id)
const isEditing = computed(() => editingId.value === props.subtitle.id)

function handleClick() {
  subtitleStore.selectSubtitle(props.subtitle.id)
}

function handleDoubleClick() {
  startEdit(props.subtitle.id)
}

function handleMouseEnter() {
  hoveredId.value = props.subtitle.id
}

function handleMouseLeave() {
  hoveredId.value = null
}

function handleDelete(e: Event) {
  e.stopPropagation()
  subtitleStore.deleteSubtitle(props.subtitle.id)
}

function handleEditStart(e: Event) {
  e.stopPropagation()
  startEdit(props.subtitle.id)
}
</script>

<template>
  <div
    :class="['subtitle-card', {
      'is-selected': isSelected,
      'is-edited': subtitle.edited
    }]"
    role="listitem"
    @click="handleClick"
    @dblclick="handleDoubleClick"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
  >
    <!-- Action buttons (visible on hover) -->
    <div class="card-actions">
      <button 
        class="card-action-btn" 
        @click="handleEditStart"
        title="编辑 (双击)"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
          <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
        </svg>
      </button>
      <button 
        class="card-action-btn" 
        @click="handleDelete"
        title="删除"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
        </svg>
      </button>
    </div>

    <!-- Header row -->
    <div class="card-header">
      <div class="card-meta">
        <span class="card-index">{{ subtitle.index }}</span>
        <span class="card-time">
          {{ formatTimeShort(subtitle.startTime) }}
          <svg class="time-arrow" viewBox="0 0 12 6" fill="none">
            <path d="M1 3h8M6 1l3 2-3 2" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          {{ formatTimeShort(subtitle.endTime) }}
        </span>
      </div>
      <div class="card-badges">
        <span :class="['conf-pill', `conf-${getConfidenceLevel(subtitle.confidence)}`]">
          {{ Math.round(subtitle.confidence * 100) }}%
        </span>
        <span class="frame-tag">#{{ subtitle.startFrame }}</span>
      </div>
    </div>

    <!-- Text -->
    <p class="card-text" :class="{ 'is-edited': subtitle.edited }">
      {{ subtitle.text }}
    </p>

    <!-- Thumbnail hover -->
    <Transition name="thumb">
      <div v-if="isHovered && subtitle.thumbnailUrls?.length" class="thumb-strip">
        <img
          v-for="(url, ti) in subtitle.thumbnailUrls.slice(0, 5)"
          :key="ti"
          :src="url"
          class="thumb-img"
          alt=""
        />
      </div>
    </Transition>

    <!-- Edit form -->
    <Transition name="edit">
      <div v-if="isEditing" class="edit-form" @click.stop>
        <div class="edit-time">
          <input v-model="editStartTime" type="text" class="time-input" placeholder="00:00:00,000"/>
          <svg class="time-arrow" viewBox="0 0 12 6" fill="none">
            <path d="M1 3h8M6 1l3 2-3 2" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <input v-model="editEndTime" type="text" class="time-input" placeholder="00:00:00,000"/>
        </div>
        <textarea
          v-model="editText"
          class="edit-textarea"
          rows="3"
          @keydown.esc="cancelEdit"
          @keydown.ctrl.enter="saveEdit"
        />
        <div class="edit-footer">
          <span class="edit-hint">Ctrl+Enter 保存 · Esc 取消</span>
          <div class="edit-actions">
            <button class="btn btn-ghost" @click="cancelEdit">取消</button>
            <button class="btn btn-primary" @click="saveEdit">保存</button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Confidence heatmap bar -->
    <div
      class="conf-heatmap"
      :style="{ background: getConfidenceHeatmap(subtitle.confidence) }"
      :title="`置信度: ${Math.round(subtitle.confidence * 100)}%`"
    />

    <!-- Selected indicator -->
    <div class="selected-bar"/>
  </div>
</template>

<style lang="scss" scoped>
// Variables and mixins are automatically injected via vite.config.ts additionalData

// ── Subtitle Card ───────────────────────────────────────────
.subtitle-card {
  position: relative;
  padding: $space-3;
  border-radius: var(--radius-lg);
  border: 1px solid var(--border);
  background: var(--bg-elevated);
  cursor: pointer;
  overflow: hidden;
  animation: card-in $duration-normal $ease-out-expo both;
  @include pressable;
  
  transition: 
    transform $duration-fast $ease-out-expo,
    border-color $duration-fast $ease-out-expo,
    box-shadow $duration-fast $ease-out-expo;

  &:hover {
    border-color: var(--border-light);
    transform: translateY(-2px);
    box-shadow: $shadow-md;
    
    .card-actions {
      opacity: 1;
      transform: translateX(0);
    }
  }

  &:active:not(.is-edited) {
    transform: scale(0.98);
  }

  &.is-selected {
    border-color: var(--primary);
    background: rgba($primary, 0.05);
    box-shadow: $glow-md;

    .selected-bar {
      opacity: 1;
    }
  }

  &.is-edited .card-text {
    font-style: italic;
    opacity: 0.85;
  }
}

// ── Card Action Buttons ─────────────────────────────────────
.card-actions {
  position: absolute;
  top: $space-2;
  right: $space-2;
  display: flex;
  gap: 4px;
  opacity: 0;
  transform: translateX(8px);
  transition: 
    opacity $duration-fast $ease-out-expo,
    transform $duration-fast $ease-out-expo;
  z-index: 2;
}

.card-action-btn {
  @include flex-center;
  width: 28px;
  height: 28px;
  border-radius: $radius-md;
  background: var(--bg-overlay);
  border: 1px solid var(--border);
  color: var(--text-muted);
  cursor: pointer;
  transition: all $duration-fast $ease-out-expo;

  &:hover {
    background: var(--bg-surface);
    border-color: var(--border-light);
    color: var(--text-primary);
  }

  &:active {
    transform: scale(0.92);
  }

  svg {
    width: 14px;
    height: 14px;
  }
}

// ── Card Header ─────────────────────────────────────────────
.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: $space-2;
}

.card-meta {
  display: flex;
  align-items: center;
  gap: $space-2;
}

.card-index {
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-overlay);
  border-radius: var(--radius-sm);
  font-family: $font-mono;
  font-size: 10px;
  font-weight: 700;
  color: var(--text-muted);
  flex-shrink: 0;
}

.card-time {
  display: flex;
  align-items: center;
  gap: 4px;
  font-family: $font-mono;
  font-size: 11px;
  color: var(--text-muted);

  .time-arrow {
    width: 12px;
    height: 12px;
    opacity: 0.4;
  }
}

.card-badges {
  display: flex;
  align-items: center;
  gap: $space-2;
}

// ── Confidence Pill ─────────────────────────────────────────
.conf-pill {
  @include conf-pill-base;

  &.conf-high { @include conf-badge('high'); }
  &.conf-mid  { @include conf-badge('mid');  }
  &.conf-low  { @include conf-badge('low');  }
}

.frame-tag {
  font-family: $font-mono;
  font-size: 10px;
  color: var(--text-muted);
}

// ── Card Text ───────────────────────────────────────────────
.card-text {
  font-size: $text-xs;
  color: var(--text-primary);
  line-height: $leading-normal;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-break: break-word;

  &.is-edited {
    font-style: italic;
    opacity: 0.85;
  }
}

// ── Thumbnail Strip ──────────────────────────────────────────
.thumb-strip {
  display: flex;
  gap: 4px;
  margin-top: $space-2;
  padding-top: $space-2;
  border-top: 1px solid var(--border);
}

.thumb-img {
  width: 44px;
  height: 26px;
  object-fit: cover;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  opacity: 0.75;
  transition: opacity $duration-fast $ease-out-expo;

  &:hover {
    opacity: 1;
  }
}

// ── Edit Form ───────────────────────────────────────────────
.edit-form {
  margin-top: $space-3;
  padding-top: $space-3;
  border-top: 1px solid var(--border);
  display: flex;
  @include flex-column;
  gap: $space-2;
}

.edit-time {
  display: flex;
  align-items: center;
  gap: $space-2;
}

.time-input {
  flex: 1;
  background: var(--bg-base);
  border: 1px solid var(--border);
  border-radius: $radius-md;
  padding: $space-2;
  font-family: $font-mono;
  font-size: 11px;
  color: var(--text-primary);
  transition: border-color $duration-fast $ease-out-expo;

  &:focus {
    outline: none;
    border-color: var(--primary);
    box-shadow: $glow-sm;
  }
}

.edit-textarea {
  width: 100%;
  background: var(--bg-base);
  border: 1px solid var(--border);
  border-radius: $radius-md;
  padding: $space-2;
  font-size: $text-xs;
  color: var(--text-primary);
  font-family: inherit;
  resize: none;
  line-height: $leading-normal;
  transition: border-color $duration-fast $ease-out-expo;

  &:focus {
    outline: none;
    border-color: var(--primary);
    box-shadow: $glow-sm;
  }
}

.edit-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.edit-hint {
  font-size: 10px;
  color: var(--text-muted);
}

.edit-actions {
  display: flex;
  gap: $space-2;
}

// ── Buttons ─────────────────────────────────────────────────
.btn {
  @include btn-base;
  padding: $space-1 $space-3;
}

.btn-ghost {
  @include btn-ghost;
}

.btn-primary {
  @include btn-primary;
}

// ── Confidence Heatmap ──────────────────────────────────────
.conf-heatmap {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  opacity: 0.7;
  border-radius: $radius-lg 0 0 $radius-lg;
  z-index: 0;
}

// ── Selected Indicator ─────────────────────────────────────
.selected-bar {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background: linear-gradient(180deg, var(--primary), $accent);
  opacity: 0;
  transition: opacity $duration-fast $ease-out-expo;
}

// ── Transitions ─────────────────────────────────────────────
.thumb-enter-active,
.thumb-leave-active {
  transition: opacity $duration-fast $ease-out-expo;
}
.thumb-enter-from,
.thumb-leave-to {
  opacity: 0;
}

.edit-enter-active,
.edit-leave-active {
  transition: opacity $duration-fast $ease-out-expo,
              transform $duration-fast $ease-out-expo;
}
.edit-enter-from,
.edit-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

// ── Animations ──────────────────────────────────────────────
@keyframes card-in {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
