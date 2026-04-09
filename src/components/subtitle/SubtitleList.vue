<script setup lang="ts">
import { ref, computed } from 'vue'
import { useSubtitleStore } from '@/stores/subtitle'
import { useProjectStore } from '@/stores/project'
import type { ExportFormats } from '@/types/subtitle'
import { getConfidenceLevel } from '@/types/video'

const subtitleStore = useSubtitleStore()
const projectStore = useProjectStore()

const editingId = ref<string | null>(null)
const editText = ref('')

const exportFormatKeys = Object.keys(subtitleStore.exportFormats) as (keyof ExportFormats)[]
const editStartTime = ref('')
const editEndTime = ref('')
const hoveredId = ref<string | null>(null)

function startEdit(id: string) {
  const sub = subtitleStore.subtitles.find(s => s.id === id)
  if (!sub) return
  editingId.value = id
  editText.value = sub.text
  editStartTime.value = formatTimeSrt(sub.startTime)
  editEndTime.value = formatTimeSrt(sub.endTime)
}

function cancelEdit() {
  editingId.value = null
  editText.value = ''
  editStartTime.value = ''
  editEndTime.value = ''
}

function saveEdit() {
  if (!editingId.value) return
  const sub = subtitleStore.subtitles.find(s => s.id === editingId.value)
  if (!sub) return
  if (editText.value !== sub.text) {
    subtitleStore.editSubtitle(editingId.value, 'text', sub.text, editText.value)
  }
  const newStart = parseTime(editStartTime.value)
  const newEnd = parseTime(editEndTime.value)
  if (newStart !== sub.startTime && newStart >= 0) {
    subtitleStore.editSubtitle(editingId.value, 'startTime', sub.startTime, newStart)
  }
  if (newEnd !== sub.endTime && newEnd >= 0) {
    subtitleStore.editSubtitle(editingId.value, 'endTime', sub.endTime, newEnd)
  }
  cancelEdit()
}

function handleSubtitleClick(id: string) {
  subtitleStore.selectSubtitle(id)
  const sub = subtitleStore.subtitles.find(s => s.id === id)
  if (sub && projectStore.videoMeta) {
    projectStore.setCurrentFrame(sub.startFrame)
  }
}

function deleteSelected() {
  if (subtitleStore.selectedId) {
    subtitleStore.deleteSubtitle(subtitleStore.selectedId)
  }
}

function formatTimeSrt(seconds: number): string {
  const hrs = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  const ms = Math.floor((seconds % 1) * 1000)
  const pad = (n: number, len = 2) => n.toString().padStart(len, '0')
  return `${pad(hrs)}:${pad(mins)}:${pad(secs)},${pad(ms, 3)}`
}

function formatTimeShort(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  const ms = Math.floor((seconds % 1) * 10)
  return `${mins}:${secs.toString().padStart(2, '0')}.${ms}`
}

function parseTime(timeStr: string): number {
  const match = timeStr.match(/(\d+):(\d+):(\d+)[,.](\d+)/)
  if (!match) return -1
  const [, hrs, mins, secs, ms] = match
  return parseInt(hrs) * 3600 + parseInt(mins) * 60 + parseInt(secs) + parseInt(ms) / 1000
}

