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
  background: var(--color-bg-elevated, #2a2a2a);
  border: 1px solid var(--color-border, #404040);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  pointer-events: auto;
  font-size: 14px;
  color: var(--color-text, #e0e0e0);

  &.notification-success {
    border-left: 3px solid #4caf50;
    .notification-icon { color: #4caf50; }
  }

  &.notification-error {
    border-left: 3px solid #f44336;
    .notification-icon { color: #f44336; }
  }

  &.notification-warning {
    border-left: 3px solid #ff9800;
    .notification-icon { color: #ff9800; }
  }

  &.notification-info {
    border-left: 3px solid #2196f3;
    .notification-icon { color: #2196f3; }
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
    color: var(--color-text, #e0e0e0);
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
