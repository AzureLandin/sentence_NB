/**
 * Determine if an API config uses Claude format.
 * @param {object} apiConfig - { provider, apiFormat, apiKey, endpoint, model }
 * @returns {boolean}
 */
function isClaudeFormat(apiConfig) {
  return apiConfig.apiFormat === 'claude'
}

/**
 * Create a standardized API error with retryable hint and recommended action.
 * @param {string} message - User-facing error message
 * @param {object} options - { retryable, recommendedAction }
 */
export function createApiError(message, { retryable = false, recommendedAction = '' } = {}) {
  const err = new Error(message)
  err.retryable = retryable
  err.recommendedAction = recommendedAction
  return err
}

/**
 * Send a chat completion request using the provided API config.
 * @param {Array} messages - Chat messages
 * @param {object} apiConfig - API configuration { provider, apiFormat, apiKey, endpoint, model }
 * @param {object} options - Additional request options
 */
export async function chatCompletion(messages, apiConfig, options = {}) {
  const { apiKey, endpoint, model } = apiConfig

  if (!apiKey) {
    throw new Error('请先在设置中配置API Key')
  }

  if (!endpoint) {
    throw new Error('请先在设置中配置API端点')
  }

  if (!model) {
    throw new Error('请先在设置中配置模型ID')
  }

  const headers = {
    'Content-Type': 'application/json',
  }

  let body

  if (isClaudeFormat(apiConfig)) {
    headers['x-api-key'] = apiKey
    headers['anthropic-version'] = '2023-06-01'
    headers['anthropic-dangerous-direct-browser-access'] = 'true'

    body = {
      model,
      max_tokens: 4096,
      messages: messages.map((m) => ({
        role: m.role === 'system' ? 'user' : m.role,
        content: m.content,
      })),
      ...options,
    }
  } else {
    headers['Authorization'] = `Bearer ${apiKey}`

    body = {
      model,
      messages,
      temperature: 0.3,
      ...options,
    }
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 60000)

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const errorMsg = errorData.error?.message || response.statusText

      if (response.status === 401) {
        throw createApiError('API Key无效，请检查配置', { retryable: false, recommendedAction: '前往设置页面重新填写 API Key' })
      }
      if (response.status === 429) {
        throw createApiError('请求过于频繁，请稍后再试', { retryable: true, recommendedAction: '等待几秒后重试' })
      }
      if (response.status === 404) {
        throw createApiError('模型不存在或API端点错误，请检查模型ID', { retryable: false, recommendedAction: '前往设置页面检查模型ID和端点' })
      }
      throw createApiError(`API请求失败: ${errorMsg}`, { retryable: true, recommendedAction: '请重试' })
    }

    const data = await response.json()

    if (isClaudeFormat(apiConfig)) {
      return data.content?.[0]?.text || ''
    }

    const message = data.choices?.[0]?.message
    return message?.content || ''
  } catch (err) {
    if (err.name === 'AbortError') {
      throw createApiError('请求超时，请检查网络连接', { retryable: true, recommendedAction: '检查网络后重试' })
    }
    throw err
  } finally {
    clearTimeout(timeout)
  }
}

export async function testConnection(apiConfig) {
  const result = await chatCompletion([
    { role: 'user', content: 'Hi' },
  ], apiConfig)
  return result.length > 0
}

export async function validateModel(apiConfig) {
  const { apiKey, endpoint, model } = apiConfig

  if (!apiKey) {
    throw new Error('请先配置API Key')
  }

  if (!endpoint) {
    throw new Error('请先配置API端点')
  }

  if (!model) {
    throw new Error('请输入模型ID')
  }

  const headers = {
    'Content-Type': 'application/json',
  }

  let body

  if (isClaudeFormat(apiConfig)) {
    headers['x-api-key'] = apiKey
    headers['anthropic-version'] = '2023-06-01'
    headers['anthropic-dangerous-direct-browser-access'] = 'true'

    body = {
      model,
      max_tokens: 10,
      messages: [{ role: 'user', content: 'Hi' }],
    }
  } else {
    headers['Authorization'] = `Bearer ${apiKey}`

    body = {
      model,
      messages: [{ role: 'user', content: 'Hi' }],
      max_tokens: 10,
    }
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 30000)

  try {
    const response = await fetch(endpoint, {
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
