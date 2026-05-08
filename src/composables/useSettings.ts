/**
 * useSettings - Settings tab state and logic
 * Extracted from SidePanel.vue Settings tab
 */
import { ref, watch, onMounted, computed } from 'vue'
import { useSettingsStore } from '@/stores/settings'
import { useTheme } from '@/composables/useTheme'
import { useSystemCheck } from '@/composables/useSystemCheck'

export function useSettings() {
  const settingsStore = useSettingsStore()
  const { setTheme } = useTheme()
  const { checkDependencies, lastResult } = useSystemCheck()

  // Local settings state synced with store
  const localSettings = ref({ ...settingsStore.settings })

  // Watch for changes and sync to store
  watch(localSettings, (newSettings) => {
    Object.assign(settingsStore.settings, newSettings)
  }, { deep: true })

  function handleThemeChange() {
    setTheme(localSettings.value.theme)
  }

  // System dependencies status
  const systemDeps = computed(() => lastResult.value?.dependencies ?? [])

  onMounted(() => {
    checkDependencies()
  })

  return {
    localSettings,
    systemDeps,
    handleThemeChange,
  }
}
