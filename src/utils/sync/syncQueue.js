/**
 * syncQueue.js
 * 本地离线操作队列，存储在 IndexedDB。
 * 每条记录是一个待推送的 sync operation。
 */

const DB_NAME = 'sn-sync-db'
const DB_VERSION = 1
const QUEUE_STORE = 'sync_queue'
const CONFLICT_STORE = 'sync_conflicts'
const DEAD_LETTER_STORE = 'sync_dead_letters'

let _db = null

function openSyncDB() {
  if (_db) return Promise.resolve(_db)

  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)

    req.onupgradeneeded = (e) => {
      const db = e.target.result

      if (!db.objectStoreNames.contains(QUEUE_STORE)) {
        const qs = db.createObjectStore(QUEUE_STORE, { keyPath: 'opId' })
        qs.createIndex('createdAt', 'createdAt', { unique: false })
        qs.createIndex('status', 'status', { unique: false })
      }

      if (!db.objectStoreNames.contains(CONFLICT_STORE)) {
        const cs = db.createObjectStore(CONFLICT_STORE, { keyPath: 'id' })
        cs.createIndex('entityId', 'entityId', { unique: false })
        cs.createIndex('detectedAt', 'detectedAt', { unique: false })
      }

      if (!db.objectStoreNames.contains(DEAD_LETTER_STORE)) {
        const dl = db.createObjectStore(DEAD_LETTER_STORE, { keyPath: 'opId' })
        dl.createIndex('firstFailedAt', 'firstFailedAt', { unique: false })
        dl.createIndex('status', 'status', { unique: false })
      }
    }

    req.onsuccess = () => { _db = req.result; resolve(_db) }
    req.onerror = () => reject(req.error)
  })
}

function txGet(store, key) {
  return openSyncDB().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly')
    const req = tx.objectStore(store).get(key)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  }))
}

function txPut(store, value) {
  return openSyncDB().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite')
    const req = tx.objectStore(store).put(JSON.parse(JSON.stringify(value)))
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  }))
}

function txDelete(store, key) {
  return openSyncDB().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite')
    const req = tx.objectStore(store).delete(key)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  }))
}

function txGetAll(store) {
  return openSyncDB().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly')
    const req = tx.objectStore(store).getAll()
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  }))
}

// ── 同步队列 ────────────────────────────────────────────────

/**
 * 入队一条操作。
 * @param {object} op - spec §6.4 格式的 operation 对象（含 opId）
 */
export async function enqueue(op) {
  const record = {
    ...op,
    _queuedAt: Date.now(),
    _retryCount: 0,
    _status: 'pending', // pending | retrying
  }
  await txPut(QUEUE_STORE, record)
}

/**
 * 获取所有待推送的操作，按入队时间排序。
 */
export async function getPendingOps() {
  const all = await txGetAll(QUEUE_STORE)
  return all
    .filter(r => r._status === 'pending' || r._status === 'retrying')
    .sort((a, b) => a._queuedAt - b._queuedAt)
}

/**
 * 将操作从队列中移除（applied）。
 */
export async function dequeue(opId) {
  await txDelete(QUEUE_STORE, opId)
}

/**
 * 增加重试计数并保留在队列（retryable_error）。
 */
export async function markRetry(opId) {
  const record = await txGet(QUEUE_STORE, opId)
  if (!record) return
  record._retryCount = (record._retryCount || 0) + 1
  record._status = 'retrying'
  record._lastRetryAt = Date.now()
  await txPut(QUEUE_STORE, record)
}

/**
 * 将整个队列中的操作全部清空（全量重建时使用）。
 */
export async function clearQueue() {
  const all = await txGetAll(QUEUE_STORE)
  for (const r of all) {
    await txDelete(QUEUE_STORE, r.opId)
  }
}

// ── 冲突桶 ────────────────────────────────────────────────

export async function addConflict({ entityType, entityId, localSnapshot, serverSnapshot }) {
  const record = {
    id: crypto.randomUUID(),
    entityType,
    entityId,
    localSnapshot: JSON.parse(JSON.stringify(localSnapshot)),
    serverSnapshot: JSON.parse(JSON.stringify(serverSnapshot || {})),
    detectedAt: Date.now(),
    status: 'pending', // pending | resolved | ignored
  }
  await txPut(CONFLICT_STORE, record)
  return record
}

export async function getConflicts() {
  const all = await txGetAll(CONFLICT_STORE)
  return all.filter(r => r.status === 'pending').sort((a, b) => b.detectedAt - a.detectedAt)
}

export async function resolveConflict(id, resolution) {
  const record = await txGet(CONFLICT_STORE, id)
  if (!record) return
  record.status = resolution // 'resolved' | 'ignored'
  await txPut(CONFLICT_STORE, record)
}

export async function clearOldConflicts(daysOld = 30) {
  const cutoff = Date.now() - daysOld * 86400 * 1000
  const all = await txGetAll(CONFLICT_STORE)
  for (const r of all) {
    if (r.detectedAt < cutoff) await txDelete(CONFLICT_STORE, r.id)
  }
}

// ── 死信队列 ────────────────────────────────────────────────

export async function addDeadLetter(op, errorCode, details = {}) {
  const existing = await txGet(DEAD_LETTER_STORE, op.opId)
  const record = {
    opId: op.opId,
    entityType: op.entityType,
    entityId: op.entityId,
    action: op.action,
    payload: op.payload || null,
    errorCode,
    details,
    firstFailedAt: existing?.firstFailedAt || Date.now(),
    lastFailedAt: Date.now(),
    retryCount: (existing?.retryCount || 0) + 1,
    status: 'pending', // pending | ignored | resolved
  }
  await txPut(DEAD_LETTER_STORE, record)
}

export async function getDeadLetters() {
  const all = await txGetAll(DEAD_LETTER_STORE)
  return all.filter(r => r.status === 'pending').sort((a, b) => b.lastFailedAt - a.lastFailedAt)
}

export async function resolveDeadLetter(opId, action) {
  const record = await txGet(DEAD_LETTER_STORE, opId)
  if (!record) return
  record.status = action // 'ignored' | 'resolved'
  await txPut(DEAD_LETTER_STORE, record)
}

export async function exportDeadLetters() {
  const all = await txGetAll(DEAD_LETTER_STORE)
  return JSON.stringify(all, null, 2)
}
