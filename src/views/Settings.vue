<template>
  <div class="max-w-2xl mx-auto">
    <!-- Header -->
    <div class="flex items-center gap-3 mb-6">
      <router-link to="/" class="text-gray-400 hover:text-gray-600">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
      </router-link>
      <h1 class="text-xl font-bold text-gray-800">设置</h1>
    </div>

    <!-- API Configuration -->
    <div class="card mb-4">
      <h2 class="font-semibold text-gray-800 mb-4">API 配置</h2>

      <!-- Provider -->
      <div class="mb-4">
        <label class="block text-sm font-medium text-gray-600 mb-1">AI提供商</label>
        <select
          :value="settingsStore.api.provider"
          @change="settingsStore.setProvider($event.target.value)"
          class="input-field"
        >
          <option value="openai">OpenAI (GPT-4o)</option>
          <option value="qwen">通义千问</option>
          <option value="zhipu">智谱 AI (GLM)</option>
          <option value="claude">Claude</option>
          <option value="custom">自定义</option>
        </select>
      </div>

      <!-- API Key -->
      <div class="mb-4">
        <label class="block text-sm font-medium text-gray-600 mb-1">API Key</label>
        <div class="relative">
          <input
            :type="showApiKey ? 'text' : 'password'"
            :value="settingsStore.api.apiKey"
            @input="settingsStore.setApiKey($event.target.value)"
            placeholder="输入你的API Key"
            class="input-field pr-10"
          />
          <button
            @click="showApiKey = !showApiKey"
            class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <svg v-if="showApiKey" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
            </svg>
            <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </button>
        </div>
      </div>

      <!-- Model -->
      <div class="mb-4">
        <label class="block text-sm font-medium text-gray-600 mb-1">文本模型ID</label>
        <div class="flex gap-2">
          <input
            :value="settingsStore.api.model"
            @input="settingsStore.setModel($event.target.value)"
            placeholder="例如: gpt-4o, glm-4-plus"
            class="input-field flex-1"
          />
          <button
            @click="handleValidateModel"
            :disabled="validating || !settingsStore.api.apiKey || !settingsStore.api.model"
            class="btn-outline text-xs whitespace-nowrap"
          >
            {{ validating ? '验证中...' : '验证' }}
          </button>
        </div>
        <p class="text-xs text-gray-400 mt-1">用于分析长难句的文本模型</p>
      </div>

      <!-- Vision Model -->
      <div class="mb-4">
        <label class="block text-sm font-medium text-gray-600 mb-1">视觉模型ID</label>
        <div class="flex gap-2">
          <input
            :value="settingsStore.api.visionModel"
            @input="settingsStore.setVisionModel($event.target.value)"
            placeholder="例如: gpt-4o, glm-4v-plus, qwen-vl-plus"
            class="input-field flex-1"
          />
          <button
            @click="handleValidateVisionModel"
            :disabled="validatingVision || !settingsStore.api.apiKey || !settingsStore.api.visionModel"
            class="btn-outline text-xs whitespace-nowrap"
          >
            {{ validatingVision ? '验证中...' : '验证' }}
          </button>
        </div>
        <p class="text-xs text-gray-400 mt-1">用于拍照识别图片中的文字，需支持vision能力</p>
      </div>

      <!-- Advanced: Endpoint -->
      <div class="mb-4">
        <button
          @click="showAdvanced = !showAdvanced"
          class="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
        >
          <svg
            class="w-4 h-4 transition-transform"
            :class="{ 'rotate-90': showAdvanced }"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
          高级选项
        </button>
        <div v-if="showAdvanced" class="mt-2">
          <label class="block text-sm font-medium text-gray-600 mb-1">API 端点</label>
          <input
            :value="settingsStore.api.endpoint"
            @input="settingsStore.setEndpoint($event.target.value)"
            placeholder="https://api.openai.com/v1/chat/completions"
            class="input-field"
          />
        </div>
      </div>

      <!-- Test connection -->
      <div class="flex flex-wrap gap-2">
        <button
          @click="handleTestConnection"
          :disabled="testing || !settingsStore.api.apiKey || !settingsStore.api.model"
          class="btn-primary text-sm"
        >
          {{ testing ? '测试中...' : '测试连接' }}
        </button>
      </div>

      <!-- Test result -->
      <div
        v-if="testResult !== null"
        class="mt-3 text-sm rounded-lg p-3"
        :class="testResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'"
      >
        {{ testResult.message }}
      </div>

      <div
        v-if="validateResult !== null"
        class="mt-3 text-sm rounded-lg p-3"
        :class="validateResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'"
      >
        {{ validateResult.message }}
      </div>

      <div
        v-if="validateVisionResult !== null"
        class="mt-3 text-sm rounded-lg p-3"
        :class="validateVisionResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'"
      >
        {{ validateVisionResult.message }}
      </div>
    </div>

    <!-- Data Management -->
    <div class="card mb-4">
      <h2 class="font-semibold text-gray-800 mb-4">数据管理</h2>

      <div class="space-y-3">
        <!-- Export -->
        <button @click="handleExport" class="btn-outline text-sm w-full text-left flex items-center gap-2">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          导出所有数据 (JSON)
        </button>

        <button @click="handleExportMarkdown" class="btn-outline text-sm w-full text-left flex items-center gap-2">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 8h10M7 12h10m-7 4h7M5 3h9l5 5v13a1 1 0 01-1 1H5a1 1 0 01-1-1V4a1 1 0 011-1z" />
          </svg>
          导出已分析句子 (Markdown)
        </button>

        <div class="rounded-lg border border-gray-200 p-3 space-y-2">
          <p class="text-xs font-medium text-gray-600">Markdown 导出范围</p>
          <select v-model="markdownExportScope" class="input-field text-sm">
            <option value="all">全部已分析句子</option>
            <option value="current">当前筛选结果（收藏页筛选）</option>
            <option value="tag">按标签</option>
          </select>

          <select
            v-if="markdownExportScope === 'tag'"
            v-model="markdownExportTag"
            class="input-field text-sm"
          >
            <option value="">请选择标签</option>
            <option v-for="tag in sentencesStore.allTags" :key="tag" :value="tag">
              {{ tag }}
            </option>
          </select>

          <p class="text-xs text-gray-500">{{ markdownScopeHint }}</p>
        </div>

        <!-- Import -->
        <label class="btn-outline text-sm w-full text-left flex items-center gap-2 cursor-pointer">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          导入数据
          <input type="file" accept=".json" @change="handleImport" class="hidden" />
        </label>

        <!-- Clear -->
        <button
          @click="showClearConfirm = true"
          class="btn-danger text-sm w-full text-left flex items-center gap-2"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          清除所有数据
        </button>
      </div>

      <!-- Import result -->
      <div
        v-if="importResult"
        class="mt-3 text-sm rounded-lg p-3"
        :class="importResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'"
      >
        {{ importResult.message }}
      </div>
    </div>

    <!-- Clear confirmation dialog -->
    <div
      v-if="showClearConfirm"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
    >
      <div class="bg-white rounded-xl p-6 max-w-sm w-full shadow-xl">
        <h3 class="font-bold text-lg mb-2 text-red-600">确认清除所有数据</h3>
        <p class="text-gray-600 text-sm mb-4">
          此操作将删除所有收藏的句子和分析结果，无法恢复。建议先导出数据备份。
        </p>
        <div class="flex gap-2 justify-end">
          <button @click="showClearConfirm = false" class="btn-outline text-sm">取消</button>
          <button @click="handleClear" class="btn-danger text-sm">确认清除</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useSettingsStore, useSentencesStore } from '../stores/index.js'
