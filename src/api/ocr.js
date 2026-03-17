import { chatCompletion } from './index.js'
import { useSettingsStore } from '../stores/settings.js'

const OCR_PROMPT = `You are an OCR assistant. Read the image and extract every English sentence as a separate item.

STEP 1 — Read all text from the image, joining text that wraps across lines into a single continuous stream.

STEP 2 — Split that stream into sentences using ONLY these terminal punctuation marks as boundaries:
  • period  .  (but NOT inside abbreviations like "Mr." or decimals like "3.14")
  • exclamation mark  !
  • question mark  ?
  A comma, semicolon, colon, or em-dash does NOT end a sentence.

STEP 3 — Return the sentences as a JSON array. Each element is one complete sentence including its terminal punctuation.

RULES:
- Keep each sentence intact; do NOT paraphrase or merge sentences.
- Fix obvious OCR errors (e.g. l→I, 0→O, rn→m).
- Skip page numbers, headers, captions, and non-English text.
- If a paragraph contains multiple sentences, output each one separately.

OUTPUT FORMAT — return ONLY the raw JSON array, no markdown, no explanation:
["Sentence one.", "Sentence two?", "Sentence three!"]

EXAMPLE:
Image text: "The quick brown fox jumps over the lazy dog. Was it fast? Yes, incredibly fast! Mr. Smith agreed."
Output: ["The quick brown fox jumps over the lazy dog.", "Was it fast?", "Yes, incredibly fast!", "Mr. Smith agreed."]

Now extract sentences from the image:`

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

  // Check if the model returned a refusal or explanation instead of sentences
  const lower = jsonStr.toLowerCase()
  const isRefusal = [
    'i cannot', 'i can\'t', 'i don\'t see', 'no english', 'no text',
    'unable to', 'there are no', 'there is no', 'i apologize',
    '没有英文', '图片中没有', '无法识别', '未检测到', '看不到',
  ].some((phrase) => lower.includes(phrase))

  if (isRefusal) {
    throw new Error('图片中未检测到英文句子，请确认图片内容包含英文文字，或更换图片重试')
  }

  throw new Error('图片识别结果无法解析为英文句子，请检查图片清晰度或更换视觉模型')
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
