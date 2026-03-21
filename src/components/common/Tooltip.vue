<script setup lang="ts">
import { ref, computed } from 'vue'

interface Props {
  content: string
  position?: 'top' | 'bottom' | 'left' | 'right'
  delay?: number
}

const props = withDefaults(defineProps<Props>(), {
  position: 'top',
  delay: 300
})

const isVisible = ref(false)
let timeoutId: ReturnType<typeof setTimeout> | null = null

function show() {
  timeoutId = setTimeout(() => {
    isVisible.value = true
  }, props.delay)
}

function hide() {
  if (timeoutId) {
    clearTimeout(timeoutId)
    timeoutId = null
  }
  isVisible.value = false
}

const tooltipClass = computed(() => [
  'tooltip',
  `tooltip-${props.position}`
])
</script>

<template>
  <div 
    class="tooltip-wrapper"
    @mouseenter="show"
    @mouseleave="hide"
    @focus="show"
    @blur="hide"
  >
    <slot></slot>
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="isVisible" :class="tooltipClass" role="tooltip">
          {{ content }}
          <div class="tooltip-arrow"></div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style lang="scss" scoped>
.tooltip-wrapper {
  position: relative;
  display: inline-flex;
}

.tooltip {
  position: fixed;
  z-index: $z-tooltip;
  padding: $space-2 $space-3;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: $radius-md;
  font-size: $text-xs;
  color: var(--text-primary);
  white-space: nowrap;
  box-shadow: $shadow-lg;
  pointer-events: none;
  
  &.tooltip-top {
    transform: translateX(-50%);
    
    .tooltip-arrow {
      bottom: -4px;
      left: 50%;
      transform: translateX(-50%);
      border-width: 4px 4px 0 4px;
      border-color: var(--border) transparent transparent transparent;
    }
  }
  
  &.tooltip-bottom {
    transform: translateX(-50%);
    
    .tooltip-arrow {
      top: -4px;
      left: 50%;
      transform: translateX(-50%);
      border-width: 0 4px 4px 4px;
      border-color: transparent transparent var(--border) transparent;
    }
  }
  
  &.tooltip-left {
    transform: translateY(-50%);
    
    .tooltip-arrow {
      right: -4px;
      top: 50%;
      transform: translateY(-50%);
      border-width: 4px 0 4px 4px;
      border-color: transparent transparent transparent var(--border);
    }
  }
  
  &.tooltip-right {
    transform: translateY(-50%);
    
    .tooltip-arrow {
      left: -4px;
      top: 50%;
      transform: translateY(-50%);
      border-width: 4px 4px 4px 0;
      border-color: transparent var(--border) transparent transparent;
    }
  }
}

.tooltip-arrow {
  position: absolute;
  width: 0;
  height: 0;
  border-style: solid;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
