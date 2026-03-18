import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { getSettings, saveSettings } from '../utils/storage.js'

export const useSettingsStore = defineStore('settings', () => {
  const defaultSettings = {
    useMode: 'simple',  // 'simple' | 'advanced'
    ui: {
      theme: 'light',
    },
  }

  function _load() {
    const saved = getSettings()
    if (!saved) return null
    // 兼容旧格式：只保留 useMode 和 ui
    return {
      useMode: saved.useMode ?? defaultSettings.useMode,
      ui: saved.ui ?? { ...defaultSettings.ui },
    }
  }

  const saved = _load()
  const useMode = ref(saved?.useMode ?? defaultSettings.useMode)
  const ui = ref(saved?.ui ?? { ...defaultSettings.ui })

  // 自动持久化到 localStorage
  watch([useMode, ui], () => {
    saveSettings({
      useMode: useMode.value,
      ui: ui.value,
    })
  }, { deep: true })

  /**
   * 将服务端拉取的 setting 变更应用到本地（不触发同步队列）。
   * apiKey / endpoint 字段已由服务端过滤，不会出现在 record 中。
   */
  function applyRemoteChange(record) {
    if (record.useMode !== undefined) useMode.value = record.useMode
    if (record.ui !== undefined) ui.value = record.ui
    saveSettings({
      useMode: useMode.value,
      ui: ui.value,
    })
  }

  return {
    useMode,
    ui,
    applyRemoteChange,
  }
})
