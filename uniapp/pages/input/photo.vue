<template>
  <view class="container">
    <!-- Step Card -->
    <view class="card step-card">
      <view class="step-header">
        <text class="step-title">{{ stepTitle }}</text>
        <text class="step-desc">{{ stepDescription }}</text>
      </view>

      <!-- Step: select -->
      <view v-if="currentStep === 'select'">
        <!-- Image preview -->
        <view v-if="imagePreview" class="preview-wrap">
          <image :src="imagePreview" mode="widthFix" class="preview-img" />
          <view class="clear-btn" @tap="clearImage">
            <text>✕</text>
          </view>
        </view>

        <!-- Empty state -->
        <view v-else class="upload-area" @tap="chooseImage">
          <text class="upload-icon">📷</text>
          <text class="upload-title">点击选择图片</text>
          <text class="upload-desc">拍照或从相册选择包含英文句子的图片</text>
        </view>

        <!-- Buttons when image selected -->
        <view v-if="imagePreview" class="action-row">
          <button class="btn-outline flex1" @tap="chooseImage">重新选择</button>
          <button
            class="btn-accent flex1"
            :disabled="ocrLoading"
            @tap="handleOCR"
          >
            {{ ocrLoading ? '识别中...' : '✨ 识别' }}
          </button>
        </view>
      </view>

      <!-- Step: ocr-loading -->
      <view v-else-if="currentStep === 'ocr-loading'" class="loading-wrap">
        <text class="loading-text">正在识别图片...</text>
        <text class="loading-sub">请稍候，这可能需要几秒钟</text>
      </view>

      <!-- Step: select-sentences -->
      <view v-else-if="currentStep === 'select-sentences'">
        <view class="sel-header">
          <text class="sel-count">
            已选择 <text class="sel-num">{{ selectedIds.length }}</text> / {{ recognizedSentences.length }} 句
          </text>
          <view class="sel-btns">
            <text class="sel-btn" @tap="selectAll">全选</text>
            <text class="sel-btn" @tap="clearSelection">清空</text>
          </view>
        </view>

        <scroll-view scroll-y class="sentence-list">
          <view
            v-for="item in recognizedSentences"
            :key="item.id"
            class="sentence-item"
            :class="selectedIds.includes(item.id) ? 'item-selected' : 'item-normal'"
            @tap="toggleSelection(item.id)"
          >
            <view class="checkbox" :class="selectedIds.includes(item.id) ? 'cb-checked' : 'cb-empty'">
              <text v-if="selectedIds.includes(item.id)" class="cb-tick">✓</text>
            </view>
            <text class="item-text">{{ item.text }}</text>
          </view>
        </scroll-view>

        <button
          class="btn-accent analyze-btn"
          :disabled="selectedIds.length === 0"
          @tap="handleBatchAnalyze"
        >
          🚀 分析 {{ selectedIds.length }} 个句子
        </button>
      </view>

      <!-- Step: submitted -->
      <view v-else-if="currentStep === 'submitted'" class="submitted-wrap">
        <text class="submitted-icon">✅</text>
        <text class="submitted-title">已提交分析</text>
        <text class="submitted-desc">{{ submittedCount }} 个句子正在后台分析中，稍后可在收藏页查看结果</text>
        <view class="submitted-btns">
          <button class="btn-primary" @tap="goToCollection">前往收藏页</button>
          <button class="btn-outline" @tap="resetAll">继续添加</button>
        </view>
      </view>
    </view>

    <!-- OCR Error -->
    <view v-if="ocrError" class="card error-card">
      <text class="error-text">{{ ocrError }}</text>
      <view class="error-btns">
        <button v-if="imageBase64" class="btn-outline btn-sm" @tap="retryOCR">重试识别</button>
        <button class="btn-outline btn-sm" @tap="chooseImage">重新选图</button>
        <button class="btn-outline btn-sm" @tap="goToTextInput">改为文字输入</button>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { extractSentences } from '../../api/ocr.js'
import { useSentencesStore } from '../../stores/index.js'

const sentencesStore = useSentencesStore()

const currentStep = ref('select')
const imagePreview = ref('')
const imageBase64 = ref('')
const ocrLoading = ref(false)
const ocrError = ref('')
const recognizedSentences = ref([])
const selectedIds = ref([])
const submittedCount = ref(0)

