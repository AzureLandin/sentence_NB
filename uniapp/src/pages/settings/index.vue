<template>
  <scroll-view scroll-y class="container">
    <!-- AI 配置 -->
    <view class="card">
      <text class="section-title">AI 配置</text>

      <view v-if="!authStore.isLoggedIn" class="login-hint">
        <text>请先登录后配置自有 API Key。系统已配置平台默认 Key，可直接使用。</text>
      </view>

      <template v-else>
        <view v-if="aiConfigStore.loading" class="loading-hint">
          <text>加载中...</text>
        </view>
        <view v-else>
          <!-- Tabs -->
          <view class="tab-row">
            <view
              class="tab-btn"
              :class="aiTab === 'text' ? 'tab-active' : 'tab-inactive'"
              @tap="aiTab = 'text'"
            ><text>文本模型</text></view>
            <view
              class="tab-btn"
              :class="aiTab === 'vision' ? 'tab-active' : 'tab-inactive'"
              @tap="aiTab = 'vision'"
            ><text>视觉模型</text></view>
          </view>

          <!-- 文本模型 -->
          <view v-show="aiTab === 'text'">
            <text class="field-hint">用于分析长难句。留空则使用平台默认配置。</text>
            <view class="field">
              <text class="label">AI 提供商</text>
              <input v-model="textProviderInput" placeholder="如 openai / siliconflow / custom" class="input-field" />
            </view>
            <view class="field">
              <text class="label">API Key</text>
              <text v-if="aiConfigStore.textApiKey" class="current-val">当前：{{ aiConfigStore.textApiKey }}（脱敏）</text>
              <text v-else class="current-empty">未设置，使用平台默认</text>
              <input v-model="textKeyInput" password placeholder="输入新 API Key（留空不修改）" class="input-field" />
            </view>
            <view class="field">
              <text class="label">模型 ID</text>
              <text v-if="aiConfigStore.textModel" class="current-val">当前：{{ aiConfigStore.textModel }}</text>
              <input v-model="textModelInput" placeholder="如 gpt-4o（留空不修改）" class="input-field" />
            </view>
            <view class="field">
              <text class="label">API 端点</text>
              <input v-model="textEndpointInput" placeholder="如 https://api.openai.com/v1/chat/completions（留空不修改）" class="input-field" />
            </view>
            <view class="btn-row">
              <button class="btn-primary" :disabled="aiConfigStore.loading" @tap="handleSaveText">
                {{ aiConfigStore.loading ? '保存中...' : '保存文本配置' }}
              </button>
              <button class="btn-outline" :disabled="testingText" @tap="handleTestText">
                {{ testingText ? '测试中...' : '测试连接' }}
              </button>
            </view>
          </view>

          <!-- 视觉模型 -->
          <view v-show="aiTab === 'vision'">
            <text class="field-hint">用于图片 OCR 识别。留空则使用平台默认配置。</text>
            <view class="field">
              <text class="label">AI 提供商</text>
              <input v-model="visionProviderInput" placeholder="如 openai / siliconflow / custom" class="input-field" />
            </view>
            <view class="field">
              <text class="label">API Key</text>
              <text v-if="aiConfigStore.visionApiKey" class="current-val">当前：{{ aiConfigStore.visionApiKey }}（脱敏）</text>
              <text v-else class="current-empty">未设置，使用平台默认</text>
              <input v-model="visionKeyInput" password placeholder="输入新 API Key（留空不修改）" class="input-field" />
            </view>
            <view class="field">
              <text class="label">模型 ID</text>
              <text v-if="aiConfigStore.visionModel" class="current-val">当前：{{ aiConfigStore.visionModel }}</text>
              <input v-model="visionModelInput" placeholder="如 gpt-4o（留空不修改）" class="input-field" />
            </view>
            <view class="field">
              <text class="label">API 端点</text>
              <input v-model="visionEndpointInput" placeholder="如 https://api.openai.com/v1/chat/completions（留空不修改）" class="input-field" />
            </view>
            <view class="btn-row">
              <button class="btn-primary" :disabled="aiConfigStore.loading" @tap="handleSaveVision">
                {{ aiConfigStore.loading ? '保存中...' : '保存视觉配置' }}
              </button>
              <button class="btn-outline" :disabled="testingVision" @tap="handleTestVision">
                {{ testingVision ? '测试中...' : '测试连接' }}
              </button>
            </view>
          </view>

          <!-- Test result / save success -->
          <view v-if="testResult !== null" class="result-banner" :class="testResult.success ? 'result-ok' : 'result-fail'">
            <text>{{ testResult.success ? 'API 连接成功！' : ('连接失败：' + (testResult.message || '请检查配置')) }}</text>
          </view>
          <view v-if="saveSuccess" class="result-banner result-ok">
            <text>配置已保存</text>
          </view>
          <view v-if="aiConfigStore.error" class="result-banner result-fail">
            <text>{{ aiConfigStore.error }}</text>
          </view>
        </view>
      </template>
    </view>

    <!-- 显示模式 -->
    <view class="card">
      <text class="section-title">显示模式</text>
      <view class="mode-toggle">
        <view
          class="mode-btn"
          :class="settingsStore.useMode === 'simple' ? 'mode-active' : 'mode-normal'"
          @tap="settingsStore.useMode = 'simple'"
        ><text>简单模式</text></view>
        <view
          class="mode-btn"
          :class="settingsStore.useMode === 'advanced' ? 'mode-active' : 'mode-normal'"
          @tap="settingsStore.useMode = 'advanced'"
        ><text>专业模式</text></view>
      </view>
      <text class="mode-hint">
        {{ settingsStore.useMode === 'simple' ? '简洁界面，适合日常使用' : '展示更多分析细节，适合深度学习' }}
      </text>
    </view>

    <!-- 数据管理 -->
    <view class="card">
      <text class="section-title">数据管理</text>
      <view class="action-list">
        <view class="action-item" @tap="handleExport">
          <text class="action-text">导出所有数据 (JSON)</text>
        </view>
        <view class="action-item" @tap="handleExportMarkdown">
          <text class="action-text">导出已分析句子 (Markdown)</text>
        </view>
        <view class="action-item danger-item" @tap="showClearConfirm = true">
          <text class="action-text danger-text">清除所有数据</text>
        </view>
      </view>
      <view v-if="importResult" class="result-banner" :class="importResult.success ? 'result-ok' : 'result-fail'">
        <text>{{ importResult.message }}</text>
      </view>
    </view>

    <!-- 账号与同步 -->
    <view class="card">
      <text class="section-title">账号与同步</text>

      <template v-if="authStore.isLoggedIn">
        <view class="user-row">
          <view class="avatar">
            <text class="avatar-text">{{ authStore.user?.displayName?.[0]?.toUpperCase() || '?' }}</text>
          </view>
          <view class="user-info">
            <text class="user-name">{{ authStore.user?.displayName }}</text>
            <text class="user-email">{{ authStore.user?.email }}</text>
          </view>
          <view class="sync-dot" :class="syncDotClass"></view>
        </view>

        <view class="sync-btns">
          <button class="btn-outline flex1" :disabled="syncStore.status === 'syncing'" @tap="handleManualSync">
            立即同步
          </button>
          <button class="btn-outline flex1" :disabled="authStore.loading" @tap="handleLogout">
            {{ authStore.loading ? '退出中…' : '退出登录' }}
          </button>
        </view>
      </template>

      <template v-else>
        <text class="login-hint-text">登录后可将句子同步到云端，跨设备访问。</text>
        <button class="btn-primary" @tap="goToLogin">登录 / 注册</button>
      </template>
    </view>

    <!-- 清除确认 -->
    <view v-if="showClearConfirm" class="modal-overlay">
      <view class="modal">
        <text class="modal-title">确认清除所有数据</text>
        <text class="modal-desc">此操作将删除所有收藏的句子和分析结果，无法恢复。建议先导出数据备份。</text>
        <view class="modal-btns">
          <button class="btn-outline flex1" @tap="showClearConfirm = false">取消</button>
          <button class="btn-danger flex1" @tap="handleClear">确认清除</button>
        </view>
      </view>
    </view>
  </scroll-view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useSettingsStore, useSentencesStore } from '../../stores/index.js'
