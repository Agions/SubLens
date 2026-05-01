import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import {
  LOCALSTORAGE_KEY_SETTINGS,
  LOCALSTORAGE_KEY_THUMBNAILS,
  LOCALSTORAGE_KEY_CACHE,
  LOCALSTORAGE_KEY_TEMP,
  LOCALSTORAGE_SIZE_LIMIT,
} from '@/utils/constants'

export type Theme = 'dark' | 'light'
export type Language = 'zh-CN' | 'en-US'

export interface Settings {
  theme: Theme
  language: Language
  autoSave: boolean
  autoSaveInterval: number // seconds
  showThumbnails: boolean
  confirmDelete: boolean
  maxHistory: number
}

const DEFAULT_SETTINGS: Settings = {
  theme: 'dark',
  language: 'zh-CN',
  autoSave: true,
  autoSaveInterval: 60,
  showThumbnails: true,
  confirmDelete: true,
  maxHistory: 50
}

/**
 * 渐进式清理 localStorage 中的非必要数据
 * @param keys 要清理的 key 前缀列表
 */
function cleanupLocalStorage(keys: string[]) {
  try {
    const allKeys = Object.keys(localStorage)
    const keySet = new Set(keys)
    for (const key of allKeys) {
      if (keySet.has(key) || keys.some(k => key.startsWith(k))) {
        try {
          localStorage.removeItem(key)
          console.warn('[HardSubX Settings] Cleaned up:', key)
        } catch {
          // 单个 key 删除失败不影响其他
        }
      }
    }
  } catch (e) {
    console.warn('[HardSubX Settings] Failed to cleanup localStorage:', e)
  }
}

export const useSettingsStore = defineStore('settings', () => {
  // Load from localStorage
  function loadSettings(): Settings {
    try {
      const saved = localStorage.getItem(LOCALSTORAGE_KEY_SETTINGS)
      if (saved) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) }
      }
    } catch (e) {
      console.warn('[HardSubX Settings] Failed to load settings:', e)
    }
    return { ...DEFAULT_SETTINGS }
  }
  
  const settings = ref<Settings>(loadSettings())
  
  // Persist on change (debounced to avoid per-property serialization)
  let saveTimer: ReturnType<typeof setTimeout> | null = null
  watch(settings, (newSettings) => {
    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = setTimeout(() => {
      try {
        const serialized = JSON.stringify(newSettings)
        if (serialized.length > LOCALSTORAGE_SIZE_LIMIT) {
          console.warn('[HardSubX Settings] Settings too large to save:', serialized.length, 'bytes')
          return
        }
        localStorage.setItem(LOCALSTORAGE_KEY_SETTINGS, serialized)
      } catch (e: unknown) {
        const err = e as { name?: string }
        if (err.name === 'QuotaExceededError') {
          console.warn('[HardSubX Settings] localStorage quota exceeded, attempting cleanup')
          cleanupLocalStorage([LOCALSTORAGE_KEY_THUMBNAILS, LOCALSTORAGE_KEY_CACHE, LOCALSTORAGE_KEY_TEMP])
          try {
            localStorage.setItem(LOCALSTORAGE_KEY_SETTINGS, JSON.stringify(newSettings))
            console.info('[HardSubX Settings] Successfully saved after cleanup')
          } catch {
            console.warn('[HardSubX Settings] Cleanup insufficient, saving minimal config')
            try {
              localStorage.setItem(LOCALSTORAGE_KEY_SETTINGS, JSON.stringify({
                theme: newSettings.theme,
                language: newSettings.language
              }))
            } catch {
              console.error('[HardSubX Settings] Failed to save even minimal config')
            }
          }
        } else {
          console.warn('[HardSubX Settings] Failed to save settings:', err)
        }
      }
    }, 100)
  }, { deep: true })
  
  function updateSetting<K extends keyof Settings>(key: K, value: Settings[K]) {
    settings.value[key] = value
  }
  
  function resetSettings() {
    settings.value = { ...DEFAULT_SETTINGS }
  }
  
  function toggleTheme() {
    settings.value.theme = settings.value.theme === 'dark' ? 'light' : 'dark'
  }
  
  return {
    settings,
    updateSetting,
    resetSettings,
    toggleTheme
  }
})
