<template>
  <view class="container">
    <!-- Not found -->
    <view v-if="!sentence" class="card empty-card">
      <text class="empty-icon">🔍</text>
      <text class="empty-text">句子不存在或已被删除</text>
      <button class="btn-outline" @tap="goBack">返回收藏</button>
    </view>

    <template v-else>
      <!-- 1. Original Sentence -->
      <view class="card">
        <view class="card-header-row">
          <text class="card-label">原句</text>
          <text class="source-badge">{{ sentence.source === 'photo' ? '📷 拍照' : '✍️ 文字' }}</text>
        </view>
        <text class="content-text">{{ sentence.content }}</text>
        <text class="date-text">{{ formattedDate }}</text>
      </view>

      <!-- 2. Translation -->
      <view v-if="sentence.analysis?.translation" class="card">
        <text class="card-label">译文</text>
        <text class="translation-text">{{ sentence.analysis.translation }}</text>
        <view v-if="sentence.analysis.translationNote" class="note-wrap">
          <text class="note-label">翻译思路</text>
          <text class="note-text">{{ sentence.analysis.translationNote }}</text>
        </view>
      </view>

      <!-- 3. Tags -->
      <view class="card">
        <text class="card-label">标签</text>
        <view class="tags-wrap">
          <view v-for="(tag, index) in tags" :key="tag" class="tag-chip">
            <text class="tag-text">{{ tag }}</text>
            <text class="tag-remove" @tap="removeTag(index)">×</text>
          </view>
        </view>
        <view class="tag-input-row">
          <input
            v-model="newTag"
            placeholder="输入标签后回车添加"
            class="input-field tag-input"
            @confirm="addTag"
          />
          <button class="btn-outline btn-sm" @tap="addTag">添加</button>
        </view>
        <button v-if="tagsChanged" class="btn-primary btn-sm mt16" @tap="saveTags">
          保存标签
        </button>
      </view>

      <!-- 4. Analysis sections -->
      <view v-if="sentence.analysis" class="space-y">
        <!-- Structure -->
        <view class="card">
          <view class="section-header" @tap="toggle('structure')">
            <text class="section-title">🔍 句子结构</text>
            <text class="chevron">{{ expanded.structure ? '▲' : '▽' }}</text>
          </view>
          <view v-if="expanded.structure" class="section-body">
            <view v-for="(part, i) in sentence.analysis.structure" :key="i" class="struct-item">
              <view class="type-badge">
                <text class="type-text">{{ part.type }}</text>
              </view>
              <view class="struct-content">
                <text class="struct-text">{{ part.text }}</text>
                <text class="struct-trans">{{ part.translation }}</text>
              </view>
            </view>
          </view>
        </view>

        <!-- Grammar -->
        <view class="card">
          <view class="section-header" @tap="toggle('grammar')">
            <text class="section-title">📖 语法点</text>
            <text class="chevron">{{ expanded.grammar ? '▲' : '▽' }}</text>
          </view>
          <view v-if="expanded.grammar" class="section-body">
            <view v-for="(item, i) in sentence.analysis.grammar" :key="i" class="grammar-item">
              <text class="grammar-point">{{ item.point }}</text>
              <text class="grammar-exp">{{ item.explanation }}</text>
              <view v-if="item.examples?.length" class="examples">
                <text v-for="(ex, j) in item.examples" :key="j" class="example-text">{{ ex }}</text>
              </view>
            </view>
          </view>
        </view>

        <!-- Vocabulary -->
        <view class="card">
          <view class="section-header" @tap="toggle('vocabulary')">
            <text class="section-title">📝 重点词汇</text>
            <text class="chevron">{{ expanded.vocabulary ? '▲' : '▽' }}</text>
          </view>
          <view v-if="expanded.vocabulary" class="section-body">
            <view v-for="(item, i) in sentence.analysis.vocabulary" :key="i" class="vocab-item">
              <view class="vocab-row">
                <text class="vocab-word">{{ item.word }}</text>
                <text class="vocab-meaning">{{ item.meaning }}</text>
              </view>
              <text v-if="item.example" class="vocab-example">{{ item.example }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- No analysis -->
      <view v-else class="card no-analysis">
        <text class="no-analysis-text">尚未分析此句子</text>
        <text class="no-analysis-sub">点击下方"重新分析"按钮开始</text>
      </view>

      <!-- Re-analysis error -->
      <view v-if="analysisError" class="card error-card">
        <text class="error-text">{{ analysisError }}</text>
        <text class="error-close" @tap="analysisError = ''">关闭</text>
      </view>

      <!-- Re-analyzing -->
      <view v-if="reAnalyzing" class="card loading-card">
        <text class="loading-text">正在重新分析...</text>
      </view>

      <!-- Action buttons -->
      <view class="action-bar">
        <button class="action-btn" :disabled="reAnalyzing" @tap="reAnalyze">
          {{ reAnalyzing ? '分析中...' : '重新分析' }}
        </button>
        <button class="action-btn" @tap="copyContent">
          {{ copied ? '已复制 ✓' : '复制' }}
        </button>
        <button class="action-btn" @tap="exportSentence">导出</button>
        <button class="action-btn action-danger" @tap="showDeleteConfirm = true">删除</button>
      </view>
    </template>

    <!-- Delete confirm -->
    <view v-if="showDeleteConfirm" class="modal-overlay" @tap.self="showDeleteConfirm = false">
      <view class="modal">
        <text class="modal-title">确认删除</text>
        <text class="modal-desc">确定要删除这个句子吗？此操作无法撤销。</text>
        <view class="modal-btns">
          <button class="btn-outline flex1" @tap="showDeleteConfirm = false">取消</button>
          <button class="btn-danger flex1" @tap="handleDelete">确认删除</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, watch, onMounted, reactive } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { useSentencesStore } from '../../stores/index.js'
