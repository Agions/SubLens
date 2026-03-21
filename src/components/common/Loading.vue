<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  size?: 'sm' | 'md' | 'lg'
  color?: string
  text?: string
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md',
  color: 'var(--primary)'
})

const sizeMap = {
  sm: '24px',
  md: '40px',
  lg: '64px'
}

const strokeWidthMap = {
  sm: 2,
  md: 3,
  lg: 4
}

const spinnerSize = computed(() => sizeMap[props.size])
const strokeWidth = computed(() => strokeWidthMap[props.size])
</script>

<template>
  <div class="loading-indicator" :class="size">
    <svg
      class="spinner"
      :width="spinnerSize"
      :height="spinnerSize"
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle
        class="track"
        cx="12"
        cy="12"
        r="10"
        :stroke-width="strokeWidth"
      />
      <circle
        class="progress"
        cx="12"
        cy="12"
        r="10"
        :stroke-width="strokeWidth"
        :stroke="color"
      />
    </svg>
    <span v-if="text" class="loading-text">{{ text }}</span>
  </div>
</template>

<style lang="scss" scoped>
.loading-indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: $space-3;

  &.sm {
    gap: $space-2;
  }

  &.lg {
    gap: $space-4;
  }
}

.spinner {
  animation: rotate 1s linear infinite;
}

.track {
  stroke: var(--border);
}

.progress {
  stroke-linecap: round;
  animation: dash 1.5s ease-in-out infinite;
}

.loading-text {
  font-size: $text-sm;
  color: var(--text-secondary);
}

@keyframes rotate {
  100% {
    transform: rotate(360deg);
  }
}

@keyframes dash {
  0% {
    stroke-dasharray: 1, 150;
    stroke-dashoffset: 0;
  }
  50% {
    stroke-dasharray: 90, 150;
    stroke-dashoffset: -35;
  }
  100% {
    stroke-dasharray: 90, 150;
    stroke-dashoffset: -124;
  }
}
</style>
