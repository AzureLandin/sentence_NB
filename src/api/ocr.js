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

export async function extractSentences(base64Image) {
  const settings = useSettingsStore()
  const visionModel = settings.api.visionModel || settings.api.model

  const response = await chatCompletion([
    {
      role: 'user',
      content: [
        {
          type: 'text',
          text: OCR_PROMPT,
        },
        {
          type: 'image_url',
          image_url: { url: `data:image/jpeg;base64,${base64Image}` },
        },
      ],
    },
  ], { model: visionModel })

  let jsonStr = response.trim()
  
  // Remove markdown code blocks
  const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (codeBlockMatch) {
    jsonStr = codeBlockMatch[1].trim()
  }
  
  // Extract JSON array if wrapped in other text
  const arrayMatch = jsonStr.match(/\[[\s\S]*\]/)
  if (arrayMatch) {
    jsonStr = arrayMatch[0]
  }

  try {
    const sentences = JSON.parse(jsonStr)
    if (!Array.isArray(sentences)) throw new Error('Invalid format')
    
    // Clean and validate sentences
    return sentences
      .map((s) => {
        if (typeof s !== 'string') return ''
        return s.trim()
          .replace(/\s+/g, ' ')  // Normalize whitespace
          .replace(/\n/g, ' ')    // Remove newlines
      })
      .filter((s) => s.length > 5 && /^[A-Z]/.test(s))  // Must start with capital, min 5 chars
  } catch {
    throw new Error('图片识别结果格式异常，请重试')
  }
}
