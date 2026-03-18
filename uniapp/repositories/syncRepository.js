/**
 * syncRepository.js - UniApp 版本
 */

import { authRequest } from './authRepository.js'
import { getDeviceId } from './authRepository.js'

export async function pull(cursor = null) {
  const params = cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''
  const data = await authRequest(`/sync/pull${params}`)
  return data.data
}

export async function push(operations) {
  const deviceId = getDeviceId()
  const data = await authRequest('/sync/push', {
    method: 'POST',
    body: JSON.stringify({ deviceId, operations }),
  })
  return data.data
}

export async function upsertSettingsViaSync(payload, baseVersion) {
  const deviceId = getDeviceId()
  const opId = 'op_settings_' + Math.random().toString(36).slice(2)
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
