import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { getSettings, saveSettings } from '../utils/storage.js'

const SETTINGS_VERSION_KEY = 'sn_settings_version'

function getSettingsVersion() {
  return parseInt(localStorage.getItem(SETTINGS_VERSION_KEY) || '0', 10)
}

function saveSettingsVersion(v) {
  localStorage.setItem(SETTINGS_VERSION_KEY, String(v))
}

export const useSettingsStore = defineStore('settings', () => {
  const defaultSettings = {
    useMode: 'simple',  // 'simple' | 'advanced'
    textApi: {
      provider: 'openai',
      apiFormat: 'openai',
      apiKey: '',
      endpoint: 'https://api.openai.com/v1/chat/completions',
      model: 'gpt-4o',
    },
    visionApi: {
      provider: 'openai',
      apiFormat: 'openai',
      apiKey: '',
      endpoint: 'https://api.openai.com/v1/chat/completions',
      model: 'gpt-4o',
    },
    ui: {
      theme: 'light',
    },
  }

  // Provider presets
  const providerPresets = {
    openai: {
      apiFormat: 'openai',
      endpoint: 'https://api.openai.com/v1/chat/completions',
      models: ['gpt-4o', 'gpt-4o-mini', 'gpt-3.5-turbo'],
      visionModels: ['gpt-4o', 'gpt-4o-mini'],
    },
    qwen: {
      apiFormat: 'openai',
      endpoint: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
      models: ['qwen-plus', 'qwen-turbo', 'qwen-max'],
      visionModels: ['qwen-vl-plus', 'qwen-vl-max'],
    },
    zhipu: {
      apiFormat: 'openai',
      endpoint: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
      models: ['glm-4-plus', 'glm-4-air', 'glm-4-flash'],
      visionModels: ['glm-4v-plus', 'glm-4v'],
    },
    siliconflow: {
      apiFormat: 'openai',
      endpoint: 'https://api.siliconflow.cn/v1/chat/completions',
      models: ['Pro/zai-org/GLM-4.7', 'Qwen/Qwen3-8B', 'deepseek-ai/DeepSeek-V3-0324'],
      visionModels: ['zai-org/GLM-4.6V', 'deepseek-ai/DeepSeek-OCR', 'Qwen/Qwen2.5-VL-72B-Instruct'],
    },
    claude: {
      apiFormat: 'claude',
      endpoint: 'https://api.anthropic.com/v1/messages',
      models: ['claude-3-5-sonnet-20241022', 'claude-3-haiku-20240307'],
      visionModels: ['claude-3-5-sonnet-20241022', 'claude-3-haiku-20240307'],
    },
    custom: {
      apiFormat: 'openai',
      endpoint: '',
      models: [],
      visionModels: [],
    },
  }

  // Migrate from old formats
  function migrateSettings(saved) {
    if (!saved) return null
    // Already has useMode — latest format
    if (saved.useMode && saved.textApi && saved.visionApi) return saved
    // Has textApi/visionApi but no useMode — add it, default to advanced
    if (saved.textApi && saved.visionApi) {
      const inferFormat = (config) => {
        const preset = providerPresets[config.provider]
        return preset ? preset.apiFormat : 'openai'
      }
      return {
        useMode: 'advanced',
        textApi: { ...saved.textApi, apiFormat: saved.textApi.apiFormat || inferFormat(saved.textApi) },
        visionApi: { ...saved.visionApi, apiFormat: saved.visionApi.apiFormat || inferFormat(saved.visionApi) },
        ui: saved.ui || { theme: 'light' },
      }
    }
    // Old single-api format
    if (saved.api) {
      const old = saved.api
      const format = old.provider === 'claude' ? 'claude' : 'openai'
      const apiConfig = {
        provider: old.provider || 'openai',
        apiFormat: format,
        apiKey: old.apiKey || '',
        endpoint: old.endpoint || 'https://api.openai.com/v1/chat/completions',
      }
      return {
        useMode: 'simple',
        textApi: { ...apiConfig, model: old.model || 'gpt-4o' },
        visionApi: { ...apiConfig, model: old.visionModel || old.model || 'gpt-4o' },
        ui: saved.ui || { theme: 'light' },
      }
    }
    return null
  }

  const saved = migrateSettings(getSettings())
  const useMode = ref(saved?.useMode ?? defaultSettings.useMode)
  const textApi = ref({
    ...defaultSettings.textApi,
    ...(saved?.textApi || {}),
  })
  const visionApi = ref({
    ...defaultSettings.visionApi,
    ...(saved?.visionApi || {}),
  })
  const ui = ref(saved?.ui ?? { ...defaultSettings.ui })

  // The API config to use for sentence analysis
  // Simple mode: use visionApi for everything (single model)
  // Advanced mode: use textApi for analysis
  const analysisApi = computed(() => {
    return useMode.value === 'simple' ? visionApi.value : textApi.value
  })

  function setTextProvider(provider) {
    textApi.value.provider = provider
    if (providerPresets[provider]) {
      textApi.value.apiFormat = providerPresets[provider].apiFormat
      textApi.value.endpoint = providerPresets[provider].endpoint
      if (providerPresets[provider].models.length > 0) {
        textApi.value.model = providerPresets[provider].models[0]
      }
    }
  }

  function setVisionProvider(provider) {
    visionApi.value.provider = provider
    if (providerPresets[provider]) {
      visionApi.value.apiFormat = providerPresets[provider].apiFormat
      visionApi.value.endpoint = providerPresets[provider].endpoint
      if (providerPresets[provider].visionModels.length > 0) {
        visionApi.value.model = providerPresets[provider].visionModels[0]
      }
    }
  }

  function copyTextToVision() {
    visionApi.value.provider = textApi.value.provider
    visionApi.value.apiFormat = textApi.value.apiFormat
    visionApi.value.apiKey = textApi.value.apiKey
    visionApi.value.endpoint = textApi.value.endpoint
    visionApi.value.model = textApi.value.model
  }

  function isAnalysisConfigured() {
    const api = analysisApi.value
    return api.apiKey && api.endpoint && api.model
  }

  function isVisionConfigured() {
    return visionApi.value.apiKey && visionApi.value.endpoint && visionApi.value.model
  }

  // Auto-persist 本地 + 防抖入同步队列
  let _syncDebounce = null
  watch([useMode, textApi, visionApi, ui], () => {
    saveSettings({
      useMode: useMode.value,
      textApi: textApi.value,
      visionApi: visionApi.value,
      ui: ui.value,
    })
    // 防抖 2s 后入队，避免每次按键都入队
    clearTimeout(_syncDebounce)
    _syncDebounce = setTimeout(() => {
      import('./sync.js').then(({ useSyncStore }) => {
        const syncStore = useSyncStore()
        const baseVersion = getSettingsVersion()
        const payload = {
          useMode: useMode.value,
          textApi: JSON.parse(JSON.stringify(textApi.value)),
          visionApi: JSON.parse(JSON.stringify(visionApi.value)),
          ui: JSON.parse(JSON.stringify(ui.value)),
        }
        const op = {
          opId: 'op_settings_' + crypto.randomUUID().replace(/-/g, ''),
          entityType: 'setting',
          entityId: 'settings',
          action: 'replace',
          baseVersion,
          payload,
          clientUpdatedAt: new Date().toISOString(),
        }
        syncStore.addToQueue(op).catch(() => {})
      }).catch(() => {})
    }, 2000)
  }, { deep: true })

  /**
   * 将服务端拉取的 setting 变更应用到本地（不触发同步队列）。
   */
  function applyRemoteChange(record) {
    // 暂停 watch 触发同步，直接写值
    if (record.useMode !== undefined) useMode.value = record.useMode
    if (record.textApi !== undefined) textApi.value = record.textApi
    if (record.visionApi !== undefined) visionApi.value = record.visionApi
    if (record.ui !== undefined) ui.value = record.ui
    if (record.version !== undefined) saveSettingsVersion(record.version)
    // 同步保存到 localStorage
    saveSettings({
      useMode: useMode.value,
      textApi: textApi.value,
      visionApi: visionApi.value,
      ui: ui.value,
    })
  }

  return {
    useMode,
    textApi,
    visionApi,
    ui,
    analysisApi,
    providerPresets,
    setTextProvider,
    setVisionProvider,
    copyTextToVision,
    isAnalysisConfigured,
    isVisionConfigured,
    applyRemoteChange,
    getSettingsVersion,
  }
})
