import { watch, onMounted } from 'vue'
import { useSettingsStore } from '@/stores/settings'
import { applyTheme, getTheme, type ThemeName } from '@/themes'

export function useTheme() {
  const settingsStore = useSettingsStore()

  function initTheme() {
    const theme = getTheme(settingsStore.settings.theme)
    applyTheme(theme)
    document.documentElement.setAttribute('data-theme', settingsStore.settings.theme)
  }

  function setTheme(name: ThemeName) {
    settingsStore.updateSetting('theme', name)
    const theme = getTheme(name)
    applyTheme(theme)
    document.documentElement.setAttribute('data-theme', name)
  }

  function toggleTheme() {
    const newTheme: ThemeName = settingsStore.settings.theme === 'dark' ? 'light' : 'dark'
    setTheme(newTheme)
  }

  onMounted(() => {
    initTheme()
  })

  watch(() => settingsStore.settings.theme, (newTheme) => {
    const theme = getTheme(newTheme)
    applyTheme(theme)
    document.documentElement.setAttribute('data-theme', newTheme)
  })

  return {
    currentTheme: settingsStore.settings.theme,
    setTheme,
    toggleTheme,
    initTheme
  }
}
