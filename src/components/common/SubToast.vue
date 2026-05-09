<script setup lang="ts">
import { watch, onUnmounted } from 'vue'

interface Props {
  text: string
  index: number
  total: number
  visible: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'hide'): void
}>()

let timeout: ReturnType<typeof setTimeout> | null = null

watch(() => props.visible, (isVisible) => {
  if (isVisible) {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => {
      emit('hide')
    }, 2000)
  }
})

onUnmounted(() => {
  if (timeout) clearTimeout(timeout)
})
</script>

<template>
  <Transition name="toast">
    <div v-if="visible" class="subtitle-toast">
      <div class="toast-header">
        <span class="toast-index">{{ index + 1 }} / {{ total }}</span>
        <span class="toast-label">字幕</span>
      </div>
      <p class="toast-text">{{ text }}</p>
    </div>
  </Transition>
</template>

<style lang="scss" scoped>
.subtitle-toast {
  position: fixed;
  bottom: 80px;
  left: 50%;
  transform: translateX(-50%);
  background: $bg-overlay;
  border: 1px solid $border;
  border-radius: $radius-lg;
  padding: $space-3 $space-4;
  min-width: 200px;
  max-width: 400px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
  z-index: $z-toast;
  pointer-events: none;
}

.toast-header {
  display: flex;
  align-items: center;
  gap: $space-2;
  margin-bottom: $space-2;
}

.toast-index {
  font-family: $font-mono;
  font-size: $text-xs;
  color: $primary;
  font-weight: 600;
}

.toast-label {
  font-size: $text-xs;
  color: $text-muted;
}

.toast-text {
  font-size: $text-sm;
  color: $text-primary;
  line-height: 1.5;
  max-height: 3em;
  overflow: hidden;
  text-overflow: ellipsis;
}

// ── Transition ─────────────────────────────────────────────
.toast-enter-active,
.toast-leave-active {
  transition: all 0.25s ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(10px);
}
</style>
