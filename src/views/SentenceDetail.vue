<template>
  <div class="max-w-2xl mx-auto pb-[calc(5rem+env(safe-area-inset-bottom))]">
    <!-- Header -->
    <div class="flex items-center gap-3 mb-4">
      <router-link to="/collection" class="text-gray-400 hover:text-gray-600 min-w-[44px] min-h-[44px] flex items-center">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
      </router-link>
      <h1 class="text-xl font-bold text-gray-800">句子详情</h1>
    </div>

    <!-- Not found -->
    <div v-if="!sentence" class="card text-center py-12">
      <div class="text-4xl mb-3">🔍</div>
      <p class="text-gray-500 mb-4">句子不存在或已被删除</p>
      <router-link to="/collection" class="btn-outline text-sm">返回收藏</router-link>
    </div>

    <template v-else>
      <!-- 1. Original Sentence (most important - first) -->
      <div class="card mb-3">
        <div class="flex items-start justify-between gap-2 mb-2">
          <h3 class="text-xs font-medium text-gray-400 uppercase tracking-wide">原句</h3>
          <span class="text-xs text-gray-400">{{ sentence.source === 'photo' ? '📷 拍照' : '✍️ 文字' }}</span>
        </div>
        <p class="text-gray-800 leading-relaxed text-[17px]">{{ sentence.content }}</p>
        <p class="text-xs text-gray-400 mt-2">{{ formattedDate }}</p>
      </div>

      <!-- 2. Translation (key insight - second) -->
      <div v-if="sentence.analysis?.translation" class="card mb-3">
        <h3 class="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">译文</h3>
        <p class="text-gray-800 leading-relaxed">{{ sentence.analysis.translation }}</p>
        <div v-if="sentence.analysis.translationNote" class="mt-3 pt-3 border-t border-gray-100">
          <p class="text-xs text-gray-400 mb-1">翻译思路</p>
          <p class="text-gray-600 text-sm leading-relaxed">{{ sentence.analysis.translationNote }}</p>
        </div>
      </div>

      <!-- 3. Tags -->
      <div class="card mb-3">
        <h3 class="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">标签</h3>
        <TagInput v-model="tags" />
        <button
          v-if="tagsChanged"
          @click="saveTags"
          class="btn-primary text-sm mt-2 min-h-[44px]"
        >
          保存标签
        </button>
      </div>

      <!-- 4. Analysis sections (collapsible) -->
      <div v-if="sentence.analysis" class="space-y-3 mb-3">
        <!-- Structure -->
        <div class="card">
          <button
            @click="toggle('structure')"
            class="w-full flex items-center justify-between min-h-[44px]"
          >
            <span class="font-medium text-gray-800 flex items-center gap-2">
              <span>🔍</span> 句子结构
            </span>
            <svg
              class="w-4 h-4 text-gray-400 transition-transform"
              :class="{ 'rotate-180': expanded.structure }"
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          <div v-show="expanded.structure" class="mt-3 space-y-2">
            <div
              v-for="(part, i) in sentence.analysis.structure"
              :key="i"
              class="bg-blue-50 rounded-lg p-3"
            >
              <div class="flex items-start gap-2">
                <span class="text-xs bg-blue-200 text-blue-800 px-2 py-0.5 rounded-full whitespace-nowrap mt-0.5 flex-shrink-0">
                  {{ part.type }}
                </span>
                <div>
                  <p class="text-gray-800 font-medium text-sm">{{ part.text }}</p>
                  <p class="text-gray-500 text-sm mt-0.5">{{ part.translation }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Grammar -->
        <div class="card">
          <button
            @click="toggle('grammar')"
            class="w-full flex items-center justify-between min-h-[44px]"
          >
            <span class="font-medium text-gray-800 flex items-center gap-2">
              <span>📖</span> 语法点
            </span>
            <svg
              class="w-4 h-4 text-gray-400 transition-transform"
              :class="{ 'rotate-180': expanded.grammar }"
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          <div v-show="expanded.grammar" class="mt-3 space-y-2">
            <div
              v-for="(item, i) in sentence.analysis.grammar"
              :key="i"
              class="bg-green-50 rounded-lg p-3"
            >
              <h4 class="font-semibold text-green-800 text-sm mb-1">{{ item.point }}</h4>
              <p class="text-gray-700 text-sm">{{ item.explanation }}</p>
              <div v-if="item.examples?.length" class="mt-2 space-y-1">
                <p
                  v-for="(ex, j) in item.examples"
                  :key="j"
                  class="text-sm text-gray-500 italic"
                >{{ ex }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Vocabulary -->
        <div class="card">
          <button
            @click="toggle('vocabulary')"
            class="w-full flex items-center justify-between min-h-[44px]"
          >
            <span class="font-medium text-gray-800 flex items-center gap-2">
              <span>📝</span> 重点词汇
            </span>
            <svg
              class="w-4 h-4 text-gray-400 transition-transform"
              :class="{ 'rotate-180': expanded.vocabulary }"
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          <div v-show="expanded.vocabulary" class="mt-3 space-y-2">
            <div
              v-for="(item, i) in sentence.analysis.vocabulary"
              :key="i"
              class="bg-purple-50 rounded-lg p-3"
            >
              <div class="flex items-baseline gap-2 mb-1">
                <span class="font-bold text-purple-800">{{ item.word }}</span>
                <span class="text-gray-600 text-sm">{{ item.meaning }}</span>
              </div>
              <p v-if="item.example" class="text-sm text-gray-500 italic">{{ item.example }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- No analysis yet -->
      <div v-else class="card mb-3 text-center py-8">
        <p class="text-gray-500 mb-1">尚未分析此句子</p>
        <p class="text-xs text-gray-400 mb-4">点击下方"重新分析"按钮开始</p>
      </div>

      <!-- Re-analysis error -->
      <div
        v-if="analysisError"
        class="bg-red-50 border border-red-200 rounded-xl p-4 mb-3 text-sm text-red-700"
      >
        {{ analysisError }}
        <button @click="analysisError = ''" class="ml-2 underline text-xs">关闭</button>
      </div>

      <!-- Re-analyzing overlay -->
      <div v-if="reAnalyzing" class="card text-center py-6 mb-3">
        <div class="inline-block w-8 h-8 border-4 border-primary-200 border-t-primary-500 rounded-full animate-spin mb-2"></div>
        <p class="text-gray-500 text-sm">正在重新分析...</p>
      </div>
    </template>

    <!-- Fixed bottom action bar (mobile-friendly) -->
    <div
      v-if="sentence"
      class="fixed bottom-[calc(3.5rem+env(safe-area-inset-bottom))] left-0 right-0 bg-white border-t border-gray-100 z-30 sm:static sm:bottom-auto sm:border-t-0 sm:bg-transparent"
    >
      <div class="max-w-2xl mx-auto px-4 py-2 sm:py-0 flex items-center gap-2">
        <button
          @click="reAnalyze"
          :disabled="reAnalyzing"
          class="flex-1 py-2.5 rounded-xl text-sm font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors min-h-[44px] disabled:opacity-50"
        >
          {{ reAnalyzing ? '分析中...' : '重新分析' }}
        </button>
        <button
          @click="copyContent"
          class="flex-1 py-2.5 rounded-xl text-sm font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors min-h-[44px]"
        >
          {{ copied ? '已复制 ✓' : '复制' }}
        </button>
        <button
          @click="exportCurrentSentence"
          class="flex-1 py-2.5 rounded-xl text-sm font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors min-h-[44px]"
        >
          导出
        </button>
        <button
          @click="showDeleteConfirm = true"
          class="py-2.5 px-3 rounded-xl text-sm font-medium bg-red-50 hover:bg-red-100 text-red-600 transition-colors min-h-[44px]"
        >
          删除
        </button>
      </div>
    </div>

    <!-- Delete confirmation -->
    <div
      v-if="showDeleteConfirm"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-50 p-4"
    >
      <div class="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
        <h3 class="font-bold text-lg mb-2">确认删除</h3>
        <p class="text-gray-600 text-sm mb-5">确定要删除这个句子吗？此操作无法撤销。</p>
        <div class="flex gap-2">
          <button @click="showDeleteConfirm = false" class="flex-1 btn-outline text-sm min-h-[48px]">取消</button>
          <button @click="handleDelete" class="flex-1 btn-danger text-sm min-h-[48px]">确认删除</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, reactive } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AnalysisCard from '../components/AnalysisCard.vue'
import TagInput from '../components/TagInput.vue'
import { useSentencesStore, useSettingsStore } from '../stores/index.js'
import { analyzeSentence } from '../api/analyze.js'
import { formatSentenceMarkdown, downloadMarkdown } from '../utils/export.js'

const route = useRoute()
const router = useRouter()
const sentencesStore = useSentencesStore()
const settingsStore = useSettingsStore()

const showDeleteConfirm = ref(false)
const reAnalyzing = ref(false)
const analysisError = ref('')
const copied = ref(false)
const tags = ref([])

// Collapsible sections — default open for structure and grammar
const expanded = reactive({
  structure: true,
  grammar: true,
  vocabulary: false,
})

function toggle(section) {
  expanded[section] = !expanded[section]
}

onMounted(async () => {
  if (sentencesStore.sentences.length === 0) {
    await sentencesStore.loadSentences()
  }
  if (sentence.value) {
    tags.value = [...sentence.value.tags]
  }
})

const sentence = computed(() => {
  return sentencesStore.getSentenceById(route.params.id)
})

const tagsChanged = computed(() => {
  if (!sentence.value) return false
  return JSON.stringify(tags.value) !== JSON.stringify(sentence.value.tags)
})

const formattedDate = computed(() => {
  if (!sentence.value) return ''
  return new Date(sentence.value.createdAt).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
})

watch(sentence, (val) => {
  if (val) tags.value = [...val.tags]
})

async function saveTags() {
  if (!sentence.value) return
  await sentencesStore.updateTags(sentence.value.id, [...tags.value])
}

async function reAnalyze() {
  if (!sentence.value || !settingsStore.isAnalysisConfigured()) {
    analysisError.value = '请先在设置中配置 API Key'
    return
  }

  reAnalyzing.value = true
  analysisError.value = ''

  try {
    const analysis = await analyzeSentence(sentence.value.content)
    await sentencesStore.updateAnalysis(sentence.value.id, analysis)
    // Auto-expand sections after re-analysis
    expanded.structure = true
    expanded.grammar = true
  } catch (err) {
    analysisError.value = err.message || '分析失败，请重试'
  } finally {
    reAnalyzing.value = false
  }
}

function copyContent() {
  if (!sentence.value) return

  let text = `原句：${sentence.value.content}\n\n`
  if (sentence.value.analysis) {
    const a = sentence.value.analysis
    text += `【译文】\n${a.translation}\n\n`
    text += `【句子结构】\n`
    a.structure?.forEach((s) => {
      text += `[${s.type}] ${s.text} — ${s.translation}\n`
    })
    text += `\n【语法点】\n`
    a.grammar?.forEach((g) => {
      text += `${g.point}: ${g.explanation}\n`
    })
    text += `\n【重点词汇】\n`
    a.vocabulary?.forEach((v) => {
      text += `${v.word}: ${v.meaning}\n`
    })
    if (a.translationNote) {
      text += `\n【翻译思路】\n${a.translationNote}\n`
    }
  }

  navigator.clipboard.writeText(text).then(() => {
    copied.value = true
    setTimeout(() => (copied.value = false), 2000)
  })
}

function exportCurrentSentence() {
  if (!sentence.value) return
  const markdown = formatSentenceMarkdown(sentence.value)
  downloadMarkdown(markdown, 'sentence-note')
}

async function handleDelete() {
  if (!sentence.value) return
  await sentencesStore.removeSentence(sentence.value.id)
  router.replace('/collection')
}
</script>
