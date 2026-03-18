import { defineStore } from 'pinia'
import { ref } from 'vue'
import { backendFetch } from '../api/index.js'

export const useAiConfigStore = defineStore('aiConfig', () => {
  // 展示用状态，Key 已由后端脱敏（如 "sk-****1234" 或 null 表示使用平台默认）
  const textProvider   = ref(null)
  const textApiKey     = ref(null)
  const textModel      = ref(null)
  const visionProvider = ref(null)
  const visionApiKey   = ref(null)
  const visionModel    = ref(null)
  const loaded         = ref(false)
  const loading        = ref(false)
  const error          = ref('')

  async function fetch() {
    loading.value = true
    error.value = ''
    try {
      const data = await backendFetch('/api/ai-config')
      textProvider.value   = data.textProvider
      textApiKey.value     = data.textApiKey
      textModel.value      = data.textModel
      visionProvider.value = data.visionProvider
      visionApiKey.value   = data.visionApiKey
      visionModel.value    = data.visionModel
      loaded.value = true
    } catch (err) {
      error.value = err.message || '加载 AI 配置失败'
    } finally {
      loading.value = false
    }
  }

  async function save(payload) {
    loading.value = true
    error.value = ''
    try {
      await backendFetch('/api/ai-config', { method: 'PUT', body: payload })
      await fetch()
    } catch (err) {
      error.value = err.message || '保存 AI 配置失败'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function testConnection(type = 'text') {
    const res = await backendFetch('/api/ai-config/test', {
      method: 'POST',
      body: { type },
    })
    return res
  }

  return {
    textProvider, textApiKey, textModel,
    visionProvider, visionApiKey, visionModel,
    loaded, loading, error,
    fetch, save, testConnection,
  }
})
