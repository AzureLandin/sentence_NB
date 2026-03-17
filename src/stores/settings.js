import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { getSettings, saveSettings } from '../utils/storage.js'

export const useSettingsStore = defineStore('settings', () => {
  const defaultSettings = {
    api: {
      provider: 'openai',
      apiKey: '',
      endpoint: 'https://api.openai.com/v1/chat/completions',
      model: 'gpt-4o',
      visionModel: 'gpt-4o',
    },
    ui: {
      theme: 'light',
    },
  }

  const saved = getSettings()
  const api = ref({
    ...defaultSettings.api,
    ...(saved?.api || {}),
  })
  const ui = ref(saved?.ui ?? { ...defaultSettings.ui })

  // Provider presets
  const providerPresets = {
    openai: {
      endpoint: 'https://api.openai.com/v1/chat/completions',
      models: ['gpt-4o', 'gpt-4o-mini', 'gpt-3.5-turbo'],
      visionModels: ['gpt-4o', 'gpt-4o-mini'],
    },
    qwen: {
      endpoint: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
      models: ['qwen-plus', 'qwen-turbo', 'qwen-max'],
      visionModels: ['qwen-vl-plus', 'qwen-vl-max'],
    },
    zhipu: {
      endpoint: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
      models: ['glm-4-plus', 'glm-4-air', 'glm-4-flash'],
      visionModels: ['glm-4v-plus', 'glm-4v'],
    },
    claude: {
      endpoint: 'https://api.anthropic.com/v1/messages',
      models: ['claude-3-5-sonnet-20241022', 'claude-3-haiku-20240307'],
      visionModels: ['claude-3-5-sonnet-20241022', 'claude-3-haiku-20240307'],
    },
    custom: {
      endpoint: '',
      models: [],
      visionModels: [],
    },
  }

  function setProvider(provider) {
    api.value.provider = provider
    if (providerPresets[provider]) {
      api.value.endpoint = providerPresets[provider].endpoint
      if (providerPresets[provider].models.length > 0) {
        api.value.model = providerPresets[provider].models[0]
      }
      if (providerPresets[provider].visionModels.length > 0) {
        api.value.visionModel = providerPresets[provider].visionModels[0]
      }
    }
  }

  function setApiKey(key) {
    api.value.apiKey = key
  }

  function setEndpoint(endpoint) {
    api.value.endpoint = endpoint
  }

  function setModel(model) {
    api.value.model = model
  }

  function setVisionModel(model) {
    api.value.visionModel = model
  }

  function isConfigured() {
    return api.value.apiKey && api.value.endpoint && api.value.model
  }

  function isVisionConfigured() {
    return api.value.apiKey && api.value.endpoint && api.value.visionModel
  }

  // Auto-persist
  watch([api, ui], () => {
    saveSettings({ api: api.value, ui: ui.value })
  }, { deep: true })

  return {
    api,
    ui,
    providerPresets,
    setProvider,
    setApiKey,
    setEndpoint,
    setModel,
    setVisionModel,
    isConfigured,
    isVisionConfigured,
  }
})
