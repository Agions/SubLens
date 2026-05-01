<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useProjectStore } from '@/stores/project'

const props = defineProps<{
  videoWidth: number
  videoHeight: number
}>()

const emit = defineEmits<{
  (e: 'update', roi: { x: number; y: number; width: number; height: number }): void
}>()

const projectStore = useProjectStore()

const containerRef = ref<HTMLElement | null>(null)
const isSelecting = ref(false)
const startPos = ref({ x: 0, y: 0 })
const currentPos = ref({ x: 0, y: 0 })

const selection = computed(() => {
  if (!isSelecting.value) return null

  const x = Math.min(startPos.value.x, currentPos.value.x)
  const y = Math.min(startPos.value.y, currentPos.value.y)
  const width = Math.abs(currentPos.value.x - startPos.value.x)
  const height = Math.abs(currentPos.value.y - startPos.value.y)

  return {
    x: (x / props.videoWidth) * 100,
    y: (y / props.videoHeight) * 100,
    width: (width / props.videoWidth) * 100,
    height: (height / props.videoHeight) * 100
  }
})

const currentROI = computed(() => projectStore.selectedROI)

function handleMouseDown(e: MouseEvent) {
  if (!containerRef.value) return

  const rect = containerRef.value.getBoundingClientRect()
  const x = e.clientX - rect.left
  const y = e.clientY - rect.top

  isSelecting.value = true
  startPos.value = { x, y }
  currentPos.value = { x, y }
}

function handleMouseMove(e: MouseEvent) {
  if (!isSelecting.value || !containerRef.value) return

  const rect = containerRef.value.getBoundingClientRect()
  currentPos.value = {
    x: Math.max(0, Math.min(e.clientX - rect.left, props.videoWidth)),
    y: Math.max(0, Math.min(e.clientY - rect.top, props.videoHeight))
  }
}

function handleMouseUp() {
  if (!isSelecting.value || !selection.value) return

  // Only emit if selection is meaningful (> 1% of video size)
  if (selection.value.width > 1 && selection.value.height > 1) {
    emit('update', selection.value)

    projectStore.updateROI({
      x: selection.value.x,
      y: selection.value.y,
      width: selection.value.width,
      height: selection.value.height,
      type: 'custom'
    })
  }

  isSelecting.value = false
}

function handleKeyDown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    isSelecting.value = false
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
})
</script>

<template>
  <div
    ref="containerRef"
    class="roi-selector"
    :class="{ selecting: isSelecting }"
    @mousedown="handleMouseDown"
    @mousemove="handleMouseMove"
    @mouseup="handleMouseUp"
    @mouseleave="handleMouseUp"
  >
    <!-- Active selection -->
    <Transition name="roi">
      <div
        v-if="selection"
        class="roi-selection"
        :style="{
          left: `${selection.x}%`,
          top: `${selection.y}%`,
          width: `${selection.width}%`,
          height: `${selection.height}%`
        }"
      >
        <div class="roi-corner top-left"/>
        <div class="roi-corner top-right"/>
        <div class="roi-corner bottom-left"/>
        <div class="roi-corner bottom-right"/>
      </div>
    </Transition>

    <!-- Existing ROI display -->
    <Transition name="roi">
      <div
        v-if="currentROI && !isSelecting"
        class="roi-existing"
        :style="{
          left: `${currentROI.x}%`,
          top: `${currentROI.y}%`,
          width: `${currentROI.width}%`,
          height: `${currentROI.height}%`
        }"
      >
        <span class="roi-badge">{{ currentROI.name || '自定义' }}</span>
      </div>
    </Transition>

    <!-- Hint -->
    <Transition name="fade">
      <div v-if="!selection && !currentROI" class="roi-hint">
        <svg viewBox="0 0 20 20" fill="none" class="hint-icon">
          <rect x="3" y="6" width="14" height="8" rx="1.5" stroke="currentColor" stroke-width="1.3"/>
          <path d="M7 10h6M10 7v6" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
        </svg>
        拖拽选择字幕区域
      </div>
    </Transition>
  </div>
</template>

<style lang="scss" scoped>
.roi-selector {
  position: absolute;
  inset: 0;
  cursor: crosshair;
  user-select: none;
  transition: background $duration-fast $ease-out-expo;

  &.selecting {
    cursor: crosshair;
  }

  &:hover:not(.selecting) {
    background: rgba($primary, 0.03);
  }
}

// ── Selection Box ────────────────────────────────────────────
.roi-selection {
  position: absolute;
  border: 2px solid var(--primary);
  background: rgba($primary, 0.12);
  box-shadow:
    0 0 0 1px rgba($primary, 0.1),
    0 4px 20px rgba($primary, 0.25),
    inset 0 0 0 1px rgba($primary, 0.1);
  pointer-events: none;
}

.roi-corner {
  position: absolute;
  width: 8px;
  height: 8px;
  background: var(--primary);
  border-radius: 50%;
  box-shadow: 0 0 6px rgba($primary, 0.5);

  &.top-left {
    top: -4px;
    left: -4px;
  }

  &.top-right {
    top: -4px;
    right: -4px;
  }

  &.bottom-left {
    bottom: -4px;
    left: -4px;
  }

  &.bottom-right {
    bottom: -4px;
    right: -4px;
  }
}

// ── Existing ROI ──────────────────────────────────────────────
.roi-existing {
  position: absolute;
  border: 1.5px dashed rgba($secondary, 0.6);
  background: rgba($secondary, 0.06);
  pointer-events: none;
}

.roi-badge {
  position: absolute;
  top: -24px;
  left: 0;
  font-size: 10px;
  font-weight: 600;
  color: $secondary;
  background: var(--bg-elevated);
  padding: 2px 6px;
  border-radius: var(--radius-sm);
  border: 1px solid rgba($secondary, 0.3);
  white-space: nowrap;
}

// ── Hint ─────────────────────────────────────────────────────
.roi-hint {
  position: absolute;
  inset: 0;
  display: flex;
  @include flex-column;
  align-items: center;
  justify-content: center;
  gap: $space-2;
  pointer-events: none;
}

.hint-icon {
  width: 32px;
  height: 32px;
  color: $gray-500;
}

.roi-hint {
  font-size: $text-xs;
  color: $gray-500;
  letter-spacing: $tracking-wide;
}

// ── Transitions ──────────────────────────────────────────────
.roi-enter-active {
  transition: opacity $duration-fast $ease-out-expo,
              transform $duration-fast $ease-out-expo;
}
.roi-leave-active {
  transition: opacity $duration-instant $ease-out-expo;
}
.roi-enter-from,
.roi-leave-to {
  opacity: 0;
  transform: scale(0.96);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity $duration-normal $ease-out-expo;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
