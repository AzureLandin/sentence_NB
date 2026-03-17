import { chatCompletion } from './index.js'

const ANALYSIS_PROMPT = `Analyze this English sentence and return a JSON object.

Sentence: {sentence}

Return format (strict JSON, no markdown):
{
  "structure": [
    {"text": "clause/phrase text", "type": "main clause/relative clause/adverbial clause/noun clause/phrase", "translation": "Chinese translation"}
  ],
  "grammar": [
    {"point": "grammar point name", "explanation": "detailed explanation in Chinese", "examples": ["example sentences"]}
  ],
  "vocabulary": [
    {"word": "word or expression", "meaning": "Chinese meaning", "example": "example sentence"}
  ],
  "translation": "natural Chinese translation",
  "translationNote": "translation reasoning"
}

TRANSLATION RULES (critical):
1. Translate for natural Chinese flow, NOT word-by-word
2. Adjust word order to fit Chinese expression habits
3. Use appropriate Chinese idioms when suitable
4. Break long sentences into shorter segments if needed
5. Preserve the original meaning and tone
6. Avoid translationese (生硬翻译腔)

TRANSLATION NOTE should explain:
- Why you chose this translation
- What adjustments were made for Chinese expression
- Key translation challenges and solutions

GRAMMAR points should be practical and useful for learners.

Return ONLY the JSON object, no explanation.`

/**
 * Analyze an English sentence
 * @param {string} sentence - The sentence to analyze
 * @returns {Promise<object>} Analysis result
 */
export async function analyzeSentence(sentence) {
  if (!sentence?.trim()) {
    throw new Error('请输入需要分析的句子')
  }

  const prompt = ANALYSIS_PROMPT.replace('{sentence}', sentence.trim())

  const response = await chatCompletion([
    {
      role: 'system',
      content: 'You are an expert English linguistics professor specializing in analyzing complex English sentences. Provide clear, practical analysis for Chinese learners. Return strict JSON format only.',
    },
    {
      role: 'user',
      content: prompt,
    },
  ])

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
      throw new Error('分析结果缺少必要字段')
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
      throw new Error('AI返回的分析结果格式异常，请重试')
    }
    throw err
  }
}
