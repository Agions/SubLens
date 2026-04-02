<script setup lang="ts">
import { ref, computed } from 'vue'
import { useSubtitleStore } from '@/stores/subtitle'
import { useProjectStore } from '@/stores/project'
import type { ExportFormats } from '@/types/subtitle'

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

function getConfidenceClass(confidence: number): string {
  if (confidence >= 0.9) return 'high'
  if (confidence >= 0.7) return 'mid'
  return 'low'
}

const selectedCount = computed(() =>
  subtitleStore.selectedId ? 1 : 0
)
</script>

<template>
  <aside class="subtitle-panel">
    <!-- Header -->
    <div class="panel-header">
      <div class="header-left">
        <h3 class="panel-title">字幕列表</h3>
        <span class="subtitle-badge">{{ subtitleStore.totalCount }} 条</span>
      </div>
      <div class="header-actions">
        <button
          class="hdr-btn"
          :disabled="!subtitleStore.canUndo"
          @click="subtitleStore.undo()"
          title="撤销 (Ctrl+Z)"
        >
          <svg viewBox="0 0 20 20" fill="none" class="hdr-icon">
            <path d="M4 9H14a3 3 0 010 6H8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            <path d="M7 6L4 9l3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
        <button
          class="hdr-btn"
          :disabled="!subtitleStore.canRedo"
          @click="subtitleStore.redo()"
          title="重做 (Ctrl+Y)"
        >
          <svg viewBox="0 0 20 20" fill="none" class="hdr-icon">
            <path d="M16 9H6a3 3 0 000 6h6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            <path d="M13 6l3 3-3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </div>
    </div>

    <!-- Search -->
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
    </div>

    <!-- Subtitle List -->
    <div class="subtitle-list">
      <!-- Group by time for skeleton -->
      <template v-if="subtitleStore.isExtracting">
        <div v-for="i in 5" :key="i" class="subtitle-skeleton">
          <div class="skeleton-header">
            <div class="sk sk-index"/>
            <div class="sk sk-time"/>
            <div class="sk sk-badge"/>
          </div>
          <div class="sk sk-text"/>
          <div class="sk sk-text sk-text-sm"/>
        </div>
      </template>

      <template v-else>
        <div
          v-for="(sub, idx) in subtitleStore.filteredSubtitles"
          :key="sub.id"
          :class="['subtitle-card', {
            'is-selected': subtitleStore.selectedId === sub.id,
            'is-edited': sub.edited
          }]"
          @click="handleSubtitleClick(sub.id)"
          @dblclick="startEdit(sub.id)"
          @mouseenter="hoveredId = sub.id"
          @mouseleave="hoveredId = null"
          :style="{ animationDelay: `${Math.min(idx * 30, 300)}ms` }"
        >
          <!-- Card header row -->
          <div class="card-header">
            <div class="card-left">
              <span class="card-index">{{ sub.index }}</span>
              <div class="card-times">
                <span class="time-start">{{ formatTimeShort(sub.startTime) }}</span>
                <svg class="time-arrow" viewBox="0 0 12 6" fill="none">
                  <path d="M1 3h8M6 1l3 2-3 2" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <span class="time-end">{{ formatTimeShort(sub.endTime) }}</span>
              </div>
            </div>
            <div class="card-right">
              <!-- Confidence pill -->
              <span :class="['conf-pill', `conf-${getConfidenceClass(sub.confidence)}`]">
                {{ Math.round(sub.confidence * 100) }}%
              </span>
              <!-- Frame range -->
              <span class="frame-range">#{{ sub.startFrame }}</span>
            </div>
          </div>

          <!-- Subtitle text -->
          <p class="card-text" :class="{ 'text-italic': sub.edited }">{{ sub.text }}</p>

          <!-- Thumbnail preview on hover -->
          <transition name="thumb-fade">
            <div v-if="hoveredId === sub.id && sub.thumbnailUrls?.length" class="thumbnail-strip">
              <img
                v-for="(url, ti) in sub.thumbnailUrls.slice(0, 5)"
                :key="ti"
                :src="url"
                class="thumb-img"
                alt=""
              />
            </div>
          </transition>

          <!-- Edit form -->
          <transition name="edit-slide">
            <div v-if="editingId === sub.id" class="edit-form" @click.stop>
              <div class="edit-time-row">
                <input v-model="editStartTime" type="text" class="edit-input edit-time" placeholder="00:00:00,000"/>
                <svg class="edit-arrow" viewBox="0 0 12 6" fill="none">
                  <path d="M1 3h8M6 1l3 2-3 2" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <input v-model="editEndTime" type="text" class="edit-input edit-time" placeholder="00:00:00,000"/>
              </div>
              <textarea
                v-model="editText"
                class="edit-textarea"
                rows="3"
                @keydown.esc="cancelEdit"
                @keydown.ctrl.enter="saveEdit"
              />
              <div class="edit-actions">
                <span class="edit-hint">Ctrl+Enter 保存 · Esc 取消</span>
                <div class="edit-btns">
                  <button class="btn btn-ghost" @click="cancelEdit">取消</button>
                  <button class="btn btn-primary" @click="saveEdit">保存</button>
                </div>
              </div>
            </div>
          </transition>

          <!-- Selected indicator bar -->
          <div class="selected-bar"/>
        </div>
      </template>

      <!-- Empty State -->
      <transition name="fade">
        <div v-if="!subtitleStore.isExtracting && subtitleStore.filteredSubtitles.length === 0" class="empty-state">
          <div class="empty-illustration">
            <svg viewBox="0 0 80 60" fill="none" class="empty-svg">
              <rect x="10" y="10" width="60" height="8" rx="4" fill="currentColor" opacity="0.15"/>
              <rect x="10" y="24" width="40" height="6" rx="3" fill="currentColor" opacity="0.1"/>
              <rect x="10" y="36" width="50" height="6" rx="3" fill="currentColor" opacity="0.1"/>
              <rect x="10" y="48" width="30" height="6" rx="3" fill="currentColor" opacity="0.08"/>
              <circle cx="58" cy="48" r="10" fill="currentColor" opacity="0.06"/>
              <path d="M55 48l2 2 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" opacity="0.4"/>
            </svg>
          </div>
          <p class="empty-title">{{ subtitleStore.searchQuery ? '没有找到匹配的字幕' : '暂无字幕数据' }}</p>
          <p class="empty-hint">{{ subtitleStore.searchQuery ? '尝试调整搜索关键词' : '导入视频并开始提取字幕' }}</p>
        </div>
      </transition>
    </div>

    <!-- Footer -->
    <div class="panel-footer">
      <div class="footer-top">
        <!-- Export format toggles -->
        <div class="format-toggles">
          <label class="fmt-toggle" v-for="key in exportFormatKeys" :key="key">
            <input
              type="checkbox"
              :checked="subtitleStore.exportFormats[key]"
              @change="(subtitleStore.exportFormats as any)[key] = !subtitleStore.exportFormats[key]"
            />
            <span class="fmt-label">{{ key.toUpperCase() }}</span>
          </label>
        </div>
        <!-- Delete selected -->
        <button
          class="delete-btn"
          :disabled="!subtitleStore.selectedId"
          @click="deleteSelected"
          title="删除选中字幕"
        >
          <svg viewBox="0 0 20 20" fill="none" class="del-icon">
            <path d="M4 6h12M8 6V4h4v2M6 6v9h8V6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span>删除</span>
        </button>
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

