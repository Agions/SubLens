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
  }, 200)
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
        <div
          :class="['modal', `modal-${size}`, { closing: isClosing }]"
          role="dialog"
          aria-modal="true"
        >
          <header v-if="title || closable" class="modal-header">
            <h3 v-if="title" class="modal-title">{{ title }}</h3>
            <button v-if="closable" class="close-btn" @click="close" aria-label="关闭">
              <svg viewBox="0 0 16 16" fill="none" width="14" height="14">
                <path d="M12 4L4 12M4 4l8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
              </svg>
            </button>
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
  background: rgba(0, 0, 0, 0.65);
  backdrop-filter: blur(6px) saturate(150%);
  -webkit-backdrop-filter: blur(6px) saturate(150%);
}

.modal {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: $radius-xl;
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.04),
    0 24px 64px rgba(0, 0, 0, 0.6);
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;

  &.modal-sm  { width: min(360px, 90vw); }
  &.modal-md  { width: min(480px, 90vw); }
  &.modal-lg  { width: min(640px, 90vw); }
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: $space-5 $space-5 $space-4;
  border-bottom: 1px solid var(--border);
}

.modal-title {
  font-size: $text-lg;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: -0.01em;
}

.close-btn {
  @include flex-center;
  width: 28px;
  height: 28px;
  font-size: 14px;
  color: var(--text-muted);
  border-radius: $radius-md;
  transition:
    background $duration-fast $ease-out-expo,
    color $duration-fast $ease-out-expo,
    transform $duration-fast $ease-out-expo;

  &:hover {
    background: var(--bg-overlay);
    color: var(--text-primary);
    transform: rotate(90deg);
  }
}

.modal-body {
  flex: 1;
  padding: $space-5;
  overflow-y: auto;
  @include custom-scrollbar(6px);
}

.modal-footer {
  padding: $space-4 $space-5;
  border-top: 1px solid var(--border);
  display: flex;
  justify-content: flex-end;
  gap: $space-3;
}

// ── Animations — OutCubic entrance/exit ──────────────────────
// Mask
.modal-enter-active {
  transition: opacity 200ms cubic-bezier(0.16, 1, 0.3, 1);
  .modal {
    transition:
      opacity 200ms cubic-bezier(0.16, 1, 0.3, 1),
      transform 250ms cubic-bezier(0.16, 1, 0.3, 1);
  }
}
.modal-leave-active {
  transition: opacity 180ms cubic-bezier(0.4, 0, 1, 1);
  .modal {
    transition:
      opacity 180ms cubic-bezier(0.4, 0, 1, 1),
      transform 180ms cubic-bezier(0.4, 0, 1, 1);
  }
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
  .modal {
    opacity: 0;
    transform: scale(0.94) translateY(8px);
  }
}
</style>