import { testConnection, validateModel } from '../api/index.js'
import { buildMarkdownDocument, downloadMarkdown } from '../utils/export.js'

const settingsStore = useSettingsStore()
const sentencesStore = useSentencesStore()

const showApiKey = ref(false)
const showAdvanced = ref(false)
const testing = ref(false)
const testResult = ref(null)
const validating = ref(false)
const validateResult = ref(null)
const validatingVision = ref(false)
const validateVisionResult = ref(null)
const showClearConfirm = ref(false)
const importResult = ref(null)
const markdownExportScope = ref('all')
const markdownExportTag = ref('')

onMounted(() => {
  if (sentencesStore.sentences.length === 0) {
    sentencesStore.loadSentences()
  }
})

const markdownScopeHint = computed(() => {
  if (markdownExportScope.value === 'current') {
    return `当前筛选条件：关键词「${sentencesStore.searchQuery || '无'}」、标签「${sentencesStore.filterTag || '全部'}」、排序「${sentencesStore.sortOrder === 'desc' ? '最新优先' : '最早优先'}」`
  }
  if (markdownExportScope.value === 'tag') {
    return markdownExportTag.value
      ? `仅导出标签「${markdownExportTag.value}」的已分析句子`
      : '请选择一个标签后再导出'
  }
  return '导出全部已分析句子'
})

