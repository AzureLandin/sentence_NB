import { request } from '../platform/http.js'
import { storage } from '../platform/storage.js'
import { getAccessToken } from '../repositories/authRepository.js'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'

export function createApiError(data) {
  const err = new Error(data.message || '请求失败')
  err.errorCode = data.errorCode || 'UNKNOWN_ERROR'
  err.retryable = data.retryable || false
  return err
}

export async function backendFetch(path, options = {}) {
  const token = getAccessToken()
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  }

  const res = await request(`${BASE_URL}${path}`, {
    method: options.method || 'GET',
    headers,
    body: options.body,
  })

  // 401 auto-refresh token (once)
  if (res.status === 401 && !options._retry) {
    try {
      // 动态导入以避免循环依赖；refreshTokens 会刷新内存中的 accessToken
      const mod = await import('../repositories/authRepository.js')
      if (mod.tryRefreshTokens) {
        await mod.tryRefreshTokens()
      }
      return backendFetch(path, { ...options, _retry: true })
    } catch {
      _handleLogout()
      throw new Error('SESSION_EXPIRED')
    }
  }

  const data = await res.json()
  if (data.code !== 'OK') throw createApiError(data)
  return data.data
}

function _handleLogout() {
  storage.remove('sn_access_token')
  storage.remove('sn_refresh_token')
  storage.remove('sn_snapshot')
  // UniApp 中使用 uni.reLaunch 跳转登录页
  uni.reLaunch({ url: '/pages/auth/login' })
}
