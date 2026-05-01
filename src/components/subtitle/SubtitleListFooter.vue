<script setup lang="ts">
/**
 * SubtitleListFooter - 字幕列表底部组件（格式选择+删除）
 */
import { computed } from 'vue'
import { useSubtitleStore } from '@/stores/subtitle'
import type { ExportFormats } from '@/types/subtitle'

const subtitleStore = useSubtitleStore()

function deleteSelected() {
  if (subtitleStore.selectedId) {
    subtitleStore.deleteSubtitle(subtitleStore.selectedId)
  }
}

const exportFormatKeys = computed(() => 
  Object.keys(subtitleStore.exportFormats) as (keyof ExportFormats)[]
)

function toggleFormat(key: keyof ExportFormats) {
  // 使用 store 的 action 而不是直接修改属性
  subtitleStore.toggleExportFormat(key)
}
</script>

<template>
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
          @change="toggleFormat(key)"
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
</template>

<style lang="scss" scoped>
// Variables and mixins are automatically injected via vite.config.ts additionalData

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
</style>
