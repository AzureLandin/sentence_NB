import { backendFetch } from './index.js'

export async function analyzeSentence(sentence) {
  if (!sentence?.trim()) throw new Error('请输入需要分析的句子')
  return backendFetch('/api/analyze', {
    method: 'POST',
    body: { sentence: sentence.trim() },
  })
}