const lowConfCount = computed(() => subtitleStore.confidenceStats.low)
const totalCount = computed(() => subtitleStore.confidenceStats.total)
const filteredCount = computed(() => subtitleStore.filteredSubtitles.length)
const isFiltered = computed(() => subtitleStore.confidenceFilter !== 'all')
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
        v-model="subtitleStore.searchQuery"
        type="text"
        placeholder="搜索字幕内容..."
        class="search-input"
      />
      <span v-if="subtitleStore.searchQuery" class="search-count">
        {{ filteredCount }} 条
      </span>
    </div>

    <!-- ── Confidence Filter ──────────────────────── -->
    <div class="conf-filter" v-if="totalCount > 0">
      <span class="filter-label">质量</span>
      <div class="filter-group">
        <button
          v-for="level in (['all', 'high', 'mid', 'low'] as const)"
          :key="level"
          :class="['filter-tab', `tab-${level}`, { active: subtitleStore.confidenceFilter === level }]"
          @click="subtitleStore.setConfidenceFilter(level)"
        >
          <span class="tab-dot"/>
          <span class="tab-label">
            {{ level === 'all' ? '全部' : level === 'high' ? '高' : level === 'mid' ? '中' : '低' }}
          </span>
          <span class="tab-count">
            {{ level === 'all' ? totalCount
              : level === 'high' ? subtitleStore.confidenceStats.high
              : level === 'mid' ? subtitleStore.confidenceStats.mid
              : subtitleStore.confidenceStats.low }}
          </span>
        </button>
      </div>
    </div>

    <!-- ── Subtitle List ──────────────────────────── -->
    <div class="subtitle-list" role="list">
      <!-- Skeleton -->
      <template v-if="subtitleStore.isExtracting">
        <div v-for="i in 5" :key="i" class="skeleton-card">
          <div class="skeleton-header">
            <div class="sk sk-index"/>
            <div class="sk sk-time"/>
            <div class="sk sk-badge"/>
          </div>
          <div class="sk sk-text"/>
          <div class="sk sk-text sk-short"/>
        </div>
      </template>

      <!-- Cards -->
      <template v-else>
        <div
          v-for="(sub, idx) in subtitleStore.filteredSubtitles"
          :key="sub.id"
          :class="['subtitle-card', {
            'is-selected': subtitleStore.selectedId === sub.id,
            'is-edited': sub.edited
          }]"
          role="listitem"
          @click="handleSubtitleClick(sub.id)"
          @dblclick="startEdit(sub.id)"
          @mouseenter="hoveredId = sub.id"
          @mouseleave="hoveredId = null"
          :style="{ animationDelay: `${Math.min(idx * 25, 300)}ms` }"
        >
          <!-- Header row -->
          <div class="card-header">
            <div class="card-meta">
              <span class="card-index">{{ sub.index }}</span>
              <span class="card-time">
                {{ formatTimeShort(sub.startTime) }}
                <svg class="time-arrow" viewBox="0 0 12 6" fill="none">
                  <path d="M1 3h8M6 1l3 2-3 2" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                {{ formatTimeShort(sub.endTime) }}
              </span>
            </div>
            <div class="card-badges">
              <span :class="['conf-pill', `conf-${getConfidenceLevel(sub.confidence)}`]">
                {{ Math.round(sub.confidence * 100) }}%
              </span>
              <span class="frame-tag">#{{ sub.startFrame }}</span>
            </div>
          </div>

          <!-- Text -->
          <p class="card-text" :class="{ 'is-edited': sub.edited }">
            {{ sub.text }}
          </p>

          <!-- Thumbnail hover -->
          <Transition name="thumb">
            <div v-if="hoveredId === sub.id && sub.thumbnailUrls?.length" class="thumb-strip">
              <img
                v-for="(url, ti) in sub.thumbnailUrls.slice(0, 5)"
                :key="ti"
                :src="url"
                class="thumb-img"
                alt=""
              />
            </div>
          </Transition>

          <!-- Edit form -->
          <Transition name="edit">
            <div v-if="editingId === sub.id" class="edit-form" @click.stop>
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

          <!-- Selected indicator -->
          <div class="selected-bar"/>
        </div>
      </template>

      <!-- Empty state -->
      <Transition name="fade">
        <div v-if="!subtitleStore.isExtracting && filteredCount === 0" class="empty-state">
          <svg viewBox="0 0 80 60" fill="none" class="empty-svg">
            <rect x="10" y="10" width="60" height="8" rx="4" fill="currentColor" opacity="0.12"/>
            <rect x="10" y="24" width="40" height="6" rx="3" fill="currentColor" opacity="0.08"/>
            <rect x="10" y="36" width="50" height="6" rx="3" fill="currentColor" opacity="0.06"/>
            <rect x="10" y="48" width="30" height="6" rx="3" fill="currentColor" opacity="0.04"/>
            <circle cx="60" cy="44" r="12" fill="currentColor" opacity="0.05"/>
            <path d="M56 44h8M60 40v8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" opacity="0.3"/>
          </svg>
          <p class="empty-title">
            {{ subtitleStore.searchQuery ? '没有找到匹配的字幕' : '暂无字幕数据' }}
          </p>
          <p class="empty-hint">
            {{ subtitleStore.searchQuery ? '尝试调整搜索关键词' : '导入视频并开始提取字幕' }}
          </p>
        </div>
      </Transition>
    </div>

    <!-- ── Footer ─────────────────────────────────── -->
    <footer class="panel-footer">
      <!-- Batch action -->
      <Transition name="slide">
        <div v-if="subtitleStore.confidenceFilter === 'low'" class="batch-bar">
          <span class="batch-info">
            <svg viewBox="0 0 16 16" fill="none" class="batch-icon">
              <path d="M8 3v5l3 2" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
              <circle cx="8" cy="8" r="6.5" stroke="currentColor" stroke-width="1.3"/>
            </svg>
            <strong>{{ lowConfCount }}</strong> 条低置信度待检查
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

      <!-- Format toggles + delete -->
      <div class="footer-row">
        <div class="format-group">
          <label
            v-for="key in exportFormatKeys"
            :key="key"
            class="fmt-toggle"
          >
            <input
              type="checkbox"
              :checked="subtitleStore.exportFormats[key]"
              @change="(subtitleStore.exportFormats as Record<string, boolean>)[key] = !subtitleStore.exportFormats[key]"
            />
            <span class="fmt-label">{{ key.toUpperCase() }}</span>
          </label>
        </div>
        <button
          class="delete-btn"
          :disabled="!subtitleStore.selectedId"
          @click="deleteSelected"
          title="删除选中字幕"
        >
          <svg viewBox="0 0 20 20" fill="none" class="del-icon">
            <path d="M4 6h12M8 6V4h4v2M5 6v9h10V6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span>删除</span>
        </button>
      </div>
    </footer>
  </aside>
