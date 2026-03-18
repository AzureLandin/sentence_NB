/**
 * UniApp 版本的存储工具
 * 用 uni.getStorageSync/uni.setStorageSync 替代 IndexedDB。
 * 句子数据存储在 uni storage 的 'sn_sentences' key 下（JSON 序列化数组）。
 */

const SENTENCES_KEY = 'sn_sentences'

function loadAll() {
  try {
    const raw = uni.getStorageSync(SENTENCES_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveAll(sentences) {
  uni.setStorageSync(SENTENCES_KEY, JSON.stringify(sentences))
}

export async function getAllSentences() {
  return loadAll()
}

export async function getSentenceById(id) {
  const all = loadAll()
  return all.find((s) => s.id === id) || null
}

export async function saveSentence(sentence) {
  const all = loadAll()
  const clean = JSON.parse(JSON.stringify(sentence))
  const idx = all.findIndex((s) => s.id === clean.id)
  if (idx !== -1) {
    all[idx] = clean
  } else {
    all.push(clean)
  }
  saveAll(all)
}

export async function deleteSentence(id) {
  const all = loadAll().filter((s) => s.id !== id)
  saveAll(all)
}

export async function clearAllSentences() {
  uni.setStorageSync(SENTENCES_KEY, '[]')
}

// settings helpers（与 platform/storage.js 统一 key 保持兼容）
export function getSettings() {
  try {
    const raw = uni.getStorageSync('sentence-notebook-settings')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function saveSettings(settings) {
  uni.setStorageSync('sentence-notebook-settings', JSON.stringify(settings))
}
