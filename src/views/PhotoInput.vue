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

    <div
      v-if="!settingsStore.isVisionConfigured()"
      class="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-amber-800 mb-4"
    >
      <div class="flex items-start gap-3">
        <svg class="w-5 h-5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <div>
          <p class="font-medium">请先配置 API</p>
          <p class="text-sm mt-1">前往 <router-link to="/settings" class="underline font-medium">设置页面</router-link> 配置 API Key 和视觉模型</p>
        </div>
      </div>
    </div>

    <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div class="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-purple-50">
        <h2 class="font-semibold text-gray-800">{{ stepTitle }}</h2>
        <p class="text-sm text-gray-500 mt-0.5">{{ stepDescription }}</p>
      </div>

      <div class="p-6">
        <template v-if="step === 'select'">
          <div class="space-y-4">
            <div
              v-if="imagePreview"
              class="relative group"
            >
              <img
                :src="imagePreview"
                alt="预览图片"
                class="w-full max-h-64 object-contain rounded-xl bg-gray-50"
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

            <div class="flex flex-wrap gap-3">
              <button
                v-if="!imagePreview"
                @click="openCamera"
                :disabled="ocrLoading"
                class="flex-1 min-w-[140px] py-3 px-4 rounded-xl font-medium transition-all bg-blue-500 hover:bg-blue-600 text-white hover:scale-[1.02] disabled:opacity-50"
              >
                📷 拍照
              </button>
              <label class="flex-1 min-w-[140px]">
                <span class="block w-full text-center py-3 px-4 rounded-xl font-medium transition-all cursor-pointer"
                  :class="imagePreview 
                    ? 'bg-gray-100 hover:bg-gray-200 text-gray-700' 
                    : 'bg-purple-500 hover:bg-purple-600 text-white hover:scale-[1.02]'">
                  {{ imagePreview ? '重新选择' : '🖼️ 相册' }}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  class="hidden"
                  @change="handleFileChange"
                  :disabled="ocrLoading"
                />
              </label>
              <button
                v-if="imagePreview"
                @click="handleOCR"
                :disabled="ocrLoading || !settingsStore.isVisionConfigured()"
                class="flex-1 min-w-[140px] py-3 px-4 rounded-xl font-medium transition-all bg-orange-500 hover:bg-orange-600 text-white hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100"
              >
                {{ ocrLoading ? '识别中...' : '✨ 识别图片' }}
              </button>
            </div>
          </div>
        </template>

        <template v-else-if="step === 'ocr-loading'">
          <div class="py-12 text-center">
            <div class="inline-block w-12 h-12 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin mb-4"></div>
            <p class="text-gray-600 font-medium">正在识别图片...</p>
            <p class="text-sm text-gray-400 mt-1">请稍候，这可能需要几秒钟</p>
          </div>
        </template>

        <template v-else-if="step === 'select-sentences'">
          <div class="space-y-4">
            <div class="flex items-center justify-between">
              <span class="text-sm text-gray-500">
                已选择 <span class="font-semibold text-blue-600">{{ selectedSentenceIds.length }}</span> / {{ recognizedSentences.length }} 句
              </span>
              <div class="flex gap-2">
                <button
                  @click="selectAll"
                  class="text-xs px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
                >
                  全选
                </button>
                <button
                  @click="clearSelection"
                  class="text-xs px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
                >
                  清空
                </button>
              </div>
            </div>

            <div class="space-y-2 max-h-72 overflow-y-auto pr-1">
              <label
                v-for="(item, index) in recognizedSentences"
                :key="item.id"
                @click="toggleSelection(item.id)"
                class="block p-3 rounded-xl cursor-pointer transition-all duration-200"
                :class="selectedSentenceIds.includes(item.id)
                  ? 'bg-blue-50 border-2 border-blue-300 shadow-sm'
                  : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'"
                :style="{ animationDelay: `${index * 50}ms` }"
              >
                <div class="flex items-start gap-3">
                  <div
                    class="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors"
                    :class="selectedSentenceIds.includes(item.id)
                      ? 'bg-blue-500 text-white'
                      : 'border-2 border-gray-300'"
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
                :disabled="selectedSentenceIds.length === 0 || !settingsStore.isConfigured()"
                class="w-full py-3 px-4 rounded-xl font-medium transition-all bg-orange-500 hover:bg-orange-600 text-white hover:scale-[1.01] disabled:opacity-50 disabled:hover:scale-100"
              >
                🚀 分析 {{ selectedSentenceIds.length }} 个句子
              </button>
            </div>
          </div>
        </template>

        <template v-else-if="step === 'submitted'">
          <div class="py-8 text-center">
            <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
              <svg class="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p class="text-lg font-semibold text-gray-800 mb-2">已提交分析</p>
            <p class="text-gray-500 mb-6">{{ submittedCount }} 个句子正在后台分析中<br>稍后可在收藏页查看结果</p>
            <div class="flex flex-wrap justify-center gap-3">
              <router-link
                to="/collection"
                class="py-2.5 px-5 rounded-xl font-medium bg-blue-500 hover:bg-blue-600 text-white transition-colors"
              >
                前往收藏页
              </router-link>
              <button
                @click="resetAll"
                class="py-2.5 px-5 rounded-xl font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
              >
                继续添加
              </button>
            </div>
          </div>
        </template>
      </div>
    </div>

    <div v-if="ocrError" class="mt-4 bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
      <div class="flex items-start gap-2">
        <svg class="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>{{ ocrError }}</span>
      </div>
    </div>

    <!-- Camera Modal -->
    <div
      v-if="showCameraModal"
      class="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4"
      @click.self="closeCamera"
    >
      <div class="bg-white rounded-2xl max-w-2xl w-full overflow-hidden">
        <div class="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 class="font-semibold text-gray-800">拍照</h3>
          <button
            @click="closeCamera"
            class="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-500 transition-colors"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div class="p-6">
          <div class="relative bg-black rounded-xl overflow-hidden" style="aspect-ratio: 4/3;">
            <video
              ref="videoElement"
              autoplay
              playsinline
              class="w-full h-full object-cover"
            ></video>
            <canvas ref="canvasElement" class="hidden"></canvas>
          </div>
          <div v-if="cameraError" class="mt-4 text-sm text-red-600 text-center">
            {{ cameraError }}
          </div>
          <div class="mt-4 flex justify-center gap-3">
            <button
              @click="capturePhoto"
              :disabled="!cameraReady"
              class="py-3 px-6 rounded-xl font-medium bg-blue-500 hover:bg-blue-600 text-white transition-colors disabled:opacity-50"
            >
              📸 拍照
            </button>
            <button
              @click="closeCamera"
              class="py-3 px-6 rounded-xl font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
            >
              取消
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onUnmounted } from 'vue'
import { extractSentences } from '../api/ocr.js'
import { useSentencesStore, useSettingsStore } from '../stores/index.js'