// ── Header ─────────────────────────────────────────────────
.panel-header {
  padding: $space-4 $space-4 $space-3;
  border-bottom: 1px solid $border;
  display: flex;
  align-items: center;
  justify-content: space-between;
  animation: fade-up 0.3s ease-out both;
}

.header-left {
  display: flex;
  align-items: center;
  gap: $space-2;
}

.panel-title {
  font-size: $text-base;
  font-weight: 700;
  color: $text-primary;
}

.subtitle-badge {
  font-size: $text-xs;
  font-weight: 600;
  background: rgba($primary, 0.12);
  color: $primary;
  padding: 2px 8px;
  border-radius: $radius-full;
  border: 1px solid rgba($primary, 0.2);
}

.header-actions {
  display: flex;
  gap: $space-1;
}

.hdr-btn {
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: $radius-md;
  color: $text-secondary;
  transition: all $transition-fast;

  &:hover:not(:disabled) {
    background: $bg-overlay;
    color: $text-primary;
  }

  &:disabled {
    opacity: 0.25;
    cursor: not-allowed;
  }

  .hdr-icon {
    width: 16px;
    height: 16px;
  }
}

// ── Search ─────────────────────────────────────────────────
.search-bar {
  padding: $space-3 $space-4;
  display: flex;
  align-items: center;
  gap: $space-2;
  border-bottom: 1px solid $border;
  animation: fade-up 0.3s 0.05s ease-out both;
}

.search-icon {
  width: 16px;
  height: 16px;
  color: $text-muted;
  flex-shrink: 0;
}

.search-input {
  flex: 1;
  background: transparent;
  border: none;
  font-size: $text-sm;
  color: $text-primary;
  font-family: $font-text;

  &::placeholder { color: $text-muted; }
  &:focus { outline: none; }
}

