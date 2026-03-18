import { defineStore } from 'pinia'
import { ref } from 'vue'
import { pull as repoPull, push as repoPush } from '../repositories/syncRepository.js'
import { storage } from '../platform/storage.js'
import { isOnline, onNetworkChange } from '../platform/device.js'

const CURSOR_KEY = 'sn_sync_cursor'
const SNAPSHOT_KEY = 'sn_snapshot'

export const useSyncStore = defineStore('sync', () => {
  // idle | syncing | error | offline
  const status = ref('idle')
  const lastSyncAt = ref(null)

  // ── 游标 ────────────────────────────────────────────────

  function getCursor() {
    return storage.get(CURSOR_KEY) || null
  }

  function saveCursor(cursor) {
    if (cursor) storage.set(CURSOR_KEY, cursor)
  }

  function clearCursor() {
    storage.remove(CURSOR_KEY)
  }

  // ── 拉取 ─────────────────────────────────────────────

  /**
   * 从服务端拉取数据，写入 store + 本地快照缓存。
   * 登录成功后调用一次，作为全量初始化。
   */
  async function pull() {
    if (status.value === 'syncing') return
    status.value = 'syncing'
    try {
      clearCursor()
      let cursor = null
      let hasMore = true

      while (hasMore) {
        const result = await repoPull(cursor)
        await _applyChanges(result.changes)
        cursor = result.nextCursor
        hasMore = result.hasMore
      }

      saveCursor(cursor)

      // 保存本地快照（供快速启动渲染）
      const { useSentencesStore } = await import('./sentences.js')
      const sentencesStore = useSentencesStore()
      storage.set(SNAPSHOT_KEY, JSON.stringify(sentencesStore.sentences))

      lastSyncAt.value = Date.now()
      status.value = 'idle'
    } catch (err) {
      status.value = isOnline() ? 'error' : 'offline'
      console.error('[sync] pull failed:', err)
    }
  }

  // ── 推送 ─────────────────────────────────────────────

  /**
   * 将本地当前数据全量推送到服务端。
   * 数据变更（add/update/delete）后直接调用，失败则 toast 提示。
   */
  async function push() {
    if (!isOnline()) {
      status.value = 'offline'
      return
    }

    const { useSentencesStore } = await import('./sentences.js')
    const sentencesStore = useSentencesStore()

    // 构建 upsert 操作列表
    const operations = sentencesStore.sentences.map((s) => ({
      opId: 'op_' + s.id.replace(/-/g, '') + '_' + Date.now(),
      entityType: 'sentence',
      entityId: s.id,
      action: 'upsert',
      baseVersion: s._version || 0,
      payload: {
        content: s.content,
        tags: s.tags || [],
        analysis: s.analysis || null,
        source: s.source || 'text',
      },
      clientUpdatedAt: new Date(s.updatedAt || Date.now()).toISOString(),
    }))

    if (operations.length === 0) return

    try {
      status.value = 'syncing'
      const result = await repoPush(operations)
      if (result.nextCursor) saveCursor(result.nextCursor)
      lastSyncAt.value = Date.now()
      status.value = 'idle'
    } catch (err) {
      status.value = isOnline() ? 'error' : 'offline'
      // toast 提示用户
      console.warn('[sync] push failed:', err.message)
    }
  }

  // ── 应用服务端变更 ────────────────────────────────────

  async function _applyChanges(changes) {
    if (!changes || changes.length === 0) return

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

  // ── 网络恢复时触发推送 ────────────────────────────────

  onNetworkChange((online) => {
    if (online && status.value === 'offline') {
      status.value = 'idle'
      push()
    } else if (!online) {
      status.value = 'offline'
    }
  })

  return {
    status,
    lastSyncAt,
    pull,
    push,
  }
})
