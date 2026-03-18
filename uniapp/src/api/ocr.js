import { backendFetch } from './index.js'

export async function extractSentences(base64Image, mime = 'image/jpeg') {
  const res = await backendFetch('/api/ocr', {
    method: 'POST',
    body: { image: base64Image, mime },
  })
  return res.sentences
}
