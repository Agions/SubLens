<script setup lang="ts">
import { useNotification } from '@/composables/useNotification'

const { notifications, remove } = useNotification()

function getIcon(type: string) {
  switch (type) {
    case 'success': return '✓'
    case 'error': return '✕'
    case 'warning': return '⚠'
    case 'info': return 'ℹ'
    default: return ''
  }
}
</script>

<template>
  <Teleport to="body">
    <div class="notification-container" role="region" aria-label="通知">
      <TransitionGroup name="notification">
        <div
          v-for="n in notifications"
          :key="n.id"
          :class="['notification', `notification-${n.type}`]"
          role="alert"
          :aria-live="n.type === 'error' ? 'assertive' : 'polite'"
        >
          <span class="notification-icon" aria-hidden="true">{{ getIcon(n.type) }}</span>
          <span class="notification-message">{{ n.message }}</span>
          <button
            class="notification-close"
            @click="remove(n.id)"
            aria-label="关闭通知"
          >×</button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped lang="scss">
.notification-container {
  position: fixed;
  top: 16px;
  right: 16px;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-width: 360px;
  pointer-events: none;
}

.notification {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  border-radius: 8px;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  pointer-events: auto;
  font-size: 14px;
  color: var(--text-primary);

  &.notification-success {
    border-left: 3px solid $success;
    .notification-icon { color: $success; }
  }

  &.notification-error {
    border-left: 3px solid $error;
    .notification-icon { color: $error; }
  }

  &.notification-warning {
    border-left: 3px solid $warning;
    .notification-icon { color: $warning; }
  }

  &.notification-info {
    border-left: 3px solid $info;
    .notification-icon { color: $info; }
  }
}

.notification-icon {
  font-size: 16px;
  font-weight: bold;
  flex-shrink: 0;
}

.notification-message {
  flex: 1;
  word-break: break-word;
}

.notification-close {
  background: none;
  border: none;
  color: var(--color-text-secondary, #888);
  font-size: 18px;
  cursor: pointer;
  padding: 0 0 0 8px;
  line-height: 1;
  flex-shrink: 0;

  &:hover {
    color: var(--text-secondary);
  }
}

.notification-enter-active,
.notification-leave-active {
  transition: all 0.3s ease;
}

.notification-enter-from {
  opacity: 0;
  transform: translateX(100%);
}

.notification-leave-to {
  opacity: 0;
  transform: translateX(100%);
}
</style>
