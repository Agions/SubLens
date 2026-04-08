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

/**
 * 渐进式清理 localStorage 中的非必要数据
 * @param keys 要清理的 key 前缀列表
 */
function cleanupLocalStorage(keys: string[]) {
  try {
    const allKeys = Object.keys(localStorage)
    for (const key of allKeys) {
      // 清理指定的 key 和带有这些前缀的 key
      if (keys.includes(key) || keys.some(k => key.startsWith(k))) {
        try {
          localStorage.removeItem(key)
          console.debug('[HardSubX Settings] Cleaned up:', key)
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
      const saved = localStorage.getItem('hardsubx-settings')
      if (saved) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) }
      }
    } catch (e) {
      console.warn('[[HardSubX Settings] Failed to load settings:', e)
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
        console.warn('[HardSubX Settings] Settings too large to save:', serialized.length, 'bytes')
        return
      }
      localStorage.setItem('hardsubx-settings', serialized)
    } catch (e: unknown) {
      if (e.name === 'QuotaExceededError' || e.code === 22) {
        console.warn('[HardSubX Settings] localStorage quota exceeded, attempting cleanup')
        // 渐进式清理：先尝试清理其他非必要数据
        cleanupLocalStorage(['hardsubx-thumbnails', 'hardsubx-cache', 'hardsubx-temp'])
        
        // 重试保存
        try {
          localStorage.setItem('hardsubx-settings', JSON.stringify(newSettings))
          console.info('[HardSubX Settings] Successfully saved after cleanup')
        } catch {
          // 如果还是失败，保存最小可用配置
          console.warn('[HardSubX Settings] Cleanup insufficient, saving minimal config')
          try {
            localStorage.setItem('hardsubx-settings', JSON.stringify({
              theme: newSettings.theme,
              language: newSettings.language
            }))
          } catch {
            console.error('[HardSubX Settings] Failed to save even minimal config')
          }
        }
      } else {
        console.warn('[HardSubX Settings] Failed to save settings:', e)
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
