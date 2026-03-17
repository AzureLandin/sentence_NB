import { useSettingsStore } from '../stores/settings.js'

export async function chatCompletion(messages, options = {}) {
  const settings = useSettingsStore()
  const { api } = settings

  const model = options.model || api.model

  if (!api.apiKey) {
    throw new Error('请先在设置中配置API Key')
  }

  if (!api.endpoint) {
    throw new Error('请先在设置中配置API端点')
  }

  if (!model) {
    throw new Error('请先在设置中配置模型ID')
  }

  const headers = {
    'Content-Type': 'application/json',
  }

  let body

  if (api.provider === 'claude') {
    headers['x-api-key'] = api.apiKey
    headers['anthropic-version'] = '2023-06-01'
    headers['anthropic-dangerous-direct-browser-access'] = 'true'

    body = {
      model,
      max_tokens: 4096,
      messages: messages.map((m) => ({
        role: m.role === 'system' ? 'user' : m.role,
        content: m.content,
      })),
    }
    delete options.model
    Object.assign(body, options)
  } else {
    headers['Authorization'] = `Bearer ${api.apiKey}`

    body = {
      model,
      messages,
      temperature: 0.3,
    }
    delete options.model
    Object.assign(body, options)
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 60000)

  try {
    const response = await fetch(api.endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const errorMsg = errorData.error?.message || response.statusText

      if (response.status === 401) {
        throw new Error('API Key无效，请检查配置')
      }
      if (response.status === 429) {
        throw new Error('请求过于频繁，请稍后再试')
      }
      if (response.status === 404) {
        throw new Error('模型不存在或API端点错误，请检查模型ID')
      }
      throw new Error(`API请求失败: ${errorMsg}`)
    }

    const data = await response.json()

    if (api.provider === 'claude') {
      return data.content?.[0]?.text || ''
    }

    return data.choices?.[0]?.message?.content || ''
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('请求超时，请检查网络连接')
    }
    throw err
  } finally {
    clearTimeout(timeout)
  }
}

export async function testConnection() {
  const result = await chatCompletion([
    { role: 'user', content: 'Reply with exactly: OK' },
  ])
  return result.includes('OK')
}

export async function validateModel(modelId) {
  const settings = useSettingsStore()
  const { api } = settings

  if (!api.apiKey) {
    throw new Error('请先配置API Key')
  }

  if (!api.endpoint) {
    throw new Error('请先配置API端点')
  }

  if (!modelId) {
    throw new Error('请输入模型ID')
  }

  const headers = {
    'Content-Type': 'application/json',
  }

  let body

  if (api.provider === 'claude') {
    headers['x-api-key'] = api.apiKey
    headers['anthropic-version'] = '2023-06-01'
    headers['anthropic-dangerous-direct-browser-access'] = 'true'

    body = {
      model: modelId,
      max_tokens: 10,
      messages: [{ role: 'user', content: 'Hi' }],
    }
  } else {
    headers['Authorization'] = `Bearer ${api.apiKey}`

    body = {
      model: modelId,
      messages: [{ role: 'user', content: 'Hi' }],
      max_tokens: 10,
    }
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 30000)

  try {
    const response = await fetch(api.endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const errorMsg = errorData.error?.message || response.statusText

      if (response.status === 401) {
        throw new Error('API Key无效')
      }
      if (response.status === 404) {
        throw new Error('模型不存在，请检查模型ID是否正确')
      }
      if (response.status === 429) {
        throw new Error('请求过于频繁，请稍后再试')
      }
      throw new Error(`验证失败: ${errorMsg}`)
    }

    return true
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('请求超时，请检查网络连接')
    }
    throw err
  } finally {
    clearTimeout(timeout)
  }
}