</template>

<style lang="scss" scoped>
.subtitle-panel {
  width: $subtitle-panel-width;
  background: var(--bg-surface);
  border-left: 1px solid var(--border);
  display: flex;
  flex-direction: column;
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
  font-size: 11px;
  font-weight: 600;
  background: rgba($primary, 0.1);
  color: var(--primary);
  padding: 2px 8px;
  border-radius: $radius-full;
  border: 1px solid rgba($primary, 0.2);
}

.alert-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 600;
  background: rgba($warning, 0.1);
  color: $warning;
  padding: 2px 8px;
  border-radius: $radius-full;
  border: 1px solid rgba($warning, 0.2);
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

// ── Confidence Filter ───────────────────────────────────────
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

  &.tab-high {
    color: $conf-high;
    background: rgba($conf-high, 0.08);
    border-color: rgba($conf-high, 0.2);

    &:hover {
      background: rgba($conf-high, 0.14);
    }

    &.active {
      background: rgba($conf-high, 0.18);
      border-color: $conf-high;
      box-shadow: 0 0 0 1px rgba($conf-high, 0.2);
    }
  }

  &.tab-mid {
    color: $conf-mid;
    background: rgba($conf-mid, 0.08);
    border-color: rgba($conf-mid, 0.2);

    &:hover {
      background: rgba($conf-mid, 0.14);
    }

    &.active {
      background: rgba($conf-mid, 0.18);
      border-color: $conf-mid;
      box-shadow: 0 0 0 1px rgba($conf-mid, 0.2);
    }
  }

  &.tab-low {
    color: $conf-low;
    background: rgba($conf-low, 0.08);
    border-color: rgba($conf-low, 0.2);

    &:hover {
      background: rgba($conf-low, 0.14);
    }

    &.active {
      background: rgba($conf-low, 0.18);
      border-color: $conf-low;
      box-shadow: 0 0 0 1px rgba($conf-low, 0.2);
    }
  }

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

