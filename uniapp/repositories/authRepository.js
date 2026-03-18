/**
 * authRepository.js - UniApp 版本
 * 使用 uni.request 替代 fetch，uni storage 替代 localStorage。
 */

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'
const REFRESH_TOKEN_KEY = 'sn_refresh_token'
const DEVICE_ID_KEY = 'sn_device_id'

// 内存中的 access token
let _accessToken = null
let _refreshPromise = null

function generateDeviceId() {
  return 'device_' + Math.random().toString(36).slice(2) + Date.now().toString(36)
}

export function getDeviceId() {
  let id = uni.getStorageSync(DEVICE_ID_KEY)
  if (!id) {
    id = generateDeviceId()
    uni.setStorageSync(DEVICE_ID_KEY, id)
  }
  return id
}

export function getAccessToken() {
  return _accessToken
}

function setTokens(accessToken, refreshToken) {
  _accessToken = accessToken
  if (refreshToken) {
    uni.setStorageSync(REFRESH_TOKEN_KEY, refreshToken)
  }
}

function clearTokens() {
  _accessToken = null
  uni.removeStorageSync(REFRESH_TOKEN_KEY)
}

function uniRequest(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = `${BASE_URL}${path}`
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    }
    if (_accessToken) {
      headers['Authorization'] = `Bearer ${_accessToken}`
    }

    uni.request({
      url,
      method: options.method || 'GET',
      data: options.body ? JSON.parse(options.body) : undefined,
      header: headers,
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data)
        } else {
          const data = res.data || {}
          const err = new Error(data.message || '请求失败')
          err.errorCode = data.errorCode || 'UNKNOWN_ERROR'
          err.status = res.statusCode
          err.retryable = data.retryable || false
          reject(err)
        }
      },
      fail: (err) => {
        reject(new Error(err.errMsg || '网络请求失败'))
      },
    })
  })
}

async function authRequest(path, options = {}) {
  try {
    return await uniRequest(path, options)
  } catch (err) {
    if (err.status === 401 && uni.getStorageSync(REFRESH_TOKEN_KEY)) {
      try {
        await refreshTokens()
        return await uniRequest(path, options)
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
    const refreshToken = uni.getStorageSync(REFRESH_TOKEN_KEY)
    if (!refreshToken) throw new Error('无 refresh token')

    const data = await uniRequest('/auth/refresh', {
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

// ── 公开接口 ──────────────────────────────────────────────

export async function login(email, password) {
  const data = await uniRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
  setTokens(data.data.accessToken, data.data.refreshToken)
  return data.data.user
}

export async function register(email, password, displayName) {
  const data = await uniRequest('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, displayName }),
  })
  setTokens(data.data.accessToken, data.data.refreshToken)
  return data.data.user
}

export async function logout() {
  const refreshToken = uni.getStorageSync(REFRESH_TOKEN_KEY)
  try {
    await uniRequest('/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ refreshToken: refreshToken || '' }),
    })
  } catch {
    // 忽略登出请求失败
  } finally {
    clearTokens()
  }
}

export async function tryRestoreSession() {
  const refreshToken = uni.getStorageSync(REFRESH_TOKEN_KEY)
  if (!refreshToken) return null
  try {
    await refreshTokens()
    const data = await uniRequest('/me')
    return data.data
  } catch {
    clearTokens()
    return null
  }
}

export { authRequest }

// 供 api/index.js 的 401 retry 使用
export const tryRefreshTokens = refreshTokens
