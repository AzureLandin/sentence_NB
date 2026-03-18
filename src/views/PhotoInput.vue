<template>
  <div class="max-w-2xl mx-auto">
    <div class="flex items-center gap-3 mb-6">
      <router-link to="/" class="text-gray-400 hover:text-gray-600 transition-colors">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
      </router-link>
      <h1 class="text-xl font-bold text-gray-800">拍照输入</h1>
    </div>



    <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div class="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-purple-50">
        <h2 class="font-semibold text-gray-800">{{ stepTitle }}</h2>
        <p class="text-sm text-gray-500 mt-0.5">{{ stepDescription }}</p>
      </div>

      <div class="p-4">
        <!-- Step: select -->
        <template v-if="currentStep === 'select'">
          <div class="space-y-4">
            <!-- Image preview -->
            <div v-if="imagePreview" class="relative group">
              <img
                :src="imagePreview"
                alt="预览图片"
                class="w-full max-h-72 object-contain rounded-xl bg-gray-50"
              />
              <button
                @click="clearImage"
                class="absolute top-2 right-2 w-8 h-8 bg-white/90 hover:bg-white rounded-full shadow-md flex items-center justify-center text-gray-500 hover:text-red-500 transition-colors"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <!-- Empty state -->
            <div v-else>
              <label class="block cursor-pointer">
                <div class="w-full rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50 flex flex-col items-center justify-center gap-3 py-14 transition-colors hover:bg-blue-100 active:bg-blue-200">
                  <div class="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-3xl">📷</div>
                  <div class="text-center">
                    <p class="font-semibold text-blue-700">点击拍照</p>
                    <p class="text-xs text-blue-400 mt-1">拍摄包含英文句子的图片</p>
                  </div>
                </div>
                <input type="file" accept="image/*" capture="environment" class="hidden" @change="handleFileChange" />
              </label>
              <div class="flex items-center gap-3 mt-3">
                <div class="flex-1 h-px bg-gray-200"></div>
                <span class="text-xs text-gray-400">或者</span>
                <div class="flex-1 h-px bg-gray-200"></div>
              </div>
              <label class="mt-3 block cursor-pointer">
                <span class="block w-full text-center py-3 px-4 rounded-xl font-medium bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors">🖼️ 从相册选择</span>
                <input type="file" accept="image/*" class="hidden" @change="handleFileChange" />
              </label>
            </div>

            <!-- Action buttons when image selected -->
            <div v-if="imagePreview" class="flex gap-2">
              <label class="cursor-pointer">
                <span class="block py-3 px-4 rounded-xl font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors text-sm whitespace-nowrap">重新选择</span>
                <input type="file" accept="image/*" class="hidden" @change="handleFileChange" />
              </label>
              <button
                @click="startCrop"
                class="flex-1 py-3 px-4 rounded-xl font-medium bg-blue-500 hover:bg-blue-600 text-white transition-colors text-sm"
              >
                ✂️ 裁切
              </button>
              <button
                @click="handleOCR"
                :disabled="ocrLoading"
                class="flex-1 py-3 px-4 rounded-xl font-medium bg-orange-500 hover:bg-orange-600 text-white disabled:opacity-50 transition-colors text-sm"
              >
                {{ ocrLoading ? '识别中...' : '✨ 识别' }}
              </button>
            </div>
          </div>
        </template>

        <!-- Step: crop (fullscreen on mobile) -->
        <template v-else-if="currentStep === 'crop'">
          <div class="fixed inset-0 z-50 bg-black flex flex-col">
            <!-- Header -->
            <div class="flex items-center justify-between px-4 py-3 bg-gray-900 text-white">
              <span class="font-medium">裁切图片</span>
              <div class="flex gap-2">
                <button @click="cancelCrop" class="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-sm">
                  取消
                </button>
                <button @click="confirmCrop" class="px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-sm font-medium">
                  确认
                </button>
              </div>
            </div>
            <!-- Cropper container -->
            <div class="flex-1 overflow-hidden">
              <img ref="cropperImageEl" :src="imagePreview" class="block w-full h-full" />
            </div>
          </div>
        </template>

        <!-- Step: ocr-loading -->
        <template v-else-if="currentStep === 'ocr-loading'">
          <div class="py-12 text-center">
            <div class="inline-block w-12 h-12 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin mb-4"></div>
            <p class="text-gray-600 font-medium">正在识别图片...</p>
            <p class="text-sm text-gray-400 mt-1">请稍候，这可能需要几秒钟</p>
          </div>
        </template>

        <!-- Step: select-sentences -->
        <template v-else-if="currentStep === 'select-sentences'">
          <div class="space-y-4">
            <div class="flex items-center justify-between">
              <span class="text-sm text-gray-500">
                已选择 <span class="font-semibold text-blue-600">{{ selectedSentenceIds.length }}</span> / {{ recognizedSentences.length }} 句
              </span>
              <div class="flex gap-2">
                <button @click="selectAll" class="text-xs px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600">全选</button>
                <button @click="clearSelection" class="text-xs px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600">清空</button>
              </div>
            </div>
            <div class="space-y-2 max-h-72 overflow-y-auto pr-1">
              <label
                v-for="(item, index) in recognizedSentences"
                :key="item.id"
                @click="toggleSelection(item.id)"
                class="block p-3 rounded-xl cursor-pointer transition-all"
                :class="selectedSentenceIds.includes(item.id) ? 'bg-blue-50 border-2 border-blue-300' : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'"
              >
                <div class="flex items-start gap-3">
                  <div
                    class="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5"
                    :class="selectedSentenceIds.includes(item.id) ? 'bg-blue-500 text-white' : 'border-2 border-gray-300'"
                  >
                    <svg v-if="selectedSentenceIds.includes(item.id)" class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p class="text-sm text-gray-700 leading-relaxed">{{ item.text }}</p>
                </div>
              </label>
            </div>
            <div class="pt-2">
              <button
                @click="handleBatchAnalyze"
                :disabled="selectedSentenceIds.length === 0"
                class="w-full py-3 px-4 rounded-xl font-medium bg-orange-500 hover:bg-orange-600 text-white disabled:opacity-50"
              >
                🚀 分析 {{ selectedSentenceIds.length }} 个句子
              </button>
            </div>
          </div>
        </template>

        <!-- Step: submitted -->
        <template v-else-if="currentStep === 'submitted'">
          <div class="py-8 text-center">
            <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
              <svg class="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p class="text-lg font-semibold text-gray-800 mb-2">已提交分析</p>
            <p class="text-gray-500 mb-6">{{ submittedCount }} 个句子正在后台分析中<br>稍后可在收藏页查看结果</p>
            <div class="flex flex-wrap justify-center gap-3">
              <router-link to="/collection" class="py-2.5 px-5 rounded-xl font-medium bg-blue-500 hover:bg-blue-600 text-white">
                前往收藏页
              </router-link>
              <button @click="resetAll" class="py-2.5 px-5 rounded-xl font-medium bg-gray-100 hover:bg-gray-200 text-gray-700">
                继续添加
              </button>
            </div>
          </div>
        </template>
      </div>
    </div>

    <!-- OCR Error: actionable recovery -->
    <div v-if="ocrError" class="mt-4 bg-red-50 border border-red-200 rounded-xl p-4">
      <div class="flex items-start gap-2 mb-3">
        <svg class="w-5 h-5 flex-shrink-0 mt-0.5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p class="text-sm text-red-700">{{ ocrError }}</p>
      </div>
      <div class="flex flex-wrap gap-2">
        <button
          v-if="imageBase64"
          @click="retryOCR"
          class="text-xs px-3 py-2 rounded-lg bg-red-100 hover:bg-red-200 text-red-700 font-medium transition-colors min-h-[36px]"
        >
          重试识别
        </button>
        <label class="text-xs px-3 py-2 rounded-lg bg-white hover:bg-gray-50 border border-red-200 text-red-700 font-medium transition-colors cursor-pointer min-h-[36px] flex items-center">
          重新选图
          <input type="file" accept="image/*" class="hidden" @change="handleFileChange" />
        </label>
        <router-link
          to="/text-input"
          class="text-xs px-3 py-2 rounded-lg bg-white hover:bg-gray-50 border border-red-200 text-red-600 font-medium transition-colors min-h-[36px] flex items-center"
        >
          改为文字输入
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, onUnmounted } from 'vue'
import Cropper from 'cropperjs'
import 'cropperjs/dist/cropper.css'
import { extractSentences } from '../api/ocr.js'
import { useSentencesStore } from '../stores/index.js'

