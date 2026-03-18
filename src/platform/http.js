/**
 * 平台抽象层：HTTP 请求
 * Web 实现：封装 fetch
 * Phase 3 UniApp 替换为 uni.request 实现（同接口）
 */
export async function request(url, options = {}) {
  const response = await fetch(url, {
    method: options.method || 'GET',
    headers: options.headers || {},
    body: options.body ? JSON.stringify(options.body) : undefined,
    signal: options.signal,
  })
  return response
}
