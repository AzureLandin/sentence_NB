import { defineStore } from 'pinia'
import { ref } from 'vue'
import { pull as repoPull, push as repoPush } from '../repositories/syncRepository.js'
import { storage } from '../platform/storage.js'
import { isOnline, onNetworkChange } from '../platform/device.js'

const CURSOR_KEY = 'sn_sync_cursor'
const SNAPSHOT_KEY = 'sn_snapshot'

export const useSyncStore = defineStore('sync', () => {
  const status = ref('idle')
  const lastSyncAt = ref(null)

  function getCursor() {
    return storage.get(CURSOR_KEY) || null
  }

  function saveCursor(cursor) {
    if (cursor) storage.set(CURSOR_KEY, cursor)
  }

  function clearCursor() {
    storage.remove(CURSOR_KEY)
  }

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

  async function push() {
    if (!isOnline()) {
      status.value = 'offline'
      return
    }

    const { useSentencesStore } = await import('./sentences.js')
    const sentencesStore = useSentencesStore()

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
      console.warn('[sync] push failed:', err.message)
    }
  }

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
