/**
 * syncRepository.js
 * 封装所有同步 API 调用（pull / push）。
 * 依赖 authRepository 的 authRequest 自动处理 token 刷新。
 */

import { authRequest } from './authRepository.js'
import { getDeviceId } from './authRepository.js'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'

async function syncRequest(path, options = {}) {
  return authRequest(`${path}`, options)
}

/**
 * 拉取增量变更。
 * cursor 为空时全量拉取；带 cursor 时拉增量。
 * Returns: { changes, nextCursor, hasMore }
 */
export async function pull(cursor = null) {
  const params = cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''
  const data = await syncRequest(`/sync/pull${params}`)
  return data.data
}

/**
 * 批量推送本地操作到服务端。
 * operations: Array of operation objects (spec §6.4)
 * Returns: { results, nextCursor }
 */
export async function push(operations) {
  const deviceId = getDeviceId()
  const data = await syncRequest('/sync/push', {
    method: 'POST',
    body: JSON.stringify({ deviceId, operations }),
  })
  return data.data
}

/**
 * 通过 sync/push 写入 settings（entityType=setting, action=replace）。
 */
export async function upsertSettingsViaSync(payload, baseVersion) {
  const deviceId = getDeviceId()
  const opId = 'op_settings_' + crypto.randomUUID().replace(/-/g, '')
  const result = await push([
    {
      opId,
      entityType: 'setting',
      entityId: deviceId,
      action: 'replace',
      baseVersion,
      payload,
    },
  ])
  return result.results[0]
}

/**
 * 列出句子（调试/只读，走资源接口）。
 */
export async function listSentences({ limit = 50, cursor = null, includeDeleted = false } = {}) {
  const params = new URLSearchParams()
  if (limit) params.set('limit', limit)
  if (cursor) params.set('cursor', cursor)
  if (includeDeleted) params.set('includeDeleted', 'true')
  const data = await syncRequest(`/sentences?${params}`)
  return data.data
}
