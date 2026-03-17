<template>
  <div class="max-w-2xl mx-auto">
    <!-- Header -->
    <div class="flex items-center gap-3 mb-6">
      <router-link to="/collection" class="text-gray-400 hover:text-gray-600">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
      </router-link>
      <h1 class="text-xl font-bold text-gray-800">句子详情</h1>
    </div>

    <!-- Not found -->
    <div v-if="!sentence" class="card text-center py-10 text-gray-500">
      句子不存在或已被删除
    </div>

    <template v-else>
      <!-- Original Sentence -->
      <div class="card mb-4">
        <h3 class="text-sm font-medium text-gray-500 mb-2">原句</h3>
        <p class="text-gray-800 leading-relaxed text-lg">{{ sentence.content }}</p>
        <div class="flex items-center gap-2 mt-3 text-xs text-gray-400">
          <span>{{ formattedDate }}</span>
          <span>·</span>
          <span>{{ sentence.source === 'photo' ? '拍照输入' : '文本输入' }}</span>
        </div>
      </div>

      <!-- Tags -->
      <div class="card mb-4">
        <h3 class="text-sm font-medium text-gray-500 mb-2">标签</h3>
        <TagInput v-model="tags" />
        <button
          v-if="tagsChanged"
          @click="saveTags"
          class="btn-primary text-sm mt-2"
        >
          保存标签
        </button>
      </div>

      <!-- Analysis Results -->
      <div v-if="sentence.analysis" class="space-y-4 mb-4">
        <!-- Structure -->
        <AnalysisCard
          title="句子结构拆分"
          icon="🔍"
          bg-class="bg-gradient-to-br from-white to-blue-50 border border-blue-100"
        >
          <div
            v-for="(part, i) in sentence.analysis.structure"
            :key="i"
            class="bg-white bg-opacity-60 rounded-lg p-3"
          >
            <div class="flex items-start gap-2">
              <span class="text-xs bg-blue-200 text-blue-800 px-2 py-0.5 rounded-full whitespace-nowrap mt-0.5">
                {{ part.type }}
              </span>
              <div>
                <p class="text-gray-800 font-medium">{{ part.text }}</p>
                <p class="text-gray-500 text-sm mt-1">{{ part.translation }}</p>
              </div>
            </div>
          </div>
        </AnalysisCard>

        <!-- Grammar -->
        <AnalysisCard
          title="语法点标注"
          icon="📖"
          bg-class="bg-gradient-to-br from-white to-green-50 border border-green-100"
        >
          <div
            v-for="(item, i) in sentence.analysis.grammar"
            :key="i"
            class="bg-white bg-opacity-60 rounded-lg p-3"
          >
            <h4 class="font-semibold text-green-800 mb-1">{{ item.point }}</h4>
            <p class="text-gray-700 text-sm">{{ item.explanation }}</p>
            <div v-if="item.examples?.length" class="mt-2">
              <p
                v-for="(ex, j) in item.examples"
                :key="j"
                class="text-sm text-gray-500 italic"
              >
                {{ ex }}
              </p>
            </div>
          </div>
        </AnalysisCard>

        <!-- Vocabulary -->
        <AnalysisCard
          title="重点词汇提取"
          icon="📝"
          bg-class="bg-gradient-to-br from-white to-purple-50 border border-purple-100"
        >
          <div
            v-for="(item, i) in sentence.analysis.vocabulary"
            :key="i"
            class="bg-white bg-opacity-60 rounded-lg p-3"
          >
            <div class="flex items-baseline gap-2 mb-1">
              <span class="font-bold text-purple-800">{{ item.word }}</span>
              <span class="text-gray-600 text-sm">{{ item.meaning }}</span>
            </div>
            <p v-if="item.example" class="text-sm text-gray-500 italic">
              {{ item.example }}
            </p>
          </div>
        </AnalysisCard>

        <!-- Translation -->
        <AnalysisCard
          title="全文翻译"
          icon="🌐"
          bg-class="bg-gradient-to-br from-white to-orange-50 border border-orange-100"
        >
          <div class="bg-white bg-opacity-60 rounded-lg p-3">
            <p class="text-gray-800 leading-relaxed">{{ sentence.analysis.translation }}</p>
          </div>
          <div v-if="sentence.analysis.translationNote" class="bg-white bg-opacity-60 rounded-lg p-3">
            <h4 class="text-sm font-medium text-orange-700 mb-1">翻译思路</h4>
            <p class="text-gray-600 text-sm leading-relaxed">{{ sentence.analysis.translationNote }}</p>
          </div>
        </AnalysisCard>
      </div>

      <!-- No analysis -->
      <div v-else class="card mb-4 text-center py-6 text-gray-500">
        <p class="mb-3">尚未分析此句子</p>
        <button @click="reAnalyze" class="btn-accent text-sm" :disabled="reAnalyzing">
          {{ reAnalyzing ? '分析中...' : '开始分析' }}
        </button>
      </div>

      <!-- Actions -->
      <div class="flex flex-wrap gap-2 mb-8">
        <button @click="reAnalyze" class="btn-outline text-sm" :disabled="reAnalyzing">
          {{ reAnalyzing ? '分析中...' : '重新分析' }}
        </button>
        <button @click="copyContent" class="btn-outline text-sm">
          {{ copied ? '已复制' : '复制分析结果' }}
        </button>
        <button @click="exportCurrentSentence" class="btn-outline text-sm">
          导出 Markdown
        </button>
        <button @click="showDeleteConfirm = true" class="btn-danger text-sm ml-auto">
          删除
        </button>
      </div>

      <!-- Re-analysis error -->
      <div
        v-if="analysisError"
        class="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700 mb-4"
      >
        {{ analysisError }}
      </div>

      <!-- Delete confirmation -->
      <div
        v-if="showDeleteConfirm"
        class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      >
        <div class="bg-white rounded-xl p-6 max-w-sm w-full shadow-xl">
          <h3 class="font-bold text-lg mb-2">确认删除</h3>
          <p class="text-gray-600 text-sm mb-4">确定要删除这个句子吗？此操作无法撤销。</p>
          <div class="flex gap-2 justify-end">
            <button @click="showDeleteConfirm = false" class="btn-outline text-sm">取消</button>
            <button @click="handleDelete" class="btn-danger text-sm">确认删除</button>
          </div>
        </div>
      </div>

      <!-- Analyzing overlay -->
      <div
        v-if="reAnalyzing"
        class="card text-center py-6 mb-4"
      >
        <div class="inline-block w-8 h-8 border-4 border-primary-200 border-t-primary-500 rounded-full animate-spin mb-3"></div>
        <p class="text-gray-500">正在重新分析...</p>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
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
  if (!sentence.value || !settingsStore.isConfigured()) {
    analysisError.value = '请先在设置中配置API Key'
    return
  }

  reAnalyzing.value = true
  analysisError.value = ''

  try {
    const analysis = await analyzeSentence(sentence.value.content)
    await sentencesStore.updateAnalysis(sentence.value.id, analysis)
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
    text += `【句子结构拆分】\n`
    a.structure?.forEach((s) => {
      text += `[${s.type}] ${s.text} - ${s.translation}\n`
    })
    text += `\n【语法点标注】\n`
    a.grammar?.forEach((g) => {
      text += `${g.point}: ${g.explanation}\n`
    })
    text += `\n【重点词汇】\n`
    a.vocabulary?.forEach((v) => {
      text += `${v.word}: ${v.meaning}\n`
    })
    text += `\n【翻译】\n${a.translation}\n`
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