const sentencesStore = useSentencesStore()

const currentStep = ref('select')
const imagePreview = ref('')
const imageBase64 = ref('')
const cropperImageEl = ref(null)
const cropperInstance = ref(null)
const ocrLoading = ref(false)
const ocrError = ref('')
const recognizedSentences = ref([])
const selectedSentenceIds = ref([])
const submittedCount = ref(0)

const stepTitle = computed(() => {
  switch (currentStep.value) {
    case 'select': return '选择图片'
    case 'crop': return '裁切图片'
    case 'ocr-loading': return '正在识别'
    case 'select-sentences': return '选择句子'
    case 'submitted': return '已提交分析'
    default: return ''
  }
})

const stepDescription = computed(() => {
  switch (currentStep.value) {
    case 'select': return '拍照或上传包含英文句子的图片'
    case 'crop': return '拖动选框调整裁切区域，完成后点击确认'
    case 'ocr-loading': return 'AI 正在识别图片中的英文句子'
    case 'select-sentences': return '选择需要分析学习的句子'
    case 'submitted': return '句子已在后台分析中'
    default: return ''
  }
})

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error('读取图片失败，请重试'))
    reader.readAsDataURL(file)
  })
}

async function handleFileChange(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return

  ocrError.value = ''
  recognizedSentences.value = []
  selectedSentenceIds.value = []

  try {
    const dataUrl = await fileToDataUrl(file)
    imagePreview.value = dataUrl
    const split = String(dataUrl).split(',')
    imageBase64.value = split.length > 1 ? split[1] : ''
    currentStep.value = 'select'
  } catch (err) {
    ocrError.value = err.message || '读取图片失败，请重试'
  }
}