// ── Subtitle List ────────────────────────────────────────────
.subtitle-list {
  flex: 1;
  overflow-y: auto;
  padding: $space-3 $space-3;
  display: flex;
  flex-direction: column;
  gap: $space-2;
  @include custom-scrollbar;
}

// ── Subtitle Card ───────────────────────────────────────────
.subtitle-card {
  position: relative;
  padding: $space-3;
  border-radius: $radius-lg;
  border: 1.5px solid $border;
  background: $bg-elevated;
  cursor: pointer;
  transition: all $transition-base;
  overflow: hidden;
  animation: card-enter 0.35s ease-out both;

  &:hover {
    border-color: $border-light;
    background: lighten($bg-elevated, 1%);
    transform: translateY(-1px);
    box-shadow: $shadow-md;
  }

  &.is-selected {
    border-color: $primary;
    background: rgba($primary, 0.06);
    box-shadow: 0 0 0 1px rgba($primary, 0.15), $shadow-glow-primary;

    .selected-bar {
      opacity: 1;
    }
  }

  &.is-edited .card-text {
    font-style: italic;
    opacity: 0.8;
  }

  // Left colored bar for selected
  .selected-bar {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 3px;
    background: linear-gradient(180deg, $primary, $accent);
    border-radius: $radius-sm 0 0 $radius-sm;
    opacity: 0;
    transition: opacity $transition-fast;
  }
}

// ── Card Header ──────────────────────────────────────────────
.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: $space-2;
}

.card-left {
  display: flex;
  align-items: center;
  gap: $space-2;
}

.card-index {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: $bg-overlay;
  border-radius: $radius-sm;
  font-family: $font-display;
  font-size: $text-xs;
  font-weight: 700;
  color: $text-secondary;
  flex-shrink: 0;
}

.card-times {
  display: flex;
  align-items: center;
  gap: 4px;
  font-family: $font-display;
  font-size: $text-xs;
  color: $text-muted;

  .time-start { color: $text-secondary; }
  .time-arrow {
    width: 12px;
    height: 12px;
    color: $text-muted;
    opacity: 0.5;
  }
  .time-end { color: $text-muted; }
}

.card-right {
  display: flex;
  align-items: center;
  gap: $space-2;
}

// ── Confidence Pill ────────────────────────────────────────────
.conf-pill {
  font-family: $font-display;
  font-size: 10px;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: $radius-full;
  letter-spacing: 0.02em;

  &.conf-high {
    background: rgba($success, 0.12);
    color: $success;
    border: 1px solid rgba($success, 0.25);
  }

  &.conf-mid {
    background: rgba($warning, 0.12);
    color: $warning;
    border: 1px solid rgba($warning, 0.25);
  }

  &.conf-low {
    background: rgba($error, 0.12);
    color: $error;
    border: 1px solid rgba($error, 0.25);
  }
}

.frame-range {
  font-family: $font-display;
  font-size: 10px;
  color: $text-muted;
}

