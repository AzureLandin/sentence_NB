<template>
  <div class="max-w-2xl mx-auto">
    <!-- Header -->
    <div class="flex items-center gap-3 mb-6">
      <router-link to="/" class="text-gray-400 hover:text-gray-600">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
      </router-link>
      <h1 class="text-xl font-bold text-gray-800">文本输入</h1>
    </div>

    <!-- Input Area -->
    <div class="card mb-4">
      <textarea
        v-model="inputText"
        placeholder="请输入或粘贴需要分析的英语长难句..."
        rows="6"
        class="input-field resize-none text-base leading-relaxed"
        :disabled="analyzing"
      ></textarea>
      <div class="flex items-center justify-between mt-3">
        <span class="text-sm text-gray-400">{{ inputText.length }} 字符</span>
        <div class="flex gap-2">
          <button @click="inputText = ''" class="btn-outline text-sm" :disabled="analyzing || !inputText">
            清空
          </button>
          <button @click="handleAnalyze" class="btn-accent text-sm" :disabled="analyzing || !inputText.trim()">
            {{ analyzing ? '分析中...' : '开始分析' }}
          </button>
        </div>
      </div>
    </div>

    <!-- API not configured warning -->
    <div
      v-if="!settingsStore.isAnalysisConfigured()"
      class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800 mb-4"
    >
      请先前往
      <router-link to="/settings" class="text-primary-600 underline font-medium">设置页面</router-link>
      配置API Key。
    </div>

    <!-- Error -->
    <div
      v-if="error"
      class="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700 mb-4"
    >
      {{ error }}
      <button @click="error = ''" class="ml-2 underline">关闭</button>
    </div>

    <!-- Loading -->
    <div v-if="analyzing" class="card text-center py-10">
      <div class="inline-block w-8 h-8 border-4 border-primary-200 border-t-primary-500 rounded-full animate-spin mb-3"></div>
      <p class="text-gray-500">正在使用AI分析句子，请稍候...</p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { analyzeSentence } from '../api/analyze.js'
import { useSentencesStore, useSettingsStore } from '../stores/index.js'

const router = useRouter()
const sentencesStore = useSentencesStore()
const settingsStore = useSettingsStore()

const inputText = ref('')
const analyzing = ref(false)
const error = ref('')

async function handleAnalyze() {
  if (!inputText.value.trim()) return
  if (!settingsStore.isAnalysisConfigured()) {
    error.value = '请先在设置中配置API Key'
    return
  }

  analyzing.value = true
  error.value = ''

  try {
    const analysis = await analyzeSentence(inputText.value.trim())
    const sentence = await sentencesStore.addSentence(
      inputText.value.trim(),
      'text',
      analysis
    )
    router.push(`/sentence/${sentence.id}`)
  } catch (err) {
    error.value = err.message || '分析失败，请重试'
  } finally {
    analyzing.value = false
  }
}
</script>
