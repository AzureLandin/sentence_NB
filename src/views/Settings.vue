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

    <!-- AI 配置 -->
    <div class="card mb-4">
      <h2 class="font-semibold text-gray-800 mb-4">AI 配置</h2>

      <div v-if="!authStore.isLoggedIn" class="text-sm text-gray-500 py-2">
        请先登录后配置自有 API Key。系统已配置平台默认 Key，可直接使用。
      </div>

      <template v-else>
        <div v-if="aiConfigStore.loading" class="text-sm text-gray-400 py-2">加载中...</div>
        <div v-else>
          <!-- Tab -->
          <div class="flex border-b border-gray-200 mb-4">
            <button
              @click="aiTab = 'text'"
              class="px-4 py-2 text-sm font-medium border-b-2 transition-colors"
              :class="aiTab === 'text' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'"
            >文本模型</button>
            <button
              @click="aiTab = 'vision'"
              class="px-4 py-2 text-sm font-medium border-b-2 transition-colors"
              :class="aiTab === 'vision' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'"
            >视觉模型</button>
          </div>

          <!-- 文本模型 -->
          <div v-show="aiTab === 'text'">
            <p class="text-xs text-gray-400 mb-3">用于分析长难句。留空则使用平台默认配置。</p>

            <div class="mb-4">
              <label class="block text-sm font-medium text-gray-600 mb-1">AI 提供商</label>
              <input
                v-model="textProviderInput"
                placeholder="如 openai / siliconflow / custom"
                class="input-field"
              />
            </div>

            <div class="mb-4">
              <label class="block text-sm font-medium text-gray-600 mb-1">API Key</label>
              <p v-if="aiConfigStore.textApiKey" class="text-xs text-gray-500 mb-1">
                当前：{{ aiConfigStore.textApiKey }}（脱敏）
              </p>
              <p v-else class="text-xs text-gray-400 mb-1">未设置，使用平台默认</p>
              <div class="relative">
                <input
                  :type="showTextKey ? 'text' : 'password'"
                  v-model="textKeyInput"
                  placeholder="输入新 API Key（留空不修改）"
                  class="input-field pr-10"
                />
                <button
                  @click="showTextKey = !showTextKey"
                  class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      :d="showTextKey
                        ? 'M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21'
                        : 'M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z'"
                    />
                  </svg>
                </button>
              </div>
            </div>

            <div class="mb-4">
              <label class="block text-sm font-medium text-gray-600 mb-1">模型 ID</label>
              <p v-if="aiConfigStore.textModel" class="text-xs text-gray-500 mb-1">当前：{{ aiConfigStore.textModel }}</p>
              <input
                v-model="textModelInput"
                placeholder="如 gpt-4o（留空不修改）"
                class="input-field"
              />
            </div>

            <div class="mb-4">
              <label class="block text-sm font-medium text-gray-600 mb-1">API 端点</label>
              <input
                v-model="textEndpointInput"
                placeholder="如 https://api.openai.com/v1/chat/completions（留空不修改）"
                class="input-field"
              />
            </div>

            <div class="flex gap-2 flex-wrap">
              <button
                @click="handleSaveText"
                :disabled="aiConfigStore.loading"
                class="btn-primary text-sm"
              >{{ aiConfigStore.loading ? '保存中...' : '保存文本配置' }}</button>
              <button
                @click="handleTestText"
                :disabled="testingText"
                class="btn-outline text-sm"
              >{{ testingText ? '测试中...' : '测试连接' }}</button>
            </div>
          </div>

          <!-- 视觉模型 -->
          <div v-show="aiTab === 'vision'">
            <p class="text-xs text-gray-400 mb-3">用于图片 OCR 识别。留空则使用平台默认配置。</p>

            <div class="mb-4">
              <label class="block text-sm font-medium text-gray-600 mb-1">AI 提供商</label>
              <input
                v-model="visionProviderInput"
                placeholder="如 openai / siliconflow / custom"
                class="input-field"
              />
            </div>

            <div class="mb-4">
              <label class="block text-sm font-medium text-gray-600 mb-1">API Key</label>
              <p v-if="aiConfigStore.visionApiKey" class="text-xs text-gray-500 mb-1">
                当前：{{ aiConfigStore.visionApiKey }}（脱敏）
              </p>
              <p v-else class="text-xs text-gray-400 mb-1">未设置，使用平台默认</p>
              <div class="relative">
                <input
                  :type="showVisionKey ? 'text' : 'password'"
                  v-model="visionKeyInput"
                  placeholder="输入新 API Key（留空不修改）"
                  class="input-field pr-10"
                />
                <button
                  @click="showVisionKey = !showVisionKey"
                  class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      :d="showVisionKey
                        ? 'M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21'
                        : 'M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z'"
                    />
                  </svg>
                </button>
              </div>
            </div>

            <div class="mb-4">
              <label class="block text-sm font-medium text-gray-600 mb-1">模型 ID</label>
              <p v-if="aiConfigStore.visionModel" class="text-xs text-gray-500 mb-1">当前：{{ aiConfigStore.visionModel }}</p>
              <input
                v-model="visionModelInput"
                placeholder="如 gpt-4o（留空不修改）"
                class="input-field"
              />
            </div>

            <div class="mb-4">
              <label class="block text-sm font-medium text-gray-600 mb-1">API 端点</label>
              <input
                v-model="visionEndpointInput"
                placeholder="如 https://api.openai.com/v1/chat/completions（留空不修改）"
                class="input-field"
              />
            </div>

            <div class="flex gap-2 flex-wrap">
              <button
                @click="handleSaveVision"
                :disabled="aiConfigStore.loading"
                class="btn-primary text-sm"
              >{{ aiConfigStore.loading ? '保存中...' : '保存视觉配置' }}</button>
              <button
                @click="handleTestVision"
                :disabled="testingVision"
                class="btn-outline text-sm"
              >{{ testingVision ? '测试中...' : '测试连接' }}</button>
            </div>
          </div>

          <!-- 测试结果 -->
          <div v-if="testResult !== null" class="mt-3 text-sm rounded-lg p-3"
            :class="testResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'">
            {{ testResult.success ? 'API 连接成功！' : ('连接失败：' + (testResult.message || '请检查配置')) }}
          </div>
          <div v-if="saveSuccess" class="mt-3 text-sm rounded-lg p-3 bg-green-50 text-green-700">
            配置已保存
          </div>
          <div v-if="aiConfigStore.error" class="mt-3 text-sm rounded-lg p-3 bg-red-50 text-red-700">
            {{ aiConfigStore.error }}
          </div>
        </div>
      </template>
    </div>

    <!-- 显示模式 -->
    <div class="card mb-4">
      <h2 class="font-semibold text-gray-800 mb-4">显示模式</h2>
      <div class="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
        <button
          @click="settingsStore.useMode = 'simple'"
          class="flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors text-center"
          :class="settingsStore.useMode === 'simple'
            ? 'bg-white shadow text-blue-600'
            : 'text-gray-500 hover:text-gray-700'"
        >简单模式</button>
        <button
          @click="settingsStore.useMode = 'advanced'"
          class="flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors text-center"
          :class="settingsStore.useMode === 'advanced'
            ? 'bg-white shadow text-blue-600'
            : 'text-gray-500 hover:text-gray-700'"
        >专业模式</button>
      </div>
      <p class="text-xs text-gray-400 mt-2">
        {{ settingsStore.useMode === 'simple'
          ? '简洁界面，适合日常使用'
          : '展示更多分析细节，适合深度学习' }}
      </p>
    </div>

    <!-- 数据管理 -->
    <div class="card mb-4">
      <h2 class="font-semibold text-gray-800 mb-4">数据管理</h2>

      <div class="space-y-3">
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
            <option value="current">当前筛选结果</option>
            <option value="tag">按标签</option>
          </select>
          <select v-if="markdownExportScope === 'tag'" v-model="markdownExportTag" class="input-field text-sm">
            <option value="">请选择标签</option>
            <option v-for="tag in sentencesStore.allTags" :key="tag" :value="tag">{{ tag }}</option>
          </select>
          <p class="text-xs text-gray-500">{{ markdownScopeHint }}</p>
        </div>

        <label class="btn-outline text-sm w-full text-left flex items-center gap-2 cursor-pointer">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          导入数据
          <input type="file" accept=".json" @change="handleImport" class="hidden" />
        </label>

        <button @click="showClearConfirm = true" class="btn-danger text-sm w-full text-left flex items-center gap-2">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          清除所有数据
        </button>
      </div>

      <div v-if="importResult" class="mt-3 text-sm rounded-lg p-3"
        :class="importResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'">
        {{ importResult.message }}
      </div>
    </div>

    <!-- 账号与同步 -->
    <div class="card mb-4">
      <h2 class="font-semibold text-gray-800 mb-4">账号与同步</h2>

      <template v-if="authStore.isLoggedIn">
        <div class="flex items-center gap-3 p-3 bg-gray-50 rounded-lg mb-3">
          <div class="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm">
            {{ authStore.user?.displayName?.[0]?.toUpperCase() || '?' }}
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-gray-800 truncate">{{ authStore.user?.displayName }}</p>
            <p class="text-xs text-gray-500 truncate">{{ authStore.user?.email }}</p>
          </div>
          <span class="flex items-center gap-1 text-xs" :class="syncStatusColor">
            <span class="w-2 h-2 rounded-full" :class="syncDotClass"></span>
            {{ syncStatusText }}
          </span>
        </div>

        <div class="grid grid-cols-2 gap-2 mb-3 text-center">
          <div class="bg-gray-50 rounded-lg p-2">
            <p class="text-xs text-gray-500">上次同步</p>
            <p class="text-xs font-medium text-gray-700">{{ lastSyncText }}</p>
          </div>
          <div class="bg-gray-50 rounded-lg p-2">
            <p class="text-xs text-gray-500">状态</p>
            <p class="text-xs font-medium text-gray-700" :class="syncStatusColor">{{ syncStatusText }}</p>
          </div>
        </div>

        <div class="flex gap-2">
          <button
            @click="handleManualSync"
            :disabled="syncStore.status === 'syncing'"
            class="btn-outline text-sm flex-1 flex items-center justify-center gap-1"
          >
            <svg class="w-3.5 h-3.5" :class="syncStore.status === 'syncing' ? 'animate-spin' : ''" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            立即同步
          </button>
          <button @click="handleLogout" :disabled="authStore.loading" class="btn-outline text-sm flex-1">
            {{ authStore.loading ? '退出中…' : '退出登录' }}
          </button>
        </div>
      </template>

      <template v-else>
        <p class="text-sm text-gray-500 mb-3">登录后可将句子同步到云端，跨设备访问。</p>
        <router-link to="/login" class="btn-primary text-sm w-full flex items-center justify-center gap-2">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
          </svg>
          登录 / 注册
        </router-link>
      </template>
    </div>

    <!-- 清除确认 -->
    <div v-if="showClearConfirm" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-xl p-6 max-w-sm w-full shadow-xl">
        <h3 class="font-bold text-lg mb-2 text-red-600">确认清除所有数据</h3>
        <p class="text-gray-600 text-sm mb-4">此操作将删除所有收藏的句子和分析结果，无法恢复。建议先导出数据备份。</p>
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
import { useRouter } from 'vue-router'
import { useSettingsStore, useSentencesStore } from '../stores/index.js'
import { useAuthStore } from '../stores/auth.js'
import { useSyncStore } from '../stores/sync.js'
import { useAiConfigStore } from '../stores/aiConfig.js'
import { buildMarkdownDocument, downloadMarkdown } from '../utils/export.js'