async function handleTestConnection() {
  testing.value = true
  testResult.value = null

  try {
    const ok = await testConnection()
    testResult.value = {
      success: ok,
      message: ok ? 'API连接成功！' : 'API返回了异常结果，请检查配置',
    }
  } catch (err) {
    testResult.value = {
      success: false,
      message: err.message || '连接失败',
    }
  } finally {
    testing.value = false
  }
}

async function handleValidateModel() {
  validating.value = true
  validateResult.value = null

  try {
    const ok = await validateModel(settingsStore.api.model)
    validateResult.value = {
      success: ok,
      message: ok ? `文本模型「${settingsStore.api.model}」可用` : '模型不可用，请检查模型ID是否正确',
    }
  } catch (err) {
    validateResult.value = {
      success: false,
      message: err.message || '验证失败',
    }
  } finally {
    validating.value = false
  }
}

async function handleValidateVisionModel() {
  validatingVision.value = true
  validateVisionResult.value = null

  try {
    const ok = await validateModel(settingsStore.api.visionModel)
    validateVisionResult.value = {
      success: ok,
      message: ok ? `视觉模型「${settingsStore.api.visionModel}」可用` : '模型不可用，请检查模型ID是否正确',
    }
  } catch (err) {
    validateVisionResult.value = {
      success: false,
      message: err.message || '验证失败',
    }
  } finally {
    validatingVision.value = false
  }
}

function handleExport() {
  const data = sentencesStore.exportData()
  const blob = new Blob([data], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `sentence-notebook-export-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

function handleExportMarkdown() {
  let list = []

  if (markdownExportScope.value === 'current') {
    list = sentencesStore.filteredSentences.filter((sentence) => sentence.analysis)
  } else if (markdownExportScope.value === 'tag') {
    if (!markdownExportTag.value) {
      importResult.value = {
        success: false,
        message: '请先选择标签，再执行 Markdown 导出',
      }
      return
    }
    list = sentencesStore.sentences.filter(
      (sentence) => sentence.analysis && sentence.tags.includes(markdownExportTag.value)
    )
  } else {
    list = sentencesStore.sentences.filter((sentence) => sentence.analysis)
  }

  if (list.length === 0) {
    importResult.value = {
      success: false,
      message: '当前范围内无可导出的分析结果，请调整筛选或先完成句子分析',
    }
    return
  }

  const markdown = buildMarkdownDocument(list, '英语长难句笔记导出')
  downloadMarkdown(markdown, 'sentence-notebook')
  importResult.value = {
    success: true,
    message: `Markdown 导出完成，共 ${list.length} 条句子`,
  }
}

async function handleImport(event) {
  const file = event.target.files?.[0]
  if (!file) return

  importResult.value = null

  try {
    const text = await file.text()
    await sentencesStore.importData(text)
    importResult.value = {
      success: true,
      message: `成功导入数据！当前共 ${sentencesStore.sentences.length} 条句子`,
    }
  } catch (err) {
    importResult.value = {
      success: false,
      message: `导入失败: ${err.message}`,
    }
  }

  event.target.value = ''
}

async function handleClear() {
  await sentencesStore.clearAll()
  showClearConfirm.value = false
}
</script>