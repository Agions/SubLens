import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

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

export const useSettingsStore = defineStore('settings', () => {
  // Load from localStorage
  function loadSettings(): Settings {
    try {
      const saved = localStorage.getItem('visionsub-settings')
      if (saved) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) }
      }
    } catch (e) {
      console.warn('[Settings] Failed to load settings:', e)
    }
    return { ...DEFAULT_SETTINGS }
  }
  
  const settings = ref<Settings>(loadSettings())
  
  // Persist on change
  watch(settings, (newSettings) => {
    try {
      const serialized = JSON.stringify(newSettings)
      // 检查 localStorage 容量
      if (serialized.length > 5 * 1024 * 1024) { // 5MB 限制
        console.warn('[Settings] Settings too large to save:', serialized.length, 'bytes')
        return
      }
      localStorage.setItem('visionsub-settings', serialized)
    } catch (e: any) {
      if (e.name === 'QuotaExceededError' || e.code === 22) {
        console.warn('[Settings] localStorage quota exceeded, clearing old data')
        // 尝试清理并重试
        try {
          localStorage.removeItem('visionsub-settings')
          localStorage.setItem('visionsub-settings', JSON.stringify(DEFAULT_SETTINGS))
        } catch {
          console.error('[Settings] Failed to save even after clearing')
        }
      } else {
        console.warn('[Settings] Failed to save settings:', e)
      }
    }
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