/**
 * 将图片文件读取为 base64。
 * H5 环境使用 XMLHttpRequest + FileReader；小程序使用 getFileSystemManager。
 */
function readFileAsBase64(filePath) {
  // #ifdef H5
  // H5 环境：filePath 是 blob URL，通过 XMLHttpRequest 读取
  const xhr = new XMLHttpRequest()
  xhr.open('GET', filePath, true)
  xhr.responseType = 'blob'
  xhr.onload = () => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const dataUrl = reader.result
      const base64 = dataUrl.split(',')[1] || ''
      imageBase64.value = base64
    }
    reader.onerror = () => {
      ocrError.value = '读取图片失败，请重试'
    }
    reader.readAsDataURL(xhr.response)
  }
  xhr.onerror = () => {
    ocrError.value = '读取图片失败，请重试'
  }
  xhr.send()
  // #endif

  // #ifndef H5
  // 小程序 / App 环境：使用 getFileSystemManager
  const fs = uni.getFileSystemManager()
  fs.readFile({
    filePath,
    encoding: 'base64',
    success: (r) => {
      imageBase64.value = r.data
    },
    fail: () => {
      ocrError.value = '读取图片失败，请重试'
    },
  })
  // #endif
}

const stepTitle = computed(() => {
  switch (currentStep.value) {
    case 'select': return '选择图片'
    case 'ocr-loading': return '正在识别'
    case 'select-sentences': return '选择句子'
    case 'submitted': return '已提交分析'
    default: return ''
  }
})

const stepDescription = computed(() => {
  switch (currentStep.value) {
    case 'select': return '拍照或上传包含英文句子的图片'
    case 'ocr-loading': return 'AI 正在识别图片中的英文句子'
    case 'select-sentences': return '选择需要分析学习的句子'
    case 'submitted': return '句子已在后台分析中'
    default: return ''
  }
})

function chooseImage() {
  uni.chooseImage({
    count: 1,
    sizeType: ['compressed'],
    sourceType: ['camera', 'album'],
    success: (res) => {
      const tempFilePath = res.tempFilePaths[0]
      imagePreview.value = tempFilePath
      ocrError.value = ''
      recognizedSentences.value = []
      selectedIds.value = []
      currentStep.value = 'select'

      // 读取为 base64（H5 和小程序走不同路径）
      readFileAsBase64(tempFilePath)
    },
    fail: () => {
      // 用户取消，不处理
    },
  })
}

function clearImage() {
  imagePreview.value = ''
  imageBase64.value = ''
  recognizedSentences.value = []
  selectedIds.value = []
  ocrError.value = ''
  submittedCount.value = 0
  currentStep.value = 'select'
}

async function handleOCR() {
  if (!imageBase64.value) return
  ocrLoading.value = true
  ocrError.value = ''
  currentStep.value = 'ocr-loading'

  try {
    const extracted = await extractSentences(imageBase64.value)
    const deduped = [...new Set(extracted.map((s) => s.trim()).filter((s) => s.length > 2))]
    if (deduped.length === 0) {
      ocrError.value = '未识别到有效英文句子，请更换更清晰的图片重试'
      currentStep.value = 'select'
      return
    }
    recognizedSentences.value = deduped.map((text, i) => ({ id: `${Date.now()}-${i}`, text }))
    selectedIds.value = recognizedSentences.value.map((item) => item.id)
    currentStep.value = 'select-sentences'
  } catch (err) {
    ocrError.value = err.message || '图片识别失败，请重试'
    currentStep.value = 'select'
  } finally {
    ocrLoading.value = false
  }
}

async function retryOCR() {
  ocrError.value = ''
  await handleOCR()
}

function toggleSelection(id) {
  if (selectedIds.value.includes(id)) {
    selectedIds.value = selectedIds.value.filter((v) => v !== id)
  } else {
    selectedIds.value = [...selectedIds.value, id]
  }
}

function selectAll() {
  selectedIds.value = recognizedSentences.value.map((item) => item.id)
}

function clearSelection() {
  selectedIds.value = []
}

async function handleBatchAnalyze() {
  const selectedTexts = recognizedSentences.value
    .filter((item) => selectedIds.value.includes(item.id))
    .map((item) => item.text)

  if (selectedTexts.length === 0) return

  ocrError.value = ''
  submittedCount.value = selectedTexts.length
  currentStep.value = 'submitted'

  sentencesStore.addSentencesFromPhotoBackground(selectedTexts)
}

