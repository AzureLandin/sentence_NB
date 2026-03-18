import { backendFetch } from './index.js'

/**
 * 从 base64 图片中提取英文句子，调用后端 /api/ocr
 * @param {string} base64Image
 * @param {string} mime
 * @returns {Promise<string[]>} 句子列表
 */
export async function extractSentences(base64Image, mime = 'image/jpeg') {
  const res = await backendFetch('/api/ocr', {
    method: 'POST',
    body: { image: base64Image, mime },
  })
  return res.sentences
}
