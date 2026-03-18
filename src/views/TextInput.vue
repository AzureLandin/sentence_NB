<template>
  <div class="max-w-2xl mx-auto">
    <!-- Header -->
    <div class="flex items-center gap-3 mb-4">
      <router-link to="/" class="text-gray-400 hover:text-gray-600 min-w-[44px] min-h-[44px] flex items-center">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
      </router-link>
      <h1 class="text-xl font-bold text-gray-800">文字输入</h1>
    </div>

    <!-- API not configured warning -->
    <div
      v-if="!settingsStore.isAnalysisConfigured()"
      class="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-800 mb-4 flex items-start gap-2"
    >
      <svg class="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
      <span>
        请先前往
        <router-link to="/settings" class="text-primary-600 underline font-medium">设置页面</router-link>
        配置 API Key
      </span>
    </div>

    <!-- Success notice (after analysis) -->
    <div
      v-if="lastSentenceId"
      class="bg-green-50 border border-green-200 rounded-xl p-3 mb-4 flex items-center justify-between gap-2"
    >
      <div class="flex items-center gap-2 text-sm text-green-700">
        <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
        </svg>
        分析完成
      </div>
      <router-link
        :to="`/sentence/${lastSentenceId}`"
        class="text-sm text-green-700 font-medium underline whitespace-nowrap"
      >
        查看结果 →
      </router-link>
    </div>

    <!-- Input Area -->
    <div class="card mb-4">
      <p class="text-xs text-gray-400 mb-2">粘贴或输入英文长难句，AI 将进行结构分析</p>
      <textarea
        ref="textareaRef"
        v-model="inputText"
        placeholder="例如：The committee, which had been deliberating for weeks, finally reached a consensus..."
        rows="6"
        class="input-field resize-none text-base leading-relaxed"
        :disabled="analyzing"
        @input="onInput"
      ></textarea>

      <!-- Inline validation hint -->
      <p v-if="validationHint" class="text-xs mt-1.5" :class="validationHintColor">
        {{ validationHint }}
      </p>

      <div class="flex items-center justify-between mt-3">
        <span class="text-sm" :class="inputText.length > 2000 ? 'text-red-500 font-medium' : 'text-gray-400'">
          {{ inputText.length }} / 2000
        </span>
        <div class="flex gap-2">
          <button
            v-if="inputText"
            @click="cleanText"
            class="btn-outline text-sm min-h-[44px]"
            :disabled="analyzing"
            title="清理多余空格和换行"
          >
            清理
          </button>
          <button
            @click="inputText = ''; lastSentenceId = ''; error = ''"
            class="btn-outline text-sm min-h-[44px]"
            :disabled="analyzing || !inputText"
          >
            清空
          </button>
        </div>
      </div>
    </div>

    <!-- Error -->
    <div
      v-if="error"
      class="bg-red-50 border border-red-200 rounded-xl p-4 mb-4"
    >
      <div class="flex items-start gap-2">
        <svg class="w-5 h-5 flex-shrink-0 mt-0.5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div class="flex-1">
          <p class="text-sm text-red-700">{{ error }}</p>
          <button
            v-if="canRetry"
            @click="handleAnalyze"
            class="mt-2 text-xs px-3 py-1.5 rounded-lg bg-red-100 hover:bg-red-200 text-red-700 font-medium transition-colors min-h-[36px]"
          >
            重试
          </button>
        </div>
        <button @click="error = ''; canRetry = false" class="text-red-400 hover:text-red-600 min-w-[32px] min-h-[32px] flex items-center justify-center">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="analyzing" class="card text-center py-8 mb-4">
      <div class="inline-block w-8 h-8 border-4 border-primary-200 border-t-primary-500 rounded-full animate-spin mb-3"></div>
      <p class="text-gray-600 font-medium">正在分析句子...</p>
      <p class="text-xs text-gray-400 mt-1">AI 正在解析句子结构，请稍候</p>
    </div>

    <!-- Sticky CTA at bottom (mobile: fixed above bottom nav) -->
    <div class="fixed bottom-[calc(3.5rem+env(safe-area-inset-bottom))] left-0 right-0 px-4 sm:static sm:bottom-auto sm:px-0 sm:mt-0">
      <button
        @click="handleAnalyze"
        :disabled="analyzing || !inputText.trim() || !!validationError"
        class="w-full py-3.5 rounded-xl font-semibold transition-all text-base min-h-[52px]"
        :class="analyzing || !inputText.trim() || !!validationError
          ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
          : 'bg-accent-500 hover:bg-accent-600 text-white shadow-sm active:scale-95'"
      >
        <span v-if="analyzing">分析中...</span>
        <span v-else-if="validationError" class="text-sm">{{ validationError }}</span>
        <span v-else>✨ 开始分析</span>
      </button>
    </div>

    <!-- Spacer so content isn't hidden behind sticky button on mobile -->
    <div class="h-20 sm:hidden"></div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { analyzeSentence } from '../api/analyze.js'
import { useSentencesStore, useSettingsStore } from '../stores/index.js'

const sentencesStore = useSentencesStore()
const settingsStore = useSettingsStore()

const textareaRef = ref(null)
const inputText = ref('')
const analyzing = ref(false)
const error = ref('')
const canRetry = ref(false)
const lastSentenceId = ref('')

onMounted(() => {
  // Auto-focus the textarea
  textareaRef.value?.focus()
})

function onInput() {
  // Clear error and success notice when user starts typing
  if (error.value) {
    error.value = ''
    canRetry.value = false
  }
}

// Real-time validation — only show hint when there's meaningful content
const validationError = computed(() => {
  const trimmed = inputText.value.trim()
  if (!trimmed) return null
  if (trimmed.length > 2000) return '内容过长（最多 2000 字符）'
  const letters = (trimmed.match(/[a-zA-Z]/g) || []).length
  if (letters < 10) return '英文字母不足，请输入英语句子'
  if (letters / trimmed.length < 0.3) return '英文比例过低，请输入英语句子'
  return null
})

const validationHint = computed(() => validationError.value)

const validationHintColor = computed(() => {
  if (!validationError.value) return 'text-gray-400'
  return 'text-red-500'
})

function cleanText() {
  inputText.value = inputText.value
    .replace(/\r\n/g, ' ')
    .replace(/\n/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

async function handleAnalyze() {
  if (!inputText.value.trim()) return
  if (!settingsStore.isAnalysisConfigured()) {
    error.value = '请先在设置中配置 API Key'
    return
  }
  if (validationError.value) {
    error.value = validationError.value
    return
  }

  analyzing.value = true
  error.value = ''
  canRetry.value = false
  lastSentenceId.value = ''

  try {
    const analysis = await analyzeSentence(inputText.value.trim())
    const sentence = await sentencesStore.addSentence(
      inputText.value.trim(),
      'text',
      analysis,
    )
    // Stay on this page, show success notice with link to result
    lastSentenceId.value = sentence.id
    inputText.value = ''
    textareaRef.value?.focus()
  } catch (err) {
    error.value = err.message || '分析失败，请重试'
    canRetry.value = true
  } finally {
    analyzing.value = false
  }
}
</script>