function goToCollection() {
  uni.switchTab({ url: '/pages/collection/index' })
}

function goToTextInput() {
  uni.switchTab({ url: '/pages/input/text' })
}

function resetAll() {
  clearImage()
}
</script>

<style scoped>
.container {
  padding: 24rpx 32rpx;
}

.step-header {
  padding-bottom: 24rpx;
  border-bottom: 2rpx solid #f3f4f6;
  margin-bottom: 32rpx;
}

.step-title {
  display: block;
  font-size: 32rpx;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 8rpx;
}

.step-desc {
  font-size: 24rpx;
  color: #9ca3af;
}

.preview-wrap {
  position: relative;
  margin-bottom: 24rpx;
}

.preview-img {
  width: 100%;
  border-radius: 16rpx;
  background-color: #f9fafb;
}

.clear-btn {
  position: absolute;
  top: 16rpx;
  right: 16rpx;
  width: 52rpx;
  height: 52rpx;
  border-radius: 50%;
  background-color: rgba(255,255,255,0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24rpx;
  color: #374151;
  box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.15);
}

.upload-area {
  border: 3rpx dashed #bfdbfe;
  border-radius: 24rpx;
  background-color: #eff6ff;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80rpx 32rpx;
  margin-bottom: 24rpx;
}

.upload-icon {
  font-size: 72rpx;
  margin-bottom: 16rpx;
}

.upload-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #1d4ed8;
  margin-bottom: 8rpx;
}

.upload-desc {
  font-size: 22rpx;
  color: #93c5fd;
  text-align: center;
}

.action-row {
  display: flex;
  gap: 16rpx;
  margin-top: 16rpx;
}

.flex1 { flex: 1; }

.loading-wrap {
  text-align: center;
  padding: 80rpx 0;
}

.loading-text {
  display: block;
  font-size: 30rpx;
  color: #4b5563;
  font-weight: 500;
  margin-bottom: 8rpx;
}

.loading-sub {
  font-size: 24rpx;
  color: #9ca3af;
}

.sel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20rpx;
}

.sel-count {
  font-size: 26rpx;
  color: #6b7280;
}

.sel-num {
  font-weight: 600;
  color: #3b82f6;
}

.sel-btns {
  display: flex;
  gap: 16rpx;
}

.sel-btn {
  font-size: 24rpx;
  color: #6b7280;
  padding: 8rpx 16rpx;
  background-color: #f3f4f6;
  border-radius: 8rpx;
}

.sentence-list {
  max-height: 500rpx;
  margin-bottom: 24rpx;
}

.sentence-item {
  display: flex;
  align-items: flex-start;
  gap: 20rpx;
  padding: 20rpx;
  border-radius: 16rpx;
  margin-bottom: 12rpx;
  border: 3rpx solid transparent;
}

.item-selected {
  background-color: #eff6ff;
  border-color: #93c5fd;
}

.item-normal {
  background-color: #f9fafb;
}

.checkbox {
  width: 36rpx;
  height: 36rpx;
  border-radius: 8rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 4rpx;
}

.cb-checked {
  background-color: #3b82f6;
}

.cb-empty {
  border: 3rpx solid #d1d5db;
}

.cb-tick {
  color: #ffffff;
  font-size: 22rpx;
  font-weight: 700;
}

.item-text {
  font-size: 26rpx;
  color: #374151;
  line-height: 1.5;
  flex: 1;
}

.analyze-btn {
  width: 100%;
  margin-top: 8rpx;
}

.submitted-wrap {
  text-align: center;
  padding: 40rpx 0;
}

.submitted-icon {
  display: block;
  font-size: 80rpx;
  margin-bottom: 24rpx;
}

.submitted-title {
  display: block;
  font-size: 36rpx;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 16rpx;
}

.submitted-desc {
  display: block;
  font-size: 26rpx;
  color: #6b7280;
  margin-bottom: 40rpx;
}

.submitted-btns {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  align-items: center;
}

.error-card {
  background-color: #fef2f2;
  border: 2rpx solid #fecaca;
  margin-top: 24rpx;
}

.error-text {
  display: block;
  font-size: 26rpx;
  color: #b91c1c;
  margin-bottom: 20rpx;
}

.error-btns {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}

.btn-sm {
  padding: 12rpx 24rpx;
  font-size: 24rpx;
  min-height: 64rpx;
}
</style>
