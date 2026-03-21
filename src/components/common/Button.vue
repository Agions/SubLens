<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  loading?: boolean
  icon?: string
  iconOnly?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'primary',
  size: 'md',
  disabled: false,
  loading: false,
  iconOnly: false
})

const emit = defineEmits<{
  (e: 'click', event: MouseEvent): void
}>()

const classes = computed(() => [
  'btn',
  `btn-${props.variant}`,
  `btn-${props.size}`,
  {
    'btn-loading': props.loading,
    'btn-icon-only': props.iconOnly,
    'btn-disabled': props.disabled
  }
])

function handleClick(e: MouseEvent) {
  if (!props.disabled && !props.loading) {
    emit('click', e)
  }
}
</script>

<template>
  <button 
    :class="classes"
    :disabled="disabled || loading"
    @click="handleClick"
  >
    <span v-if="loading" class="spinner"></span>
    <span v-else-if="icon" class="icon">{{ icon }}</span>
    <span v-if="!iconOnly" class="text">
      <slot></slot>
    </span>
  </button>
</template>

<style lang="scss" scoped>
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: $space-2;
  font-weight: 500;
  border-radius: $radius-md;
  transition: all $transition-fast;
  cursor: pointer;
  border: none;
  outline: none;
  
  &:focus-visible {
    box-shadow: 0 0 0 2px var(--primary);
  }
  
  // Sizes
  &.btn-sm {
    padding: $space-1 $space-3;
    font-size: $text-sm;
    
    &.btn-icon-only {
      width: 28px;
      height: 28px;
      padding: 0;
    }
  }
  
  &.btn-md {
    padding: $space-2 $space-4;
    font-size: $text-sm;
    
    &.btn-icon-only {
      width: 36px;
      height: 36px;
      padding: 0;
    }
  }
  
  &.btn-lg {
    padding: $space-3 $space-6;
    font-size: $text-base;
    
    &.btn-icon-only {
      width: 44px;
      height: 44px;
      padding: 0;
    }
  }
  
  // Variants
  &.btn-primary {
    background: var(--primary);
    color: white;
    
    &:hover:not(:disabled) {
      opacity: 0.9;
    }
  }
  
  &.btn-secondary {
    background: var(--bg-overlay);
    color: var(--text-primary);
    border: 1px solid var(--border);
    
    &:hover:not(:disabled) {
      background: var(--border);
    }
  }
  
  &.btn-ghost {
    background: transparent;
    color: var(--text-secondary);
    
    &:hover:not(:disabled) {
      background: var(--bg-overlay);
      color: var(--text-primary);
    }
  }
  
  &.btn-danger {
    background: var(--error);
    color: white;
    
    &:hover:not(:disabled) {
      opacity: 0.9;
    }
  }
  
  // States
  &.btn-disabled,
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  &.btn-loading {
    position: relative;
    color: transparent;
    
    .spinner {
      position: absolute;
      width: 16px;
      height: 16px;
      border: 2px solid currentColor;
      border-right-color: transparent;
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
    }
  }
}

.icon {
  font-size: 1em;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