const router = useRouter()
const settingsStore = useSettingsStore()
const sentencesStore = useSentencesStore()
const authStore = useAuthStore()
const syncStore = useSyncStore()
const aiConfigStore = useAiConfigStore()

// ── AI 配置表单 ──────────────────────────────────────────
const aiTab = ref('text')
const showTextKey = ref(false)
const showVisionKey = ref(false)
const textProviderInput = ref('')
const textKeyInput = ref('')
const textModelInput = ref('')
const textEndpointInput = ref('')
const visionProviderInput = ref('')
const visionKeyInput = ref('')
const visionModelInput = ref('')
const visionEndpointInput = ref('')
const testingText = ref(false)
const testingVision = ref(false)
const testResult = ref(null)
const saveSuccess = ref(false)

onMounted(async () => {
  if (sentencesStore.sentences.length === 0) {
    sentencesStore.loadSentences()
  }
  if (authStore.isLoggedIn && !aiConfigStore.loaded) {
    await aiConfigStore.fetch()
  }
})

async function handleSaveText() {
  testResult.value = null
  saveSuccess.value = false
  const payload = {}
  if (textProviderInput.value) payload.textProvider = textProviderInput.value
  if (textKeyInput.value)      payload.textApiKey = textKeyInput.value
  if (textModelInput.value)    payload.textModel = textModelInput.value
  if (textEndpointInput.value) payload.textEndpoint = textEndpointInput.value
  if (Object.keys(payload).length === 0) return
  try {
    await aiConfigStore.save(payload)
    textKeyInput.value = ''
    saveSuccess.value = true
    setTimeout(() => { saveSuccess.value = false }, 2000)
  } catch { /* error shown via aiConfigStore.error */ }
}

