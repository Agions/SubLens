<script setup lang="ts">
import { ref } from 'vue'
import Modal from '@/components/common/Modal.vue'
import { useKeyboardShortcuts } from '@/composables/useKeyboardShortcuts'

const { shortcuts, getShortcutText } = useKeyboardShortcuts()

const isOpen = ref(false)

const shortcutGroups = [
  { name: '播放控制', shortcuts: shortcuts.filter(s => [' ', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'ArrowUp', 'ArrowDown', 'm'].includes(s.key)) },
  { name: '字幕操作', shortcuts: shortcuts.filter(s => ['Delete', 'z', 'a', 'j', 'k'].includes(s.key)) },
  { name: '导出', shortcuts: shortcuts.filter(s => s.key === 's' && s.ctrl) },
]

function open() {
  isOpen.value = true
}

function close() {
  isOpen.value = false
}

defineExpose({ open, close })
</script>

<template>
  <Modal
    :open="isOpen"
    title="键盘快捷键"
    size="md"
    @close="close"
  >
    <div class="shortcuts-content">
      <div
        v-for="group in shortcutGroups"
        :key="group.name"
        class="shortcut-group"
      >
        <h4 class="group-title">
          {{ group.name }}
        </h4>
        <div class="shortcut-list">
          <div
            v-for="shortcut in group.shortcuts"
            :key="shortcut.key"
            class="shortcut-item"
          >
            <kbd class="shortcut-key">{{ getShortcutText(shortcut) }}</kbd>
            <span class="shortcut-desc">{{ shortcut.description }}</span>
          </div>
        </div>
      </div>
      
      <div class="shortcut-tip">
        <span class="tip-icon">💡</span>
        <span class="tip-text">按 <kbd>?</kbd> 可随时打开此页面</span>
      </div>
    </div>
  </Modal>
</template>

<style lang="scss" scoped>
.shortcuts-content {
  display: flex;
  @include flex-column;
  gap: $space-6;
}

.shortcut-group {
  .group-title {
    font-size: $text-sm;
    font-weight: 600;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: $space-3;
    padding-bottom: $space-2;
    border-bottom: 1px solid var(--border);
  }
}

.shortcut-list {
  display: flex;
  @include flex-column;
  gap: $space-2;
}

.shortcut-item {
  display: flex;
  align-items: center;
  gap: $space-3;
  padding: $space-2;
  border-radius: $radius-md;
  
  &:hover {
    background: var(--bg-overlay);
  }
}

.shortcut-key {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 60px;
  padding: $space-1 $space-2;
  background: var(--bg-base);
  border: 1px solid var(--border);
  border-radius: $radius-sm;
  font-family: $font-display;
  font-size: $text-xs;
  color: var(--text-primary);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.shortcut-desc {
  font-size: $text-sm;
  color: var(--text-secondary);
}

.shortcut-tip {
  display: flex;
  align-items: center;
  gap: $space-2;
  padding: $space-3;
  background: var(--primary-dim);
  border-radius: $radius-md;
  
  .tip-icon {
    font-size: 16px;
  }
  
  .tip-text {
    font-size: $text-sm;
    color: var(--primary);
    
    kbd {
      padding: 2px 6px;
      background: var(--bg-surface);
      border: 1px solid var(--border);
      border-radius: $radius-sm;
      font-family: $font-display;
      font-size: $text-xs;
    }
  }
}
</style>