import { analyzeSentence } from '../../api/analyze.js'
import { formatSentenceMarkdown, downloadMarkdown } from '../../utils/export.js'

const sentencesStore = useSentencesStore()
const showDeleteConfirm = ref(false)
const reAnalyzing = ref(false)
const analysisError = ref('')
const copied = ref(false)
const tags = ref([])
const newTag = ref('')
const pageId = ref('')

const expanded = reactive({ structure: true, grammar: true, vocabulary: false })

function toggle(section) {
  expanded[section] = !expanded[section]
}

// UniApp 通过 onLoad 接收页面参数
onLoad(async (options) => {
  pageId.value = options?.id || ''
  if (sentencesStore.sentences.length === 0) {
    await sentencesStore.loadSentences()
  }
  if (sentence.value) {
    tags.value = [...sentence.value.tags]
  }
})

const sentence = computed(() => {
  return sentencesStore.getSentenceById(pageId.value)
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

function addTag() {
  const tag = newTag.value.trim()
  if (!tag || tags.value.includes(tag)) {
    newTag.value = ''
    return
  }
  tags.value = [...tags.value, tag]
  newTag.value = ''
}

function removeTag(index) {
  const copy = [...tags.value]
  copy.splice(index, 1)
  tags.value = copy
}

async function saveTags() {
  if (!sentence.value) return
  await sentencesStore.updateTags(sentence.value.id, [...tags.value])
  uni.showToast({ title: '标签已保存', icon: 'success' })
}

async function reAnalyze() {
  if (!sentence.value) return
  reAnalyzing.value = true
  analysisError.value = ''
  try {
    const analysis = await analyzeSentence(sentence.value.content)
    await sentencesStore.updateAnalysis(sentence.value.id, analysis)
    expanded.structure = true
    expanded.grammar = true
    uni.showToast({ title: '分析完成', icon: 'success' })
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
    a.structure?.forEach((s) => { text += `[${s.type}] ${s.text} — ${s.translation}\n` })
    text += `\n【语法点】\n`
    a.grammar?.forEach((g) => { text += `${g.point}: ${g.explanation}\n` })
    text += `\n【重点词汇】\n`
    a.vocabulary?.forEach((v) => { text += `${v.word}: ${v.meaning}\n` })
    if (a.translationNote) text += `\n【翻译思路】\n${a.translationNote}\n`
  }
  uni.setClipboardData({
    data: text,
    success: () => {
      copied.value = true
      setTimeout(() => (copied.value = false), 2000)
    },
  })
}

function exportSentence() {
  if (!sentence.value) return
  const markdown = formatSentenceMarkdown(sentence.value)
  downloadMarkdown(markdown, 'sentence-note')
}

async function handleDelete() {
  if (!sentence.value) return
  await sentencesStore.removeSentence(sentence.value.id)
  showDeleteConfirm.value = false
  uni.navigateBack()
}

function goBack() {
  uni.navigateBack()
}
</script>

<style scoped>
.container {
  padding: 24rpx 32rpx 160rpx;
}

.empty-card {
  text-align: center;
  padding: 80rpx 32rpx;
}

.empty-icon {
  display: block;
  font-size: 80rpx;
  margin-bottom: 24rpx;
}

.empty-text {
  display: block;
  font-size: 28rpx;
  color: #6b7280;
  margin-bottom: 32rpx;
}

.card-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16rpx;
}

.card-label {
  display: block;
  font-size: 20rpx;
  text-transform: uppercase;
  color: #9ca3af;
  font-weight: 500;
  letter-spacing: 1rpx;
  margin-bottom: 16rpx;
}

.source-badge {
  font-size: 20rpx;
  color: #9ca3af;
}

.content-text {
  display: block;
  font-size: 32rpx;
  color: #1f2937;
  line-height: 1.7;
  margin-bottom: 12rpx;
}

.date-text {
  display: block;
  font-size: 20rpx;
  color: #9ca3af;
}

.translation-text {
  display: block;
  font-size: 28rpx;
  color: #1f2937;
  line-height: 1.6;
}

.note-wrap {
  margin-top: 24rpx;
  padding-top: 24rpx;
  border-top: 2rpx solid #f3f4f6;
}

.note-label {
  display: block;
  font-size: 22rpx;
  color: #9ca3af;
  margin-bottom: 8rpx;
}

.note-text {
  font-size: 26rpx;
  color: #6b7280;
  line-height: 1.6;
}

.tags-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-bottom: 20rpx;
}