async function handleSaveVision() {
  testResult.value = null
  saveSuccess.value = false
  const payload = {}
  if (visionProviderInput.value) payload.visionProvider = visionProviderInput.value
  if (visionKeyInput.value)      payload.visionApiKey = visionKeyInput.value
  if (visionModelInput.value)    payload.visionModel = visionModelInput.value
  if (visionEndpointInput.value) payload.visionEndpoint = visionEndpointInput.value
  if (Object.keys(payload).length === 0) return
  try {
    await aiConfigStore.save(payload)
    visionKeyInput.value = ''
    saveSuccess.value = true
    setTimeout(() => { saveSuccess.value = false }, 2000)
  } catch { /* error shown via aiConfigStore.error */ }
}

async function handleTestText() {
  testingText.value = true
  testResult.value = null
  try {
    const res = await aiConfigStore.testConnection('text')
    testResult.value = res
  } catch (err) {
    testResult.value = { success: false, message: err.message }
  } finally {
    testingText.value = false
  }
}

async function handleTestVision() {
  testingVision.value = true
  testResult.value = null
  try {
    const res = await aiConfigStore.testConnection('vision')
    testResult.value = res
  } catch (err) {
    testResult.value = { success: false, message: err.message }
  } finally {
    testingVision.value = false
  }
}

