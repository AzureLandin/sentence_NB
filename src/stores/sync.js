import { defineStore } from 'pinia'
import { ref } from 'vue'
import { pull, push } from '../repositories/syncRepository.js'
import {
  enqueue,
  getPendingOps,
  dequeue,
  markRetry,
  addConflict,
  addDeadLetter,
  clearQueue,
} from '../utils/sync/syncQueue.js'

const CURSOR_KEY = 'sn_sync_cursor'
const RETRY_DELAYS = [2000, 5000, 15000, 30000, 60000]

export const useSyncStore = defineStore('sync', () => {
  // idle | syncing | error | offline
  const status = ref('idle')
  const lastSyncAt = ref(null)
  const conflictCount = ref(0)
  const deadLetterCount = ref(0)

  let _flushTimer = null
  let _pullTimer = null

  // ── 游标 ────────────────────────────────────────────────

  function getCursor() {
    return localStorage.getItem(CURSOR_KEY) || null
  }

  function saveCursor(cursor) {
    if (cursor) localStorage.setItem(CURSOR_KEY, cursor)
  }

  function clearCursor() {
    localStorage.removeItem(CURSOR_KEY)
  }

  // ── 入队 ────────────────────────────────────────────────

  async function addToQueue(op) {
    await enqueue(op)
    scheduleFlush(500)
  }

  // ── 调度 ────────────────────────────────────────────────

  function scheduleFlush(delay = 1000) {
    clearTimeout(_flushTimer)
    _flushTimer = setTimeout(() => flushQueue(), delay)
  }

  function startPeriodicPull(intervalMs = 30000) {
    stopPeriodicPull()
    _pullTimer = setInterval(() => incrementalPull(), intervalMs)
  }

  function stopPeriodicPull() {
    if (_pullTimer) clearInterval(_pullTimer)
    _pullTimer = null
  }

  // ── 初始化同步（登录后调用）────────────────────────────

  async function initSync() {
    status.value = 'syncing'
    try {
      await _fullPullAndMerge()
      await flushQueue()
      startPeriodicPull()
      status.value = 'idle'
    } catch (err) {
      status.value = 'error'
      console.error('[sync] initSync failed:', err)
    }
  }

  // ── 全量拉取并建立本地基线 ────────────────────────────

  async function _fullPullAndMerge() {
    clearCursor()
    let cursor = null
    let hasMore = true

    while (hasMore) {
      let result
      try {
        result = await pull(cursor)
      } catch (err) {
        if (err.errorCode === 'CURSOR_EXPIRED' || err.errorCode === 'CURSOR_INVALID') {
          clearCursor()
          cursor = null
          result = await pull(null)
        } else {
          throw err
        }
      }

      await _applyChanges(result.changes)
      cursor = result.nextCursor
      hasMore = result.hasMore
    }

    saveCursor(cursor)
    lastSyncAt.value = Date.now()
  }

  // ── 增量拉取 ──────────────────────────────────────────

  async function incrementalPull() {
    if (status.value === 'syncing') return
    status.value = 'syncing'
    try {
      const cursor = getCursor()
      const result = await pull(cursor)
      await _applyChanges(result.changes)
      saveCursor(result.nextCursor)
      lastSyncAt.value = Date.now()
      status.value = 'idle'
    } catch (err) {
      if (err.errorCode === 'CURSOR_EXPIRED') {
        await _rebuildFromCursorExpiry()
      } else {
        status.value = 'error'
      }
    }
  }

  // ── cursor 过期重建 ────────────────────────────────────

  async function _rebuildFromCursorExpiry() {
    // 保留队列和冲突桶，清 cursor，全量重拉，重放队列
    clearCursor()
    const pendingOps = await getPendingOps()
    await clearQueue()
    await _fullPullAndMerge()
    for (const op of pendingOps) {
      await enqueue(op)
    }
    await flushQueue()
    status.value = 'idle'
  }

  // ── 应用服务端变更到本地 store ──────────────────────────

  async function _applyChanges(changes) {
    if (!changes || changes.length === 0) return

    // 懒引入避免循环依赖
    const { useSentencesStore } = await import('./sentences.js')
    const { useSettingsStore } = await import('./settings.js')
    const sentencesStore = useSentencesStore()
    const settingsStore = useSettingsStore()

    for (const change of changes) {
      const { entityType, record } = change

      if (entityType === 'sentence') {
        await sentencesStore.applyRemoteChange(record)
      } else if (entityType === 'setting') {
        settingsStore.applyRemoteChange(record)
      }
    }
  }

  // ── 推送本地队列 ──────────────────────────────────────

  async function flushQueue() {
    const ops = await getPendingOps()
    if (ops.length === 0) return

    if (status.value !== 'syncing') status.value = 'syncing'

    let results
    try {
      const result = await push(ops)
      results = result.results
      saveCursor(result.nextCursor)
    } catch (err) {
      // 请求级错误
      if (!navigator.onLine || err.message?.includes('fetch')) {
        status.value = 'offline'
        return
      }
      status.value = 'error'
      // 全批退避重试
      for (const op of ops) {
        await markRetry(op.opId)
      }
      const retryCount = ops[0]?._retryCount || 0
      const delay = RETRY_DELAYS[Math.min(retryCount, RETRY_DELAYS.length - 1)]
      scheduleFlush(delay)
      return
    }

    // 处理每条操作结果
    for (const result of results) {
      const { opId, status: opStatus, errorCode } = result

      if (opStatus === 'applied') {
        await dequeue(opId)
      } else if (opStatus === 'conflict') {
        await dequeue(opId)
        conflictCount.value += 1
        const op = ops.find(o => o.opId === opId)
        if (op) {
          await addConflict({
            entityType: op.entityType,
            entityId: op.entityId,
            localSnapshot: op.payload || {},
            serverSnapshot: { version: result.serverVersion },
          })
        }
        // 拉取最新服务端状态
        await incrementalPull()
      } else if (opStatus === 'retryable_error') {
        await markRetry(opId)
        const op = ops.find(o => o.opId === opId)
        const retryCount = op?._retryCount || 0
        const delay = RETRY_DELAYS[Math.min(retryCount, RETRY_DELAYS.length - 1)]
        scheduleFlush(delay)
      } else if (opStatus === 'invalid') {
        await dequeue(opId)
        deadLetterCount.value += 1
        const op = ops.find(o => o.opId === opId)
        if (op) {
          await addDeadLetter(op, errorCode, result.details || {})
        }
      }
    }

    status.value = 'idle'
    lastSyncAt.value = Date.now()
  }

  // ── 网络恢复时触发 ────────────────────────────────────

  function onNetworkRestore() {
    if (status.value === 'offline') {
      status.value = 'idle'
      flushQueue()
      incrementalPull()
    }
  }

  function setOffline() {
    status.value = 'offline'
  }

  return {
    status,
    lastSyncAt,
    conflictCount,
    deadLetterCount,
    addToQueue,
    initSync,
    incrementalPull,
    flushQueue,
    scheduleFlush,
    startPeriodicPull,
    stopPeriodicPull,
    onNetworkRestore,
    setOffline,
  }
})
