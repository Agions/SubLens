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
  font-weight: 600;
  border-radius: $radius-md;
  cursor: pointer;
  border: none;
  outline: none;
  position: relative;
  overflow: hidden;
  transition:
    transform 120ms cubic-bezier(0.16, 1, 0.3, 1),
    box-shadow 120ms cubic-bezier(0.16, 1, 0.3, 1),
    background 120ms cubic-bezier(0.16, 1, 0.3, 1),
    color 120ms cubic-bezier(0.16, 1, 0.3, 1),
    border-color 120ms cubic-bezier(0.16, 1, 0.3, 1),
    opacity 120ms cubic-bezier(0.16, 1, 0.3, 1);

  &:focus-visible {
    box-shadow: 0 0 0 2px var(--bg-base), 0 0 0 4px var(--primary);
  }

  // ── Sizes ────────────────────────────────────────────────
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

  // ── Primary — solid fill + scale + glow ────────────────
  &.btn-primary {
    background: var(--primary);
    color: white;
    box-shadow: 0 2px 8px rgba(#0A84FF, 0.25);

    &::before {
      content: '';
      position: absolute;
      inset: 0;
      background: rgba(255, 255, 255, 0);
      transition: background 120ms cubic-bezier(0.16, 1, 0.3, 1);
    }

    &:hover:not(:disabled) {
      transform: translateY(-1px) scale(1.01);
      box-shadow: 0 4px 16px rgba(#0A84FF, 0.35);

      &::before {
        background: rgba(255, 255, 255, 0.08);
      }
    }

    &:active:not(:disabled) {
      transform: translateY(0) scale(0.98);
      box-shadow: 0 1px 4px rgba(#0A84FF, 0.2);
    }
  }

  // ── Secondary — border + background ─────────────────────
  &.btn-secondary {
    background: var(--bg-elevated);
    color: var(--text-primary);
    border: 1px solid var(--border);

    &:hover:not(:disabled) {
      background: var(--bg-overlay);
      border-color: var(--border-light);
      transform: translateY(-1px);
    }

    &:active:not(:disabled) {
      transform: translateY(0) scale(0.98);
    }
  }

  // ── Ghost — transparent + hover bg ──────────────────────
  &.btn-ghost {
    background: transparent;
    color: var(--text-secondary);

    &:hover:not(:disabled) {
      background: var(--bg-overlay);
      color: var(--text-primary);
    }

    &:active:not(:disabled) {
      transform: scale(0.97);
    }
  }

  // ── Danger — error tint ─────────────────────────────────
  &.btn-danger {
    background: rgba(var(--error), 0.12);
    color: var(--error);
    border: 1px solid rgba(var(--error), 0.2);

    &:hover:not(:disabled) {
      background: rgba(var(--error), 0.18);
      border-color: rgba(var(--error), 0.35);
      transform: translateY(-1px);
    }

    &:active:not(:disabled) {
      transform: translateY(0) scale(0.98);
    }
  }

  // ── States ───────────────────────────────────────────────
  &.btn-disabled,
  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
    pointer-events: none;
  }

  &.btn-loading {
    color: transparent;
    pointer-events: none;

    .spinner {
      position: absolute;
      width: 16px;
      height: 16px;
      border: 2px solid rgba(255, 255, 255, 0.4);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 0.6s cubic-bezier(0.16, 1, 0.3, 1) infinite;
    }

    &.btn-secondary,
    &.btn-ghost {
      .spinner {
        border-color: var(--text-muted);
        border-top-color: var(--text-primary);
      }
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