// ── 同步状态 ──────────────────────────────────────────────
const syncStatusText = computed(() => {
  const s = syncStore.status
  if (s === 'syncing') return '同步中'
  if (s === 'error') return '同步失败'
  if (s === 'offline') return '离线'
  return '已同步'
})

const syncStatusColor = computed(() => {
  const s = syncStore.status
  if (s === 'syncing') return 'text-blue-500'
  if (s === 'error') return 'text-red-500'
  if (s === 'offline') return 'text-gray-400'
  return 'text-green-500'
})

const syncDotClass = computed(() => {
  const s = syncStore.status
  if (s === 'syncing') return 'bg-blue-400 animate-pulse'
  if (s === 'error') return 'bg-red-400'
  if (s === 'offline') return 'bg-gray-400'
  return 'bg-green-400'
})

const lastSyncText = computed(() => {
  if (!syncStore.lastSyncAt) return '从未'
  const diff = Date.now() - syncStore.lastSyncAt
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  return `${Math.floor(diff / 3600000)}小时前`
})

async function handleManualSync() {
  await syncStore.pull()
}

async function handleLogout() {
  await authStore.doLogout()
  router.push('/')
}

// ── 数据管理 ──────────────────────────────────────────────
const showClearConfirm = ref(false)
const importResult = ref(null)
const markdownExportScope = ref('all')
const markdownExportTag = ref('')

const markdownScopeHint = computed(() => {
  if (markdownExportScope.value === 'current') {
    return `当前筛选：关键词「${sentencesStore.searchQuery || '无'}」、标签「${sentencesStore.filterTag || '全部'}」`
  }
  if (markdownExportScope.value === 'tag') {
    return markdownExportTag.value
      ? `仅导出标签「${markdownExportTag.value}」的已分析句子`
      : '请选择一个标签后再导出'
  }
  return '导出全部已分析句子'
})

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
    list = sentencesStore.filteredSentences.filter((s) => s.analysis)
  } else if (markdownExportScope.value === 'tag') {
    if (!markdownExportTag.value) {
      importResult.value = { success: false, message: '请先选择标签' }
      return
    }
    list = sentencesStore.sentences.filter((s) => s.analysis && s.tags.includes(markdownExportTag.value))
  } else {
    list = sentencesStore.sentences.filter((s) => s.analysis)
  }
  if (list.length === 0) {
    importResult.value = { success: false, message: '当前范围内无可导出的分析结果' }
    return
  }
  const markdown = buildMarkdownDocument(list, '英语长难句笔记导出')
  downloadMarkdown(markdown, 'sentence-notebook')
  importResult.value = { success: true, message: `Markdown 导出完成，共 ${list.length} 条句子` }
}

async function handleImport(event) {
  const file = event.target.files?.[0]
  if (!file) return
  importResult.value = null
  try {
    const text = await file.text()
    await sentencesStore.importData(text)
    importResult.value = { success: true, message: `成功导入！当前共 ${sentencesStore.sentences.length} 条句子` }
  } catch (err) {
    importResult.value = { success: false, message: `导入失败: ${err.message}` }
  }
  event.target.value = ''
}

async function handleClear() {
  await sentencesStore.clearAll()
  showClearConfirm.value = false
}
</script>