// ── Subtitle List ───────────────────────────────────────────
.subtitle-list {
  flex: 1;
  overflow-y: auto;
  padding: $space-3;
  display: flex;
  flex-direction: column;
  gap: $space-2;
  @include custom-scrollbar;
}

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

  &:hover {
    border-color: var(--border-light);
    box-shadow: $shadow-sm;
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
  font-family: $font-mono;
  font-size: 10px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: $radius-full;
  letter-spacing: 0.02em;

  &.conf-high {
    background: rgba($conf-high, 0.12);
    color: $conf-high;
    border: 1px solid rgba($conf-high, 0.25);
  }

  &.conf-mid {
    background: rgba($conf-mid, 0.12);
    color: $conf-mid;
    border: 1px solid rgba($conf-mid, 0.25);
  }

  &.conf-low {
    background: rgba($conf-low, 0.12);
    color: $conf-low;
    border: 1px solid rgba($conf-low, 0.25);
  }
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
  flex-direction: column;
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
  border-radius: var(--radius-md);
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
  border-radius: var(--radius-md);
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

.btn-danger {
  @include btn-danger;
}

// ── Skeleton ─────────────────────────────────────────────────
.skeleton-card {
  padding: $space-3;
  border-radius: var(--radius-lg);
  border: 1px solid var(--border);
  background:
    linear-gradient(90deg,
      var(--bg-elevated) 0%,
      var(--bg-overlay) 40%,
      var(--bg-elevated) 80%);
  background-size: 200% 100%;
  animation: skeleton-shimmer 1.5s cubic-bezier(0.16, 1, 0.3, 1) infinite;

  .skeleton-header {
    display: flex;
    gap: $space-2;
    margin-bottom: $space-2;
  }

  .sk {
    background: var(--bg-overlay);
    border-radius: var(--radius-sm);

    &-index { width: 22px; height: 22px; flex-shrink: 0; }
    &-time { width: 72px; height: 12px; }
    &-badge { width: 32px; height: 16px; border-radius: $radius-full; margin-left: auto; }
    &-text { width: 90%; height: 12px; margin-bottom: 6px; }
    &-short { width: 55%; }
  }
}

// ── Empty State ─────────────────────────────────────────────
.empty-state {
  display: flex;
  flex-direction: column;
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

// ── Footer ─────────────────────────────────────────────────
.panel-footer {
  padding: $space-3 $space-4;
  border-top: 1px solid var(--border);
  @include entrance(100ms);
  display: flex;
  flex-direction: column;
  gap: $space-2;
}

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

.footer-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.format-group {
  display: flex;
  gap: $space-3;
}

.fmt-toggle {
  display: flex;
  align-items: center;
  gap: 5px;
  cursor: pointer;

  input[type="checkbox"] {
    width: 13px;
    height: 13px;
    accent-color: var(--primary);
    cursor: pointer;
  }

  .fmt-label {
    font-size: 11px;
    font-weight: 600;
    color: var(--text-muted);
    font-family: $font-mono;
    letter-spacing: 0.03em;
  }
}

.delete-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: $space-1 $space-3;
  border-radius: var(--radius-md);
  font-size: 12px;
  font-weight: 600;
  color: var(--text-muted);
  @include pressable;

  &:hover:not(:disabled) {
    color: $error;
    background: rgba($error, 0.08);
  }

  &:disabled {
    opacity: 0.3;
  }

  .del-icon {
    width: 14px;
    height: 14px;
  }
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

.fade-enter-active,
.fade-leave-active {
  transition: opacity $duration-normal $ease-out-expo;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
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

// Skeleton shimmer — matches frontend-design-pro
@keyframes skeleton-shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}


</style>
