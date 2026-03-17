import { chatCompletion } from './index.js'
import { useSettingsStore } from '../stores/settings.js'

const OCR_PROMPT = `You are an OCR assistant. Extract ALL English sentences from the image.

CRITICAL RULES:
1. Split sentences ONLY by punctuation: period(.), exclamation(!), question mark(?)
2. DO NOT merge or split by meaning - use punctuation ONLY
3. Each sentence ends when you see . ! or ? at the outermost level
4. Merge text that crosses line breaks into the same sentence
5. Fix common OCR errors (l/I, 0/O, etc.)
6. Ignore non-English text, page numbers, headers

OUTPUT FORMAT (strict):
Return ONLY a JSON array. No explanation. No markdown.
["First sentence.", "Second sentence?", "Third!"]

EXAMPLE:
Input text: "The cat sat. On the mat it lay! Was it comfortable?"
Output: ["The cat sat.", "On the mat it lay!", "Was it comfortable?"]

Now extract sentences from the image. Return ONLY the JSON array:`

// DeepSeek-OCR uses a special prompt format per SiliconFlow docs
const DEEPSEEK_OCR_PROMPT = '<image>\n<|grounding|>OCR this image.'

/**
 * Check if the model is a DeepSeek-OCR variant
 */
function isDeepSeekOcr(model) {
  const lower = (model || '').toLowerCase()
  return lower.includes('deepseek') && lower.includes('ocr')
}

/**
 * Check if the model is a PaddleOCR variant
 */
function isPaddleOcr(model) {
  const lower = (model || '').toLowerCase()
  return lower.includes('paddleocr') || lower.includes('paddle-ocr')
}

/**
 * Build messages array based on the model type.
 * Dedicated OCR models need a specific prompt format.
 */
function buildOcrMessages(base64Image, model) {
  const imageUrl = `data:image/jpeg;base64,${base64Image}`

  if (isDeepSeekOcr(model)) {
    // DeepSeek-OCR: image first, then special prompt
    return [{
      role: 'user',
      content: [
        {
          type: 'image_url',
          image_url: { url: imageUrl },
        },
        {
          type: 'text',
          text: DEEPSEEK_OCR_PROMPT,
        },
      ],
    }]
  }

  if (isPaddleOcr(model)) {
    // PaddleOCR-VL: image first, simple OCR instruction
    return [{
      role: 'user',
      content: [
        {
          type: 'image_url',
          image_url: { url: imageUrl },
        },
        {
          type: 'text',
          text: 'OCR this image. Extract all text.',
        },
      ],
    }]
  }

  // General VLM: detailed prompt with instructions
  return [{
    role: 'user',
    content: [
      {
        type: 'text',
        text: OCR_PROMPT,
      },
      {
        type: 'image_url',
        image_url: { url: imageUrl },
      },
    ],
  }]
}

/**
 * Clean raw OCR text: remove coordinate annotations, model markers, HTML tags.
 * Handles formats like:  text[[x1, y1, x2, y2]]  or  text[[x1,y1,x2,y2]]
 */
function cleanOcrText(text) {
  return text
    .replace(/\[\[\d+[\s,]+\d+[\s,]+\d+[\s,]+\d+\]\]/g, '')  // Remove [[x,y,x,y]] coords
    .replace(/<\|[^|]*\|>/g, '')       // Remove markers like <|grounding|>
    .replace(/<[^>]+>/g, '')            // Remove HTML/XML tags
}

/**
 * Join OCR line fragments into continuous text, then split by sentence punctuation.
 * OCR models often split by visual lines, not by sentence boundaries.
 */
function splitTextToSentences(text) {
  const cleaned = cleanOcrText(text)
    .replace(/\r\n/g, '\n')

  // Join lines: if a line does NOT end with sentence punctuation, merge with next line
  const lines = cleaned.split('\n').map((l) => l.trim()).filter(Boolean)
  let merged = ''
  for (const line of lines) {
    if (merged && !merged.match(/[.!?]\s*$/)) {
      // Previous line didn't end with punctuation — continuation
      merged += ' ' + line
    } else {
      merged += (merged ? ' ' : '') + line
    }
  }

  merged = merged.replace(/\s+/g, ' ').trim()
  if (!merged) return []

  // Split by sentence-ending punctuation, keeping the punctuation
  const parts = merged.split(/(?<=[.!?])\s+/)

  return parts
    .map((s) => s.trim())
    .filter((s) => {
      if (s.length <= 5) return false
      if (!/[a-zA-Z]/.test(s)) return false
      return true
    })
}

/**
 * Try to parse the response as a JSON array of sentences.
 * Falls back to splitting plain text if JSON parsing fails.
 */
function parseOcrResponse(response) {
  let jsonStr = cleanOcrText(response).trim()

  // Remove markdown code blocks
  const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (codeBlockMatch) {
    jsonStr = codeBlockMatch[1].trim()
  }

  // Try to extract and parse JSON array
  const arrayMatch = jsonStr.match(/\[[\s\S]*\]/)
  if (arrayMatch) {
    try {
      const sentences = JSON.parse(arrayMatch[0])
      if (Array.isArray(sentences) && sentences.length > 0) {
        const cleaned = sentences
          .map((s) => {
            if (typeof s !== 'string') return ''
            return s.trim().replace(/\s+/g, ' ').replace(/\n/g, ' ')
          })
          .filter((s) => s.length > 5 && /[a-zA-Z]/.test(s))
        if (cleaned.length > 0) return cleaned
      }
    } catch {
      // JSON parse failed, fall through to text splitting
    }
  }

  // Fallback: treat as plain text and split into sentences
  const sentences = splitTextToSentences(jsonStr)
  if (sentences.length > 0) return sentences

  // Nothing worked — show truncated response for debugging
  const preview = response.trim().slice(0, 200)
  throw new Error(`未能从识别结果中提取到英文句子。模型返回: "${preview}"`)
}

export async function extractSentences(base64Image) {
  const settings = useSettingsStore()
  const model = settings.visionApi.model

  let response
  try {
    response = await chatCompletion(
      buildOcrMessages(base64Image, model),
      settings.visionApi,
    )
  } catch (err) {
    throw new Error(`图片识别请求失败: ${err.message}`)
  }

  if (!response || response.trim().length <= 1) {
    throw new Error('视觉模型返回了空结果，该模型可能不支持此类图片识别，请尝试更换视觉模型（推荐 Qwen2.5-VL-72B-Instruct）')
  }

  return parseOcrResponse(response)
}
