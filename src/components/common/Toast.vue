<script setup lang="ts">
import { useNotification } from '@/composables/useNotification'

const { notifications, remove } = useNotification()

function getIcon(type: string) {
  switch (type) {
    case 'success': return 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'
    case 'error': return 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z'
    case 'warning': return 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z'
    case 'info': return 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
    default: return ''
  }
}

function getProgress(n: { duration?: number }) {
  // Auto-dismiss after 5 seconds
  if (n.duration === undefined) {
    return 5000
  }
  return n.duration
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
          <!-- Progress bar -->
          <div 
            class="notification-progress" 
            :style="{ animationDuration: `${getProgress(n)}ms` }"
          />
          
          <!-- Icon -->
          <svg class="notification-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path :d="getIcon(n.type)" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          
          <!-- Message -->
          <span class="notification-message">{{ n.message }}</span>
          
          <!-- Close button -->
          <button
            class="notification-close"
            @click="remove(n.id)"
            aria-label="关闭通知"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M6 18L18 6M6 6l12 12" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
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
  @include flex-column;
  gap: 10px;
  max-width: 380px;
  pointer-events: none;
}

.notification {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  padding-left: 18px;
  border-radius: 10px;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  box-shadow: 
    0 4px 16px rgba(0, 0, 0, 0.35),
    0 0 0 1px rgba(255, 255, 255, 0.05) inset;
  pointer-events: auto;
  font-size: 14px;
  color: var(--text-primary);
  overflow: hidden;

  // Left accent border
  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 4px;
  }

  &.notification-success {
    &::before { background: $success; }
    .notification-icon { color: $success; }
    .notification-progress { background: linear-gradient(90deg, $success, rgba($success, 0.3)); }
  }

  &.notification-error {
    &::before { background: $error; }
    .notification-icon { color: $error; }
    .notification-progress { background: linear-gradient(90deg, $error, rgba($error, 0.3)); }
  }

  &.notification-warning {
    &::before { background: $warning; }
    .notification-icon { color: $warning; }
    .notification-progress { background: linear-gradient(90deg, $warning, rgba($warning, 0.3)); }
  }

  &.notification-info {
    &::before { background: $info; }
    .notification-icon { color: $info; }
    .notification-progress { background: linear-gradient(90deg, $info, rgba($info, 0.3)); }
  }
}

// Progress bar (auto-dismiss)
.notification-progress {
  position: absolute;
  bottom: 0;
  left: 0;
  height: 3px;
  width: 100%;
  transform-origin: left;
  animation: progress-shrink linear forwards;
  border-radius: 0 2px 0 0;
}

@keyframes progress-shrink {
  from { transform: scaleX(1); }
  to { transform: scaleX(0); }
}

.notification-icon {
  flex-shrink: 0;
  width: 20px;
  height: 20px;
}

.notification-message {
  flex: 1;
  word-break: break-word;
  line-height: 1.4;
}

.notification-close {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 6px;
  background: transparent;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  transition: all 150ms ease;

  svg {
    width: 16px;
    height: 16px;
  }

  &:hover {
    background: var(--bg-overlay);
    color: var(--text-primary);
  }

  &:active {
    transform: scale(0.92);
  }
}

// Transitions
.notification-enter-active {
  animation: notification-in 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}

.notification-leave-active {
  animation: notification-out 0.25s ease forwards;
}

@keyframes notification-in {
  from {
    opacity: 0;
    transform: translateX(100%) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateX(0) scale(1);
  }
}

@keyframes notification-out {
  from {
    opacity: 1;
    transform: translateX(0) scale(1);
    max-height: 100px;
    margin-bottom: 0;
  }
  to {
    opacity: 0;
    transform: translateX(50%) scale(0.95);
    max-height: 0;
    margin-bottom: -10px;
    padding-top: 0;
    padding-bottom: 0;
  }
}
</style>
