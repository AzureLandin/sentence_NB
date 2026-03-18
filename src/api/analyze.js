import { backendFetch } from './index.js'

/**
 * 分析英语句子，调用后端 /api/analyze
 * @param {string} sentence
 * @returns {Promise<object>} 分析结果
 */
export async function analyzeSentence(sentence) {
  if (!sentence?.trim()) throw new Error('请输入需要分析的句子')
  return backendFetch('/api/analyze', {
    method: 'POST',
    body: { sentence: sentence.trim() },
  })
}