.tag-chip {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 8rpx 20rpx;
  background-color: #dbeafe;
  border-radius: 100rpx;
}

.tag-text {
  font-size: 24rpx;
  color: #1d4ed8;
}

.tag-remove {
  font-size: 24rpx;
  color: #93c5fd;
}

.tag-input-row {
  display: flex;
  gap: 12rpx;
  align-items: center;
}

.tag-input {
  flex: 1;
}

.btn-sm {
  padding: 12rpx 24rpx;
  font-size: 24rpx;
  min-height: 64rpx;
}

.mt16 { margin-top: 16rpx; }

.space-y > view {
  margin-bottom: 24rpx;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 64rpx;
}

.section-title {
  font-size: 28rpx;
  font-weight: 500;
  color: #1f2937;
}

.chevron {
  font-size: 22rpx;
  color: #9ca3af;
}

.section-body {
  margin-top: 24rpx;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.struct-item {
  display: flex;
  align-items: flex-start;
  gap: 16rpx;
  background-color: #eff6ff;
  border-radius: 12rpx;
  padding: 20rpx;
}

.type-badge {
  background-color: #bfdbfe;
  border-radius: 100rpx;
  padding: 4rpx 16rpx;
  flex-shrink: 0;
  margin-top: 4rpx;
}

.type-text {
  font-size: 20rpx;
  color: #1e40af;
  white-space: nowrap;
}

.struct-content {
  flex: 1;
}

.struct-text {
  display: block;
  font-size: 26rpx;
  font-weight: 500;
  color: #1f2937;
  margin-bottom: 4rpx;
}

.struct-trans {
  font-size: 24rpx;
  color: #6b7280;
}

.grammar-item {
  background-color: #f0fdf4;
  border-radius: 12rpx;
  padding: 20rpx;
}

.grammar-point {
  display: block;
  font-size: 26rpx;
  font-weight: 600;
  color: #15803d;
  margin-bottom: 8rpx;
}

.grammar-exp {
  display: block;
  font-size: 24rpx;
  color: #374151;
}

.examples {
  margin-top: 12rpx;
}

.example-text {
  display: block;
  font-size: 22rpx;
  color: #6b7280;
  font-style: italic;
  margin-top: 4rpx;
}

.vocab-item {
  background-color: #faf5ff;
  border-radius: 12rpx;
  padding: 20rpx;
}

.vocab-row {
  display: flex;
  align-items: baseline;
  gap: 16rpx;
  margin-bottom: 8rpx;
}

.vocab-word {
  font-size: 28rpx;
  font-weight: 700;
  color: #7c3aed;
}

.vocab-meaning {
  font-size: 24rpx;
  color: #4b5563;
}

.vocab-example {
  display: block;
  font-size: 22rpx;
  color: #9ca3af;
  font-style: italic;
}

.no-analysis {
  text-align: center;
  padding: 60rpx;
}

.no-analysis-text {
  display: block;
  font-size: 28rpx;
  color: #6b7280;
  margin-bottom: 8rpx;
}

.no-analysis-sub {
  font-size: 22rpx;
  color: #9ca3af;
}

.error-card {
  background-color: #fef2f2;
  border: 2rpx solid #fecaca;
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16rpx;
}

.error-text {
  font-size: 26rpx;
  color: #b91c1c;
  flex: 1;
}

.error-close {
  font-size: 22rpx;
  color: #9ca3af;
  text-decoration: underline;
  margin-left: 16rpx;
}

.loading-card {
  text-align: center;
  padding: 40rpx;
  margin-bottom: 16rpx;
}

.loading-text {
  font-size: 26rpx;
  color: #6b7280;
}

.action-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background-color: #ffffff;
  border-top: 2rpx solid #f3f4f6;
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 16rpx 32rpx;
  padding-bottom: calc(16rpx + env(safe-area-inset-bottom));
}

.action-btn {
  flex: 1;
  padding: 20rpx;
  border-radius: 16rpx;
  font-size: 24rpx;
  font-weight: 500;
  text-align: center;
  background-color: #f3f4f6;
  color: #374151;
  border: none;
}

.action-danger {
  background-color: #fee2e2;
  color: #dc2626;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(0,0,0,0.5);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 100;
  padding: 32rpx;
}

.modal {
  background-color: #ffffff;
  border-radius: 24rpx;
  padding: 48rpx;
  width: 100%;
  max-width: 560rpx;
}

.modal-title {
  display: block;
  font-size: 36rpx;
  font-weight: 700;
  margin-bottom: 16rpx;
}

.modal-desc {
  display: block;
  font-size: 26rpx;
  color: #6b7280;
  margin-bottom: 40rpx;
}

.modal-btns {
  display: flex;
  gap: 16rpx;
}

.flex1 { flex: 1; }
</style>
