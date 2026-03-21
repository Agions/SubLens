<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useSubtitleStore } from '@/stores/subtitle'
import { useProjectStore } from '@/stores/project'

const subtitleStore = useSubtitleStore()
const projectStore = useProjectStore()

const editingId = ref<string | null>(null)
const editText = ref('')
const editStartTime = ref('')
const editEndTime = ref('')

function startEdit(id: string) {
  const sub = subtitleStore.subtitles.find(s => s.id === id)
  if (!sub) return
  
  editingId.value = id
  editText.value = sub.text
  editStartTime.value = formatTime(sub.startTime)
  editEndTime.value = formatTime(sub.endTime)
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
  
  // Update text if changed
  if (editText.value !== sub.text) {
    subtitleStore.editSubtitle(editingId.value, 'text', sub.text, editText.value)
  }
  
  // Update times if changed
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
  
  // Jump to subtitle frame
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

function formatTime(seconds: number): string {
  const hrs = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  const ms = Math.floor((seconds % 1) * 1000)
  
  const pad = (n: number, len = 2) => n.toString().padStart(len, '0')
  
  return `${pad(hrs)}:${pad(mins)}:${pad(secs)},${pad(ms, 3)}`
}

function parseTime(timeStr: string): number {
  const match = timeStr.match(/(\d+):(\d+):(\d+)[,.](\d+)/)
  if (!match) return -1
  
  const [, hrs, mins, secs, ms] = match
  return parseInt(hrs) * 3600 + parseInt(mins) * 60 + parseInt(secs) + parseInt(ms) / 1000
}

function formatConfidence(confidence: number): string {
  return `${Math.round(confidence * 100)}%`
}

function getConfidenceColor(confidence: number): string {
  if (confidence >= 0.9) return 'var(--success, #30D158)'
  if (confidence >= 0.7) return 'var(--warning, #FFD60A)'
  return 'var(--error, #FF453A)'
}
</script>

<template>
  <aside class="subtitle-panel">
    <!-- Header -->
    <div class="panel-header">
      <h3 class="panel-title">字幕列表</h3>
      <span class="subtitle-count">{{ subtitleStore.totalCount }} 条</span>
    </div>
    
    <!-- Search -->
    <div class="search-bar">
      <span class="search-icon">🔍</span>
      <input
        v-model="subtitleStore.searchQuery"
        type="text"
        placeholder="搜索字幕..."
        class="search-input"
      />
    </div>
    
    <!-- Subtitle List -->
    <div class="subtitle-list">
      <div
        v-for="sub in subtitleStore.filteredSubtitles"
        :key="sub.id"
        :class="['subtitle-item', { selected: subtitleStore.selectedId === sub.id, edited: sub.edited }]"
        @click="handleSubtitleClick(sub.id)"
        @dblclick="startEdit(sub.id)"
      >
        <!-- Edit Mode -->
        <div v-if="editingId === sub.id" class="edit-form">
          <div class="edit-row">
            <label>时间:</label>
            <input v-model="editStartTime" type="text" class="time-input" />
            <span>→</span>
            <input v-model="editEndTime" type="text" class="time-input" />
          </div>
          <textarea 
            v-model="editText" 
            class="edit-textarea"
            rows="3"
          ></textarea>
          <div class="edit-actions">
            <button class="btn-cancel" @click.stop="cancelEdit">取消</button>
            <button class="btn-save" @click.stop="saveEdit">保存</button>
          </div>
        </div>
        
        <!-- View Mode -->
        <template v-else>
          <div class="item-header">
            <span class="item-index">{{ sub.index }}</span>
            <span class="item-time">
              {{ formatTime(sub.startTime).slice(0, -4) }} → {{ formatTime(sub.endTime).slice(0, -4) }}
            </span>
            <span 
              class="item-confidence" 
              :style="{ color: getConfidenceColor(sub.confidence) }"
            >
              {{ formatConfidence(sub.confidence) }}
            </span>
          </div>
          <p class="item-text">{{ sub.text }}</p>
          <div class="item-meta">
            <span class="item-frames">帧 #{{ sub.startFrame }} - #{{ sub.endFrame }}</span>
            <span v-if="sub.edited" class="item-edited">已编辑</span>
          </div>
        </template>
      </div>
      
      <!-- Empty State -->
      <div v-if="subtitleStore.filteredSubtitles.length === 0" class="empty-state">
        <span class="empty-icon">📝</span>
        <p class="empty-text">
          {{ subtitleStore.searchQuery ? '没有找到匹配的字幕' : '暂无字幕' }}
        </p>
      </div>
    </div>
    
    <!-- Footer -->
    <div class="panel-footer">
      <div class="footer-actions">
        <button 
          class="footer-btn" 
          :disabled="!subtitleStore.canUndo"
          @click="subtitleStore.undo()"
          title="撤销"
        >
          ↩️
        </button>
        <button 
          class="footer-btn" 
          :disabled="!subtitleStore.canRedo"
          @click="subtitleStore.redo()"
          title="重做"
        >
          ↪️
        </button>
        <button 
          class="footer-btn" 
          :disabled="!subtitleStore.selectedId"
          @click="deleteSelected"
          title="删除"
        >
          🗑️
        </button>
      </div>
      
      <div class="export-formats">
        <span class="export-label">导出:</span>
        <label class="format-check">
          <input type="checkbox" v-model="subtitleStore.exportFormats.srt" />
          <span>SRT</span>
        </label>
        <label class="format-check">
          <input type="checkbox" v-model="subtitleStore.exportFormats.vtt" />
          <span>VTT</span>
        </label>
        <label class="format-check">
          <input type="checkbox" v-model="subtitleStore.exportFormats.json" />
          <span>JSON</span>
        </label>
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
  
  &.edited {
    .item-text {
      font-style: italic;
    }
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
  margin-bottom: $space-2;
}

.item-meta {
  display: flex;
  gap: $space-3;
  font-size: $text-xs;
  color: $text-muted;
}

.item-edited {
  color: $warning;
}

.edit-form {
  .edit-row {
    display: flex;
    align-items: center;
    gap: $space-2;
    margin-bottom: $space-2;
    
    label {
      font-size: $text-xs;
      color: $text-muted;
    }
  }
  
  .time-input {
    width: 100px;
    padding: $space-1 $space-2;
    font-family: $font-display;
    font-size: $text-xs;
    background: $bg-base;
    border: 1px solid $border;
    border-radius: $radius-sm;
    color: $text-primary;
  }
  
  .edit-textarea {
    width: 100%;
    padding: $space-2;
    font-size: $text-sm;
    background: $bg-base;
    border: 1px solid $border;
    border-radius: $radius-sm;
    color: $text-primary;
    resize: none;
    
    &:focus {
      outline: none;
      border-color: $primary;
    }
  }
  
  .edit-actions {
    display: flex;
    justify-content: flex-end;
    gap: $space-2;
    margin-top: $space-2;
    
    button {
      padding: $space-1 $space-3;
      font-size: $text-sm;
      border-radius: $radius-sm;
      transition: all $transition-fast;
    }
    
    .btn-cancel {
      background: $bg-overlay;
      color: $text-secondary;
      
      &:hover {
        background: $border;
      }
    }
    
    .btn-save {
      background: $primary;
      color: white;
      
      &:hover {
        background: darken($primary, 10%);
      }
    }
  }
}

.empty-state {
  @include flex-center;
  flex-direction: column;
  padding: $space-8;
  text-align: center;
  
  .empty-icon {
    font-size: 48px;
    opacity: 0.3;
    margin-bottom: $space-3;
  }
  
  .empty-text {
    font-size: $text-sm;
    color: $text-muted;
  }
}

.panel-footer {
  padding: $space-3 $space-4;
  border-top: 1px solid $border;
}

.footer-actions {
  display: flex;
  gap: $space-2;
  margin-bottom: $space-3;
}

.footer-btn {
  width: 32px;
  height: 32px;
  @include flex-center;
  font-size: 16px;
  border-radius: $radius-md;
  background: $bg-overlay;
  transition: all $transition-fast;
  
  &:hover:not(:disabled) {
    background: $border;
  }
  
  &:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }
}

.export-formats {
  display: flex;
  align-items: center;
  gap: $space-3;
}

.export-label {
  font-size: $text-xs;
  color: $text-muted;
}

.format-check {
  display: flex;
  align-items: center;
  gap: $space-1;
  font-size: $text-xs;
  cursor: pointer;
  
  input {
    width: 14px;
    height: 14px;
    accent-color: $primary;
  }
  
  span {
    color: $text-secondary;
  }
}
</style>
