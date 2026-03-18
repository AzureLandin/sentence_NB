import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { generateUUID } from '../utils/uuid.js'
import { analyzeSentence } from '../api/analyze.js'
import {
  getAllSentences,
  saveSentence as dbSave,
  deleteSentence as dbDelete,
  clearAllSentences as dbClear,
} from '../utils/storage.js'

export const useSentencesStore = defineStore('sentences', () => {
  const sentences = ref([])
  const loading = ref(false)
  const searchQuery = ref('')
  const filterTag = ref('')
  const sortOrder = ref('desc') // 'asc' | 'desc'

  // Computed: filtered & sorted
  const filteredSentences = computed(() => {
    let result = [...sentences.value]

    if (searchQuery.value.trim()) {
      const query = searchQuery.value.toLowerCase()
      result = result.filter((s) =>
        s.content.toLowerCase().includes(query) ||
        s.analysis?.translation?.toLowerCase().includes(query)
      )
    }

    if (filterTag.value) {
      result = result.filter((s) => s.tags.includes(filterTag.value))
    }

    result.sort((a, b) => {
      return sortOrder.value === 'desc'
        ? b.createdAt - a.createdAt
        : a.createdAt - b.createdAt
    })

    return result
  })

  const allTags = computed(() => {
    const tagSet = new Set()
    sentences.value.forEach((s) => s.tags.forEach((t) => tagSet.add(t)))
    return [...tagSet].sort()
  })

  async function loadSentences() {
    loading.value = true
    try {
      sentences.value = await getAllSentences()
    } catch (err) {
      console.error('Failed to load sentences:', err)
    } finally {
      loading.value = false
    }
  }

  async function _triggerPush() {
    try {
      const { useSyncStore } = await import('./sync.js')
      const syncStore = useSyncStore()
      await syncStore.push()
    } catch { /* 未登录时静默跳过 */ }
  }

  async function addSentence(content, source = 'text', analysis = null) {
    const now = Date.now()
    const cleanAnalysis = analysis
      ? JSON.parse(JSON.stringify({ ...analysis, analyzedAt: now }))
      : null
    const sentence = {
      id: generateUUID(),
      content: String(content || ''),
      source: String(source || 'text'),
      createdAt: now,
      updatedAt: now,
      tags: [],
      analysis: cleanAnalysis,
      _version: 0,
    }
    await dbSave(sentence)
    sentences.value.push(sentence)
    await _triggerPush()
    return sentence
  }

  async function updateSentence(id, updates) {
    const idx = sentences.value.findIndex((s) => s.id === id)
    if (idx === -1) return null

    const existingData = JSON.parse(JSON.stringify(sentences.value[idx]))
    const updatesData = JSON.parse(JSON.stringify(updates))

    const updated = {
      ...existingData,
      ...updatesData,
      updatedAt: Date.now(),
    }
    await dbSave(updated)
    sentences.value[idx] = updated
    await _triggerPush()
    return updated
  }

  async function updateAnalysis(id, analysis) {
    const cleanAnalysis = JSON.parse(JSON.stringify(analysis))
    return updateSentence(id, {
      analysis: { ...cleanAnalysis, analyzedAt: Date.now() },
    })
  }

  async function updateTags(id, tags) {
    const cleanTags = Array.isArray(tags)
      ? tags.map((t) => String(t || '')).filter(Boolean)
      : []
    return updateSentence(id, { tags: cleanTags })
  }

  async function removeSentence(id) {
    await dbDelete(id)
    sentences.value = sentences.value.filter((s) => s.id !== id)
    await _triggerPush()
  }

  async function clearAll() {
    await dbClear()
    sentences.value = []
  }

  async function addSentencesFromPhoto(contents, options = {}) {
    const { onProgress = null } = options
    const normalized = [...new Set(
      (contents || [])
        .map((item) => String(item || '').trim())
        .filter((item) => item.length > 2)
    )]

    const result = {
      total: normalized.length,
      successIds: [],
      failed: [],
    }

    for (let i = 0; i < normalized.length; i += 1) {
      const content = normalized[i]
      const sentence = await addSentence(content, 'photo', null)

      try {
        const analysis = await analyzeSentence(content)
        await updateAnalysis(sentence.id, analysis)
        result.successIds.push(sentence.id)
      } catch (err) {
        result.failed.push({
          id: String(sentence.id),
          content: String(content),
          error: String(err?.message || '分析失败，请重试'),
        })
      }

      if (typeof onProgress === 'function') {
        onProgress({
          current: i + 1,
          total: normalized.length,
          sentenceId: sentence.id,
        })
      }
    }

    return result
  }

  async function addSentencesFromPhotoBackground(contents) {
    const normalized = [...new Set(
      (contents || [])
        .map((item) => String(item || '').trim())
        .filter((item) => item.length > 2)
    )]

    const sentenceIds = []
    for (const content of normalized) {
      const sentence = await addSentence(content, 'photo', null)
      sentenceIds.push(sentence.id)
    }

    ;(async () => {
      for (const id of sentenceIds) {
        try {
          const sentence = getSentenceById(id)
          if (!sentence || sentence.analysis) continue
          const analysis = await analyzeSentence(sentence.content)
          await updateAnalysis(id, analysis)
        } catch (err) {
          console.error(`分析句子 ${id} 失败:`, err)
        }
      }
    })()
  }

  async function retrySentenceAnalyses(ids = [], onProgress = null) {
    const validIds = [...new Set(ids)].filter(Boolean)
    const result = {
      total: validIds.length,
      successIds: [],
      failed: [],
    }

    for (let i = 0; i < validIds.length; i += 1) {
      const id = validIds[i]
      const target = getSentenceById(id)

      if (!target) {
        result.failed.push({ id: String(id), content: '', error: '句子不存在或已被删除' })
      } else {
        try {
          const analysis = await analyzeSentence(target.content)
          await updateAnalysis(id, analysis)
          result.successIds.push(String(id))
        } catch (err) {
          result.failed.push({
            id: String(id),
            content: String(target.content || ''),
            error: String(err?.message || '分析失败，请重试'),
          })
        }
      }

      if (typeof onProgress === 'function') {
        onProgress({
          current: i + 1,
          total: validIds.length,
          sentenceId: id,
        })
      }
    }

    return result
  }

  function getSentenceById(id) {
    return sentences.value.find((s) => s.id === id) || null
  }

  function exportData() {
    return JSON.stringify(sentences.value, null, 2)
  }

  async function importData(jsonString) {
    const data = JSON.parse(jsonString)
    if (!Array.isArray(data)) throw new Error('Invalid data format')

    for (const item of data) {
      if (!item.id || !item.content) continue
      await dbSave(item)
    }
    await loadSentences()
  }

  async function applyRemoteChange(record) {
    const clean = JSON.parse(JSON.stringify(record))
    clean.createdAt = clean.createdAt ? new Date(clean.createdAt).getTime() : Date.now()
    clean.updatedAt = clean.updatedAt ? new Date(clean.updatedAt).getTime() : Date.now()
    clean.deletedAt = clean.deletedAt ? new Date(clean.deletedAt).getTime() : null
    clean._version = clean.version || 0

    const idx = sentences.value.findIndex((s) => s.id === clean.id)

    if (clean.deletedAt) {
      if (idx !== -1) {
        await dbDelete(clean.id)
        sentences.value.splice(idx, 1)
      }
      return
    }

    await dbSave(clean)
    if (idx !== -1) {
      sentences.value[idx] = clean
    } else {
      sentences.value.push(clean)
    }
  }

  return {
    sentences,
    loading,
    searchQuery,
    filterTag,
    sortOrder,
    filteredSentences,
    allTags,
    loadSentences,
    addSentence,
    updateSentence,
    updateAnalysis,
    updateTags,
    removeSentence,
    clearAll,
    addSentencesFromPhoto,
    addSentencesFromPhotoBackground,
    retrySentenceAnalyses,
    getSentenceById,
    exportData,
    importData,
    applyRemoteChange,
  }
})