const sentencesStore = useSentencesStore()
const settingsStore = useSettingsStore()

const imagePreview = ref('')
const imageBase64 = ref('')
const recognizedSentences = ref([])
const selectedSentenceIds = ref([])
const ocrLoading = ref(false)
const ocrError = ref('')
const submitted = ref(false)
const submittedCount = ref(0)

// Camera related
const showCameraModal = ref(false)
const videoElement = ref(null)
const canvasElement = ref(null)
const cameraStream = ref(null)
const cameraReady = ref(false)
const cameraError = ref('')

const step = computed(() => {
  if (ocrLoading.value) return 'ocr-loading'
  if (submitted.value) return 'submitted'
  if (recognizedSentences.value.length > 0) return 'select-sentences'
  return 'select'
})

const stepTitle = computed(() => {
  switch (step.value) {
    case 'select': return '选择图片'
    case 'ocr-loading': return '正在识别'
    case 'select-sentences': return '选择句子'
    case 'submitted': return '已提交分析'
    default: return ''
  }
})

const stepDescription = computed(() => {
  switch (step.value) {
    case 'select': return '拍照或上传包含英文句子的图片'
    case 'ocr-loading': return 'AI 正在识别图片中的英文句子'
    case 'select-sentences': return '选择需要分析学习的句子'
    case 'submitted': return '句子已在后台分析中'
    default: return ''
  }
})

