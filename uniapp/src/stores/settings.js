import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { getSettings, saveSettings } from '../utils/storage.js'

export const useSettingsStore = defineStore('settings', () => {
  const defaultSettings = {
    useMode: 'simple',   // 'simple' | 'advanced'
    ui: { theme: 'light' },
  }

  function _load() {
    const saved = getSettings()
    if (!saved) return null
    return {
      useMode: saved.useMode ?? defaultSettings.useMode,
      ui: saved.ui ?? { ...defaultSettings.ui },
    }
  }

  const saved = _load()
  const useMode = ref(saved?.useMode ?? defaultSettings.useMode)
  const ui = ref(saved?.ui ?? { ...defaultSettings.ui })

  watch([useMode, ui], () => {
    saveSettings({ useMode: useMode.value, ui: ui.value })
  }, { deep: true })

  function applyRemoteChange(record) {
    if (record.useMode !== undefined) useMode.value = record.useMode
    if (record.ui !== undefined) ui.value = record.ui
    saveSettings({ useMode: useMode.value, ui: ui.value })
  }

  return { useMode, ui, applyRemoteChange }
})
