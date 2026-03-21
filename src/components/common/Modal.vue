<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'

interface Props {
  open: boolean
  title?: string
  size?: 'sm' | 'md' | 'lg'
  closable?: boolean
  maskClosable?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  title: '',
  size: 'md',
  closable: true,
  maskClosable: true
})

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'update:open', value: boolean): void
}>()

const isClosing = ref(false)

function close() {
  isClosing.value = true
  setTimeout(() => {
    isClosing.value = false
    emit('close')
    emit('update:open', false)
  }, 150)
}

function handleMaskClick() {
  if (props.maskClosable) {
    close()
  }
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && props.closable) {
    close()
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
})

watch(() => props.open, (isOpen) => {
  if (isOpen) {
    document.body.style.overflow = 'hidden'
  } else {
    document.body.style.overflow = ''
  }
})
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="open" class="modal-mask" @click.self="handleMaskClick">
        <div :class="['modal', `modal-${size}`, { closing: isClosing }]">
          <header v-if="title || closable" class="modal-header">
            <h3 v-if="title" class="modal-title">{{ title }}</h3>
            <button v-if="closable" class="close-btn" @click="close">✕</button>
          </header>
          
          <div class="modal-body">
            <slot></slot>
          </div>
          
          <footer v-if="$slots.footer" class="modal-footer">
            <slot name="footer"></slot>
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style lang="scss" scoped>
.modal-mask {
  position: fixed;
  inset: 0;
  z-index: $z-modal;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
}

.modal {
  background: var(--bg-surface);
  border-radius: $radius-xl;
  box-shadow: $shadow-lg;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  
  &.modal-sm { width: 360px; }
  &.modal-md { width: 480px; }
  &.modal-lg { width: 640px; }
  
  &.closing {
    transform: scale(0.95);
    opacity: 0;
  }
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: $space-4;
  border-bottom: 1px solid var(--border);
}

.modal-title {
  font-size: $text-lg;
  font-weight: 600;
  color: var(--text-primary);
}

.close-btn {
  width: 28px;
  height: 28px;
  @include flex-center;
  font-size: 14px;
  color: var(--text-muted);
  border-radius: $radius-md;
  transition: all $transition-fast;
  
  &:hover {
    background: var(--bg-overlay);
    color: var(--text-primary);
  }
}

.modal-body {
  flex: 1;
  padding: $space-4;
  overflow-y: auto;
}

.modal-footer {
  padding: $space-4;
  border-top: 1px solid var(--border);
  display: flex;
  justify-content: flex-end;
  gap: $space-3;
}

.modal-enter-active,
.modal-leave-active {
  transition: all 0.2s ease;
  
  .modal {
    transition: all 0.2s ease;
  }
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
  
  .modal {
    transform: scale(0.95);
  }
}
</style>