function clearImage() {
  imagePreview.value = ''
  imageBase64.value = ''
  recognizedSentences.value = []
  selectedSentenceIds.value = []
  ocrError.value = ''
  submittedCount.value = 0
  currentStep.value = 'select'
}

function startCrop() {
  currentStep.value = 'crop'
  nextTick(() => {
    if (cropperInstance.value) {
      cropperInstance.value.destroy()
      cropperInstance.value = null
    }
    if (cropperImageEl.value) {
      cropperInstance.value = new Cropper(cropperImageEl.value, {
        viewMode: 1,
        autoCropArea: 0.9,
        movable: true,
        zoomable: true,
        rotatable: false,
        checkOrientation: false,
      })
    }
  })
}

function cancelCrop() {
  if (cropperInstance.value) {
    cropperInstance.value.destroy()
    cropperInstance.value = null
  }
  currentStep.value = 'select'
}

function confirmCrop() {
  if (!cropperInstance.value) return
  const canvas = cropperInstance.value.getCroppedCanvas({ maxWidth: 2048, maxHeight: 2048 })
  const dataUrl = canvas.toDataURL('image/jpeg', 0.92)
  imagePreview.value = dataUrl
  imageBase64.value = dataUrl.split(',')[1] || ''
  cropperInstance.value.destroy()
  cropperInstance.value = null
  currentStep.value = 'select'
}

async function handleOCR() {
  if (!imageBase64.value) return

  ocrLoading.value = true
  ocrError.value = ''
  currentStep.value = 'ocr-loading'

  try {
    const extracted = await extractSentences(imageBase64.value)
    const deduped = [...new Set(extracted.map((item) => item.trim()).filter((item) => item.length > 2))]
    if (deduped.length === 0) {
      ocrError.value = '未识别到有效英文句子，请更换更清晰的图片重试'
      currentStep.value = 'select'
      return
    }
    recognizedSentences.value = deduped.map((text, index) => ({ id: `${Date.now()}-${index}`, text }))
    selectedSentenceIds.value = recognizedSentences.value.map((item) => item.id)
    currentStep.value = 'select-sentences'
  } catch (err) {
    ocrError.value = err.message || '图片识别失败，请重试'
    currentStep.value = 'select'
  } finally {
    ocrLoading.value = false
  }
}

function toggleSelection(id) {
  if (selectedSentenceIds.value.includes(id)) {
    selectedSentenceIds.value = selectedSentenceIds.value.filter((item) => item !== id)
  } else {
    selectedSentenceIds.value = [...selectedSentenceIds.value, id]
  }
}

function selectAll() {
  selectedSentenceIds.value = recognizedSentences.value.map((item) => item.id)
}

function clearSelection() {
  selectedSentenceIds.value = []
}

async function handleBatchAnalyze() {
  const selectedTexts = recognizedSentences.value
    .filter((item) => selectedSentenceIds.value.includes(item.id))
    .map((item) => item.text)

  if (selectedTexts.length === 0) return

  ocrError.value = ''
  submittedCount.value = selectedTexts.length
  currentStep.value = 'submitted'

  sentencesStore.addSentencesFromPhotoBackground(selectedTexts)
}

async function retryOCR() {
  ocrError.value = ''
  await handleOCR()
}

function resetAll() {
  imagePreview.value = ''
  imageBase64.value = ''
  recognizedSentences.value = []
  selectedSentenceIds.value = []
  ocrError.value = ''
  submittedCount.value = 0
  currentStep.value = 'select'
}

onUnmounted(() => {
  if (cropperInstance.value) {
    cropperInstance.value.destroy()
    cropperInstance.value = null
  }
})
</script>

<style scoped>
/* Cropper.js 样式优化 */

/* 背景遮罩：纯色半透明替代棋盘格 */
:deep(.cropper-bg) {
  background-image: none !important;
  background-color: rgba(0, 0, 0, 0.6);
}

/* 裁切框边框 */
:deep(.cropper-view-box) {
  outline: 2px solid rgba(59, 130, 246, 0.8);
  outline-offset: -1px;
}

/* 九宫格虚线 */
:deep(.cropper-dashed) {
  border-color: rgba(255, 255, 255, 0.3) !important;
  border-width: 1px !important;
}

/* 边缘拖拽线 */
:deep(.cropper-line) {
  background-color: rgba(59, 130, 246, 0.5);
}

/* 角点 */
:deep(.cropper-point) {
  background-color: #3b82f6;
  width: 8px;
  height: 8px;
  opacity: 0.9;
}

/* 右下角点加大 */
:deep(.cropper-point.point-se) {
  width: 12px;
  height: 12px;
}
</style>
