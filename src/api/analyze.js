import { chatCompletion, createApiError } from './index.js'
import { useSettingsStore } from '../stores/settings.js'

const ANALYSIS_PROMPT = `分析这个英语句子，返回JSON对象。所有内容必须用中文！

句子：{sentence}

返回格式（纯JSON，无markdown）：
{
  "structure": [
    {"text": "从句/短语原文", "type": "主句/定语从句/状语从句/宾语从句/短语", "translation": "该部分中文翻译"}
  ],
  "grammar": [
    {"point": "语法点名称", "explanation": "中文详细解释", "examples": ["相关例句"]}
  ],
  "vocabulary": [
    {"word": "词汇或表达", "meaning": "中文释义", "example": "例句"}
  ],
  "translation": "通顺的中文翻译",
  "translationNote": "翻译思路分析"
}

重要规则：
1. 所有字段内容必须用中文（type、explanation、meaning、translation、translationNote）
2. 只有 text、word、example 保留英文原文
3. 翻译要通顺自然，符合中文表达习惯
4. 语法解释要通俗易懂，适合中国学习者
5. 翻译思路要说明为什么这样翻译，做了哪些调整

仅返回JSON对象，不要解释。`

/**
 * Analyze an English sentence
 * @param {string} sentence - The sentence to analyze
 * @returns {Promise<object>} Analysis result
 */
export async function analyzeSentence(sentence) {
  if (!sentence?.trim()) {
    throw new Error('请输入需要分析的句子')
  }

  const settings = useSettingsStore()
  const prompt = ANALYSIS_PROMPT.replace('{sentence}', sentence.trim())

  const response = await chatCompletion([
    {
      role: 'system',
      content: '你是一位专业的英语语言学教授，擅长分析英语长难句。所有回答内容必须使用中文，返回严格的JSON格式。',
    },
    {
      role: 'user',
      content: prompt,
    },
  ], settings.analysisApi)

  // Parse JSON from response, handling potential markdown code blocks
  let jsonStr = response.trim()

  // Remove markdown code block wrappers if present
  const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim()
  }

  try {
    const analysis = JSON.parse(jsonStr)

    // Validate required fields
    if (!analysis.structure || !analysis.grammar || !analysis.vocabulary || !analysis.translation) {
      throw createApiError('分析结果缺少必要字段，请重试', { retryable: true, recommendedAction: '重新分析' })
    }

    // Deep clean to ensure all data is serializable for IndexedDB
    const cleanedAnalysis = JSON.parse(JSON.stringify({
      structure: Array.isArray(analysis.structure) ? analysis.structure.map((item) => ({
        text: String(item?.text || ''),
        type: String(item?.type || ''),
        translation: String(item?.translation || ''),
      })) : [],
      grammar: Array.isArray(analysis.grammar) ? analysis.grammar.map((item) => ({
        point: String(item?.point || ''),
        explanation: String(item?.explanation || ''),
        examples: Array.isArray(item?.examples)
          ? item.examples.map((ex) => String(ex || ''))
          : [],
      })) : [],
      vocabulary: Array.isArray(analysis.vocabulary) ? analysis.vocabulary.map((item) => ({
        word: String(item?.word || ''),
        meaning: String(item?.meaning || ''),
        example: String(item?.example || ''),
      })) : [],
      translation: String(analysis.translation || ''),
      translationNote: String(analysis.translationNote || ''),
    }))

    return cleanedAnalysis
  } catch (err) {
    if (err instanceof SyntaxError) {
      throw createApiError('AI返回的分析结果格式异常，请重试', { retryable: true, recommendedAction: '重新分析' })
    }
    throw err
  }
}