// ── Card Text ────────────────────────────────────────────────
.card-text {
  font-size: $text-sm;
  color: $text-primary;
  line-height: 1.5;
  margin: 0;
  word-break: break-word;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

// ── Thumbnail Strip ──────────────────────────────────────────
.thumbnail-strip {
  display: flex;
  gap: 4px;
  margin-top: $space-2;
  padding-top: $space-2;
  border-top: 1px solid $border;
}

.thumb-img {
  width: 48px;
  height: 28px;
  object-fit: cover;
  border-radius: $radius-sm;
  border: 1px solid $border;
  opacity: 0.8;
  transition: opacity $transition-fast;

  &:hover { opacity: 1; }
}

// ── Edit Form ────────────────────────────────────────────────
.edit-form {
  margin-top: $space-3;
  padding-top: $space-3;
  border-top: 1px solid $border;
  display: flex;
  flex-direction: column;
  gap: $space-2;
}

.edit-time-row {
  display: flex;
  align-items: center;
  gap: $space-2;
}

.edit-arrow {
  width: 12px;
  height: 12px;
  color: $text-muted;
  flex-shrink: 0;
}

.edit-input {
  flex: 1;
  background: $bg-base;
  border: 1px solid $border;
  border-radius: $radius-md;
  padding: $space-2 $space-3;
  font-family: $font-display;
  font-size: $text-xs;
  color: $text-primary;
  transition: border-color $transition-fast;

  &:focus {
    outline: none;
    border-color: $primary;
    box-shadow: 0 0 0 2px rgba($primary, 0.1);
  }
}

.edit-textarea {
  width: 100%;
  background: $bg-base;
  border: 1px solid $border;
  border-radius: $radius-md;
  padding: $space-2 $space-3;
  font-size: $text-sm;
  color: $text-primary;
  font-family: $font-text;
  resize: none;
  line-height: 1.5;
  transition: border-color $transition-fast;

  &:focus {
    outline: none;
    border-color: $primary;
    box-shadow: 0 0 0 2px rgba($primary, 0.1);
  }
}

.edit-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.edit-hint {
  font-size: 10px;
  color: $text-muted;
}

.edit-btns {
  display: flex;
  gap: $space-2;
}

// ── Buttons ─────────────────────────────────────────────────
.btn {
  padding: $space-1 $space-3;
  border-radius: $radius-md;
  font-size: $text-sm;
  font-weight: 600;
  transition: all $transition-fast;
  cursor: pointer;
  border: none;

  &-ghost {
    background: $bg-overlay;
    color: $text-secondary;

    &:hover {
      background: $border;
      color: $text-primary;
    }
  }

  &-primary {
    background: $primary;
    color: #fff;

    &:hover {
      background: lighten($primary, 5%);
      box-shadow: 0 2px 8px rgba($primary, 0.3);
    }
  }
}

// ── Skeleton ─────────────────────────────────────────────────
.subtitle-skeleton {
  padding: $space-3;
  border-radius: $radius-lg;
  border: 1.5px solid $border;
  background: $bg-elevated;
  animation: skeleton-pulse 1.5s ease-in-out infinite;

  .skeleton-header {
    display: flex;
    gap: $space-2;
    margin-bottom: $space-2;
  }

  .sk {
    background: $bg-overlay;
    border-radius: $radius-sm;
    height: 12px;

    &-index { width: 24px; height: 24px; border-radius: $radius-sm; flex-shrink: 0; }
    &-time { width: 80px; }
    &-badge { width: 36px; height: 16px; border-radius: $radius-full; margin-left: auto; }
    &-text { width: 90%; margin-bottom: 6px; }
    &-text-sm { width: 60%; }
  }
}

// ── Empty State ──────────────────────────────────────────────
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: $space-10 $space-4;
  text-align: center;
}

.empty-illustration {
  margin-bottom: $space-4;
  opacity: 0.4;
}

.empty-svg {
  width: 80px;
  height: 60px;
  color: $text-muted;
}

.empty-title {
  font-size: $text-base;
  font-weight: 600;
  color: $text-secondary;
  margin-bottom: $space-2;
}

.empty-hint {
  font-size: $text-sm;
  color: $text-muted;
}

// ── Footer ───────────────────────────────────────────────────
.panel-footer {
  padding: $space-3 $space-4;
  border-top: 1px solid $border;
  animation: fade-up 0.3s 0.1s ease-out both;
}

.footer-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.format-toggles {
  display: flex;
  gap: $space-3;
}

.fmt-toggle {
  display: flex;
  align-items: center;
  gap: 5px;
  cursor: pointer;

  input[type="checkbox"] {
    width: 14px;
    height: 14px;
    accent-color: $primary;
    cursor: pointer;
  }

  .fmt-label {
    font-size: $text-xs;
    font-weight: 600;
    color: $text-secondary;
    font-family: $font-display;
    letter-spacing: 0.03em;
  }
}

.delete-btn {
  display: flex;
  align-items: center;
  gap: $space-1;
  padding: $space-1 $space-3;
  border-radius: $radius-md;
  font-size: $text-xs;
  font-weight: 600;
  color: $text-secondary;
  transition: all $transition-fast;

  &:hover:not(:disabled) {
    color: $error;
    background: rgba($error, 0.08);
  }

  &:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  .del-icon {
    width: 14px;
    height: 14px;
  }
}

// ── Transitions ──────────────────────────────────────────────
.thumb-fade-enter-active,
.thumb-fade-leave-active { transition: opacity 0.2s ease; }
.thumb-fade-enter-from,
.thumb-fade-leave-to { opacity: 0; }

.edit-slide-enter-active,
.edit-slide-leave-active { transition: opacity 0.2s ease, transform 0.2s ease; }
.edit-slide-enter-from,
.edit-slide-leave-to { opacity: 0; transform: translateY(-4px); }

.fade-enter-active,
.fade-leave-active { transition: opacity 0.3s ease; }
.fade-enter-from,
.fade-leave-to { opacity: 0; }

// ── Animations ───────────────────────────────────────────────
@keyframes fade-up {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes card-enter {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes skeleton-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}
</style>