function makeSentenceItems(sentences) {
  return sentences.map((text, index) => ({
    id: `${Date.now()}-${index}`,
    text,
  }))
}

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
  submitted.value = false
  recognizedSentences.value = []
  selectedSentenceIds.value = []

  try {
    const dataUrl = await fileToDataUrl(file)
    imagePreview.value = dataUrl
    const split = String(dataUrl).split(',')
    imageBase64.value = split.length > 1 ? split[1] : ''
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
  submitted.value = false
  submittedCount.value = 0
}

async function handleOCR() {
  if (!imageBase64.value) return
  if (!settingsStore.isVisionConfigured()) {
    ocrError.value = '请先在设置中配置API Key和视觉模型ID'
    return
  }

  ocrLoading.value = true
  ocrError.value = ''

  try {
    const extracted = await extractSentences(imageBase64.value)
    const deduped = [...new Set(extracted.map((item) => item.trim()).filter((item) => item.length > 2))]
    if (deduped.length === 0) {
      ocrError.value = '未识别到有效英文句子，请更换更清晰的图片重试'
      recognizedSentences.value = []
      selectedSentenceIds.value = []
      return
    }
    recognizedSentences.value = makeSentenceItems(deduped)
    selectedSentenceIds.value = recognizedSentences.value.map((item) => item.id)
  } catch (err) {
    ocrError.value = err.message || '图片识别失败，请重试'
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
  if (!settingsStore.isConfigured()) {
    ocrError.value = '请先在设置中配置API Key和文本模型ID'
    return
  }

  ocrError.value = ''
  submittedCount.value = selectedTexts.length
  submitted.value = true

  // 后台异步分析，不等待完成
  sentencesStore.addSentencesFromPhotoBackground(selectedTexts)
}

function resetAll() {
  imagePreview.value = ''
  imageBase64.value = ''
  recognizedSentences.value = []
  selectedSentenceIds.value = []
  ocrError.value = ''
  submitted.value = false
  submittedCount.value = 0
}

// Camera functions
async function openCamera() {
  showCameraModal.value = true
  cameraError.value = ''
  cameraReady.value = false

  try {
    // Request camera access with rear camera preference
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: 'environment' }, // Prefer rear camera
        width: { ideal: 1920 },
        height: { ideal: 1080 }
      }
    })

    cameraStream.value = stream
    
    // Wait for next tick to ensure video element is mounted
    await new Promise(resolve => setTimeout(resolve, 100))
    
    if (videoElement.value) {
      videoElement.value.srcObject = stream
      videoElement.value.onloadedmetadata = () => {
        cameraReady.value = true
      }
    }
  } catch (err) {
    console.error('Camera access error:', err)
    if (err.name === 'NotAllowedError') {
      cameraError.value = '摄像头权限被拒绝，请在浏览器设置中允许访问摄像头'
    } else if (err.name === 'NotFoundError') {
      cameraError.value = '未找到摄像头设备'
    } else {
      cameraError.value = '无法访问摄像头：' + err.message
    }
  }
}

function closeCamera() {
  if (cameraStream.value) {
    cameraStream.value.getTracks().forEach(track => track.stop())
    cameraStream.value = null
  }
  showCameraModal.value = false
  cameraReady.value = false
  cameraError.value = ''
}

function capturePhoto() {
  if (!videoElement.value || !canvasElement.value || !cameraReady.value) return

  const video = videoElement.value
  const canvas = canvasElement.value

  // Set canvas size to match video
  canvas.width = video.videoWidth
  canvas.height = video.videoHeight

  // Draw video frame to canvas
  const ctx = canvas.getContext('2d')
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

  // Convert to data URL
  const dataUrl = canvas.toDataURL('image/jpeg', 0.9)
  imagePreview.value = dataUrl
  
  const split = dataUrl.split(',')
  imageBase64.value = split.length > 1 ? split[1] : ''

  // Reset state
  recognizedSentences.value = []
  selectedSentenceIds.value = []
  ocrError.value = ''
  submitted.value = false

  // Close camera
  closeCamera()
}

// Cleanup on unmount
onUnmounted(() => {
  closeCamera()
})
</script>
