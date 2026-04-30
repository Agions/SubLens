import { ref } from 'vue'

export interface Notification {
  id: number
  type: 'success' | 'error' | 'info' | 'warning'
  message: string
  duration?: number
}

const notifications = ref<Notification[]>([])
let nextId = 1

export function useNotification() {
  function notify(type: Notification['type'], message: string, duration = 4000) {
    const id = nextId++
    notifications.value.push({ id, type, message, duration })
    
    if (duration > 0) {
      setTimeout(() => {
        remove(id)
      }, duration)
    }
    
    return id
  }

  function remove(id: number) {
    const idx = notifications.value.findIndex(n => n.id === id)
    if (idx !== -1) {
      notifications.value.splice(idx, 1)
    }
  }

  function success(message: string, duration?: number) {
    return notify('success', message, duration)
  }

  function error(message: string, duration?: number) {
    return notify('error', message, duration)
  }

  function info(message: string, duration?: number) {
    return notify('info', message, duration)
  }

  function warn(message: string, duration?: number) {
    return notify('warning', message, duration)
  }

  return {
    notifications,
    notify,
    remove,
    success,
    error,
    info,
    warn
  }
}