import { useAuthStore } from '../../stores/auth.js'
import { useSyncStore } from '../../stores/sync.js'
import { useAiConfigStore } from '../../stores/aiConfig.js'
import { buildMarkdownDocument, downloadMarkdown } from '../../utils/export.js'

const settingsStore = useSettingsStore()
const sentencesStore = useSentencesStore()
const authStore = useAuthStore()
const syncStore = useSyncStore()
const aiConfigStore = useAiConfigStore()

const aiTab = ref('text')
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
const showClearConfirm = ref(false)
const importResult = ref(null)

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
  } catch {}
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
  } catch {}
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

const syncDotClass = computed(() => {
  const s = syncStore.status
  if (s === 'syncing') return 'dot-blue'
  if (s === 'error') return 'dot-red'
  if (s === 'offline') return 'dot-gray'
  return 'dot-green'
})

async function handleManualSync() {
  await syncStore.pull()
}

async function handleLogout() {
  await authStore.doLogout()
  uni.showToast({ title: '已退出登录', icon: 'success' })
}

function goToLogin() {
  uni.navigateTo({ url: '/pages/auth/login' })
}

function handleExport() {
  const data = sentencesStore.exportData()
  // 小程序不支持 Blob，复制到剪贴板
  // H5 环境则可触发下载
  // #ifdef H5
  const blob = new Blob([data], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `sentence-notebook-export-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
  // #endif

  // #ifndef H5
  uni.setClipboardData({
    data,
    success: () => {
      importResult.value = { success: true, message: 'JSON 数据已复制到剪贴板' }
    },
  })
  // #endif
}

function handleExportMarkdown() {
  const list = sentencesStore.sentences.filter((s) => s.analysis)
  if (list.length === 0) {
    importResult.value = { success: false, message: '暂无可导出的分析结果' }
    return
  }
  const markdown = buildMarkdownDocument(list, '英语长难句笔记导出')
  downloadMarkdown(markdown, 'sentence-notebook')
  importResult.value = { success: true, message: `Markdown 导出完成，共 ${list.length} 条句子` }
}

async function handleClear() {
  await sentencesStore.clearAll()
  showClearConfirm.value = false
  uni.showToast({ title: '数据已清除', icon: 'success' })
}
</script>

<style scoped>
.container {
  padding: 24rpx 32rpx;
  box-sizing: border-box;
}

.section-title {
  display: block;
  font-size: 32rpx;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 24rpx;
}

.login-hint {
  padding: 16rpx 0;
}

.login-hint text {
  font-size: 26rpx;
  color: #6b7280;
}

.loading-hint text {
  font-size: 26rpx;
  color: #9ca3af;
}

.tab-row {
  display: flex;
  border-bottom: 2rpx solid #e5e7eb;
  margin-bottom: 24rpx;
}

.tab-btn {
  padding: 16rpx 24rpx;
  font-size: 26rpx;
  font-weight: 500;
}

.tab-active {
  color: #2563eb;
  border-bottom: 4rpx solid #3b82f6;
  margin-bottom: -2rpx;
}

.tab-inactive {
  color: #6b7280;
}

.field-hint {
  display: block;
  font-size: 22rpx;
  color: #9ca3af;
  margin-bottom: 20rpx;
}

.field {
  margin-bottom: 24rpx;
}

.label {
  display: block;
  font-size: 26rpx;
  font-weight: 500;
  color: #374151;
  margin-bottom: 8rpx;
}

.current-val {
  display: block;
  font-size: 22rpx;
  color: #6b7280;
  margin-bottom: 8rpx;
}

.current-empty {
  display: block;
  font-size: 22rpx;
  color: #9ca3af;
  margin-bottom: 8rpx;
}

.btn-row {
  display: flex;
  gap: 16rpx;
  flex-wrap: wrap;
  margin-top: 8rpx;
}

.result-banner {
  margin-top: 20rpx;
  padding: 16rpx 20rpx;
  border-radius: 12rpx;
  font-size: 26rpx;
}

.result-ok {
  background-color: #f0fdf4;
  color: #15803d;
}

.result-fail {
  background-color: #fef2f2;
  color: #b91c1c;
}

.mode-toggle {
  display: flex;
  background-color: #f3f4f6;
  border-radius: 12rpx;
  padding: 8rpx;
  margin-bottom: 12rpx;
}

.mode-btn {
  flex: 1;
  padding: 16rpx;
  border-radius: 8rpx;
  text-align: center;
  font-size: 26rpx;
  font-weight: 500;
}

.mode-active {
  background-color: #ffffff;
  color: #2563eb;
  box-shadow: 0 2rpx 4rpx rgba(0,0,0,0.08);
}

.mode-normal {
  color: #6b7280;
}

.mode-hint {
  display: block;
  font-size: 22rpx;
  color: #9ca3af;
}

.action-list {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.action-item {
  padding: 20rpx 24rpx;
  background-color: #f9fafb;
  border-radius: 12rpx;
  border: 2rpx solid #e5e7eb;
}

.action-text {
  font-size: 26rpx;
  color: #374151;
}

.danger-item {
  border-color: #fecaca;
  background-color: #fff5f5;
}

.danger-text {
  color: #dc2626;
}

.user-row {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 20rpx;
  background-color: #f9fafb;
  border-radius: 12rpx;
  margin-bottom: 20rpx;
}

.avatar {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  background-color: #dbeafe;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.avatar-text {
  font-size: 28rpx;
  font-weight: 700;
  color: #2563eb;
}

.user-info {
  flex: 1;
  min-width: 0;
}

.user-name {
  display: block;
  font-size: 28rpx;
  font-weight: 500;
  color: #1f2937;
  margin-bottom: 4rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-email {
  display: block;
  font-size: 22rpx;
  color: #9ca3af;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sync-dot {
  width: 16rpx;
  height: 16rpx;
  border-radius: 50%;
  flex-shrink: 0;
}

.dot-blue { background-color: #60a5fa; }
.dot-green { background-color: #4ade80; }
.dot-red { background-color: #f87171; }
.dot-gray { background-color: #9ca3af; }

.sync-btns {
  display: flex;
  gap: 16rpx;
}

.flex1 { flex: 1; }

.login-hint-text {
  display: block;
  font-size: 26rpx;
  color: #6b7280;
  margin-bottom: 20rpx;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 32rpx;
}

.modal {
  background-color: #ffffff;
  border-radius: 20rpx;
  padding: 48rpx;
  width: 100%;
}

.modal-title {
  display: block;
  font-size: 36rpx;
  font-weight: 700;
  color: #dc2626;
  margin-bottom: 16rpx;
}

.modal-desc {
  display: block;
  font-size: 26rpx;
  color: #6b7280;
  margin-bottom: 40rpx;
  line-height: 1.6;
}

.modal-btns {
  display: flex;
  justify-content: flex-end;
  gap: 16rpx;
}
</style>
