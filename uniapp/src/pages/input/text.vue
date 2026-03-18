<template>
  <view class="container">
    <!-- Success notice -->
    <view v-if="lastSentenceId" class="notice-success">
      <view class="notice-row">
        <text class="notice-text">分析完成</text>
        <text class="notice-link" @tap="viewResult">查看结果 →</text>
      </view>
    </view>

    <!-- Input Area -->
    <view class="card">
      <text class="hint">粘贴或输入英文长难句，AI 将进行结构分析</text>
      <textarea
        v-model="inputText"
        placeholder="例如：The committee, which had been deliberating for weeks, finally reached a consensus..."
        :maxlength="2000"
        :disabled="analyzing"
        auto-height
        class="input-field textarea"
        @input="onInput"
      />

      <view v-if="validationError" class="validation-hint">
        <text class="hint-error">{{ validationError }}</text>
      </view>

      <view class="input-footer">
        <text :class="['char-count', inputText.length > 2000 ? 'count-red' : 'count-gray']">
          {{ inputText.length }} / 2000
        </text>
        <view class="btn-row">
          <button v-if="inputText" class="btn-outline btn-sm" :disabled="analyzing" @tap="cleanText">
            清理
          </button>
          <button class="btn-outline btn-sm" :disabled="analyzing || !inputText" @tap="clearInput">
            清空
          </button>
        </view>
      </view>
    </view>

    <!-- Error -->
    <view v-if="error" class="card error-card">
      <text class="error-text">{{ error }}</text>
      <button v-if="canRetry" class="btn-outline btn-sm mt8" @tap="handleAnalyze">重试</button>
    </view>

    <!-- Loading -->
    <view v-if="analyzing" class="card loading-card">
      <text class="loading-text">正在分析句子...</text>
      <text class="loading-sub">AI 正在解析句子结构，请稍候</text>
    </view>

    <!-- Analyze Button -->
    <view class="bottom-bar">
      <button
        @tap="handleAnalyze"
        :disabled="analyzing || !inputText.trim() || !!validationError"
        :class="['analyze-btn', (analyzing || !inputText.trim() || !!validationError) ? 'btn-disabled' : 'btn-accent']"
      >
        <text v-if="analyzing">分析中...</text>
        <text v-else-if="validationError" class="btn-text-sm">{{ validationError }}</text>
        <text v-else>✨ 开始分析</text>
      </button>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { analyzeSentence } from '../../api/analyze.js'
import { useSentencesStore } from '../../stores/index.js'

const sentencesStore = useSentencesStore()

const inputText = ref('')
const analyzing = ref(false)
const error = ref('')
const canRetry = ref(false)
const lastSentenceId = ref('')

function onInput() {
  if (error.value) {
    error.value = ''
    canRetry.value = false
  }
}

const validationError = computed(() => {
  const trimmed = inputText.value.trim()
  if (!trimmed) return null
  if (trimmed.length > 2000) return '内容过长（最多 2000 字符）'
  const letters = (trimmed.match(/[a-zA-Z]/g) || []).length
  if (letters < 10) return '英文字母不足，请输入英语句子'
  if (letters / trimmed.length < 0.3) return '英文比例过低，请输入英语句子'
  return null
})

function cleanText() {
  inputText.value = inputText.value
    .replace(/\r\n/g, ' ')
    .replace(/\n/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

function clearInput() {
  inputText.value = ''
  lastSentenceId.value = ''
  error.value = ''
}

function viewResult() {
  uni.navigateTo({ url: `/pages/collection/detail?id=${lastSentenceId.value}` })
}

async function handleAnalyze() {
  if (!inputText.value.trim()) return
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
    lastSentenceId.value = sentence.id
    inputText.value = ''
  } catch (err) {
    error.value = err.message || '分析失败，请重试'
    canRetry.value = true
  } finally {
    analyzing.value = false
  }
}
</script>

<style scoped>
.container {
  padding: 24rpx 32rpx 200rpx;
}

.notice-success {
  background-color: #f0fdf4;
  border: 2rpx solid #bbf7d0;
  border-radius: 16rpx;
  padding: 20rpx 24rpx;
  margin-bottom: 24rpx;
}

.notice-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.notice-text {
  font-size: 26rpx;
  color: #15803d;
}

.notice-link {
  font-size: 26rpx;
  color: #15803d;
  font-weight: 500;
  text-decoration: underline;
}

.hint {
  display: block;
  font-size: 22rpx;
  color: #9ca3af;
  margin-bottom: 16rpx;
}

.textarea {
  min-height: 240rpx;
  font-size: 28rpx;
  line-height: 1.6;
  border: none;
  padding: 0;
  background: transparent;
}

.validation-hint {
  margin-top: 8rpx;
}

.hint-error {
  font-size: 22rpx;
  color: #ef4444;
}

.input-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 16rpx;
}

.char-count {
  font-size: 24rpx;
}

.count-gray { color: #9ca3af; }
.count-red { color: #ef4444; font-weight: 500; }

.btn-row {
  display: flex;
  gap: 12rpx;
}

.btn-sm {
  padding: 12rpx 24rpx;
  font-size: 24rpx;
  min-height: 64rpx;
}

.error-card {
  background-color: #fef2f2;
  border: 2rpx solid #fecaca;
  margin-bottom: 16rpx;
}

.error-text {
  font-size: 26rpx;
  color: #b91c1c;
}

.mt8 { margin-top: 16rpx; }

.loading-card {
  text-align: center;
  padding: 48rpx;
  margin-bottom: 16rpx;
}

.loading-text {
  display: block;
  font-size: 28rpx;
  color: #4b5563;
  font-weight: 500;
  margin-bottom: 8rpx;
}

.loading-sub {
  display: block;
  font-size: 22rpx;
  color: #9ca3af;
}

.bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 20rpx 32rpx;
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
  background: transparent;
}

.analyze-btn {
  width: 100%;
  padding: 28rpx;
  border-radius: 20rpx;
  font-size: 30rpx;
  font-weight: 600;
  text-align: center;
  border: none;
}

.btn-disabled {
  background-color: #e5e7eb;
  color: #9ca3af;
}

.btn-text-sm {
  font-size: 24rpx;
}
</style>
