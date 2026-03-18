/**
 * authRepository.js
 * 封装所有认证 API 调用，与 UI/Store 解耦。
 * access token 存内存，refresh token 存 localStorage。
 */

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'
const REFRESH_TOKEN_KEY = 'sn_refresh_token'
const DEVICE_ID_KEY = 'sn_device_id'

// 内存中的 access token
let _accessToken = null

// 单飞锁：防止多标签页/并发请求同时 refresh
let _refreshPromise = null

function generateDeviceId() {
  return 'device_' + crypto.randomUUID().replace(/-/g, '')
}

export function getDeviceId() {
  let id = localStorage.getItem(DEVICE_ID_KEY)
  if (!id) {
    id = generateDeviceId()
    localStorage.setItem(DEVICE_ID_KEY, id)
  }
  return id
}

export function getAccessToken() {
  return _accessToken
}

function setTokens(accessToken, refreshToken) {
  _accessToken = accessToken
  if (refreshToken) {
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
  }
}

function clearTokens() {
  _accessToken = null
  localStorage.removeItem(REFRESH_TOKEN_KEY)
}

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) }

  if (_accessToken) {
    headers['Authorization'] = `Bearer ${_accessToken}`
  }

  const res = await fetch(url, { ...options, headers })
  const data = await res.json()

  if (!res.ok) {
    const err = new Error(data.message || '请求失败')
    err.errorCode = data.errorCode || 'UNKNOWN_ERROR'
    err.status = res.status
    err.retryable = data.retryable || false
    throw err
  }

  return data
}

/**
 * 带自动 refresh 的请求。401 时自动刷新 token 后重试一次。
 */
async function authRequest(path, options = {}) {
  try {
    return await request(path, options)
  } catch (err) {
    if (err.status === 401 && localStorage.getItem(REFRESH_TOKEN_KEY)) {
      try {
        await refreshTokens()
        return await request(path, options)
      } catch {
        clearTokens()
        throw err
      }
    }
    throw err
  }
}

async function refreshTokens() {
  if (_refreshPromise) return _refreshPromise

  _refreshPromise = (async () => {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY)
    if (!refreshToken) throw new Error('无 refresh token')

    const data = await request('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    })

    setTokens(data.data.accessToken, data.data.refreshToken)
    return data
  })()

  try {
    return await _refreshPromise
  } finally {
    _refreshPromise = null
  }
}

// ── 公开接口 ────────────────────────────────────────────────

export async function login(email, password) {
  const data = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
  setTokens(data.data.accessToken, data.data.refreshToken)
  return data.data.user
}

export async function register(email, password, displayName) {
  const data = await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, displayName }),
  })
  setTokens(data.data.accessToken, data.data.refreshToken)
  return data.data.user
}

export async function logout() {
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY)
  try {
    await request('/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ refreshToken: refreshToken || '' }),
    })
  } catch {
    // 忽略登出请求失败，本地清理仍需执行
  } finally {
    clearTokens()
  }
}

export async function getCurrentUser() {
  // 尝试用已有 access token 拿用户信息
  if (!_accessToken && !localStorage.getItem(REFRESH_TOKEN_KEY)) {
    return null
  }
  try {
    if (!_accessToken) {
      await refreshTokens()
    }
    const data = await authRequest('/me')
    return data.data
  } catch {
    clearTokens()
    return null
  }
}

export async function tryRestoreSession() {
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY)
  if (!refreshToken) return null
  try {
    await refreshTokens()
    const data = await request('/me')
    return data.data
  } catch {
    clearTokens()
    return null
  }
}

export { authRequest }
