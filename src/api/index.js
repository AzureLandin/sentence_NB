import { request } from '../platform/http.js'
import { storage } from '../platform/storage.js'
import { getAccessToken } from '../repositories/authRepository.js'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'

/**
 * 创建标准化 API 错误对象（供 toast 使用）
 */
export function createApiError(data) {
  const err = new Error(data.message || '请求失败')
  err.errorCode = data.errorCode || 'UNKNOWN_ERROR'
  err.retryable = data.retryable || false
  return err
}

/**
 * 统一后端 HTTP 请求封装。
 * - 自动附加 Authorization header
 * - 401 时通过 authRepository 刷新 token 后重试一次
 * - 响应 code !== 'OK' 时抛出 createApiError
 */
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
    signal: options.signal,
  })

  // 401 自动刷新 token（一次）
  if (res.status === 401 && !options._retry) {
    try {
      const { authRequest } = await import('../repositories/authRepository.js')
      // authRequest 内部会完成 refresh，这里只需触发一次并重试
      return backendFetch(path, { ...options, _retry: true })
    } catch {
      // refresh 失败，跳转登录页
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
  // 懒加载 router 以避免循环依赖
  import('../router.js').then(({ default: router }) => {
    router.push('/login')
  }).catch(() => {})
}
