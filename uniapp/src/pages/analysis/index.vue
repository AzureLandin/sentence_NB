<template>
  <view class="container">
    <view v-if="!analysis" class="card empty-card">
      <text class="empty-text">暂无分析结果</text>
    </view>

    <template v-else>
      <!-- Original sentence -->
      <view class="card">
        <text class="section-label">原句</text>
        <text class="content-text">{{ sentence }}</text>
      </view>

      <!-- Structure -->
      <view class="card analysis-card struct-card">
        <text class="analysis-title">🔍 句子结构拆分</text>
        <view v-for="(part, i) in analysis.structure" :key="i" class="struct-item">
          <view class="type-badge">
            <text class="type-text">{{ part.type }}</text>
          </view>
          <view class="struct-content">
            <text class="struct-text">{{ part.text }}</text>
            <text class="struct-trans">{{ part.translation }}</text>
          </view>
        </view>
      </view>

      <!-- Grammar -->
      <view class="card analysis-card grammar-card">
        <text class="analysis-title">📖 语法点标注</text>
        <view v-for="(item, i) in analysis.grammar" :key="i" class="grammar-item">
          <text class="grammar-point">{{ item.point }}</text>
          <text class="grammar-exp">{{ item.explanation }}</text>
          <view v-if="item.examples?.length" class="examples">
            <text v-for="(ex, j) in item.examples" :key="j" class="example-text">{{ ex }}</text>
          </view>
        </view>
      </view>

      <!-- Vocabulary -->
      <view class="card analysis-card vocab-card">
        <text class="analysis-title">📝 重点词汇提取</text>
        <view v-for="(item, i) in analysis.vocabulary" :key="i" class="vocab-item">
          <view class="vocab-row">
            <text class="vocab-word">{{ item.word }}</text>
            <text class="vocab-meaning">{{ item.meaning }}</text>
          </view>
          <text v-if="item.example" class="vocab-example">{{ item.example }}</text>
        </view>
      </view>

      <!-- Translation -->
      <view class="card analysis-card trans-card">
        <text class="analysis-title">🌐 全文翻译</text>
        <view class="trans-content">
          <text class="trans-text">{{ analysis.translation }}</text>
        </view>
        <view v-if="analysis.translationNote" class="note-content">
          <text class="note-label">翻译思路</text>
          <text class="note-text">{{ analysis.translationNote }}</text>
        </view>
      </view>
    </template>
  </view>
</template>

<script setup>
defineProps({
  sentence: { type: String, default: '' },
  analysis: { type: Object, default: null },
})
</script>

<style scoped>
.container {
  padding: 24rpx 32rpx;
}

.empty-card {
  text-align: center;
  padding: 80rpx;
}

.empty-text {
  font-size: 28rpx;
  color: #9ca3af;
}

.section-label {
  display: block;
  font-size: 20rpx;
  color: #9ca3af;
  text-transform: uppercase;
  font-weight: 500;
  margin-bottom: 12rpx;
}

.content-text {
  display: block;
  font-size: 32rpx;
  color: #1f2937;
  line-height: 1.7;
}

.analysis-card {
  margin-bottom: 24rpx;
}

.struct-card { background: linear-gradient(to bottom right, #ffffff, #eff6ff); border: 2rpx solid #dbeafe; }
.grammar-card { background: linear-gradient(to bottom right, #ffffff, #f0fdf4); border: 2rpx solid #bbf7d0; }
.vocab-card { background: linear-gradient(to bottom right, #ffffff, #faf5ff); border: 2rpx solid #e9d5ff; }
.trans-card { background: linear-gradient(to bottom right, #ffffff, #fff7ed); border: 2rpx solid #fed7aa; }

.analysis-title {
  display: block;
  font-size: 32rpx;
  font-weight: 700;
  margin-bottom: 24rpx;
}

.struct-item {
  display: flex;
  align-items: flex-start;
  gap: 16rpx;
  background-color: rgba(255,255,255,0.6);
  border-radius: 12rpx;
  padding: 20rpx;
  margin-bottom: 12rpx;
}

.type-badge {
  background-color: #bfdbfe;
  border-radius: 100rpx;
  padding: 4rpx 16rpx;
  flex-shrink: 0;
}

.type-text {
  font-size: 20rpx;
  color: #1e40af;
  white-space: nowrap;
}

.struct-content { flex: 1; }

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
  background-color: rgba(255,255,255,0.6);
  border-radius: 12rpx;
  padding: 20rpx;
  margin-bottom: 12rpx;
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

.examples { margin-top: 12rpx; }

.example-text {
  display: block;
  font-size: 22rpx;
  color: #6b7280;
  font-style: italic;
  margin-top: 4rpx;
}

.vocab-item {
  background-color: rgba(255,255,255,0.6);
  border-radius: 12rpx;
  padding: 20rpx;
  margin-bottom: 12rpx;
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
  font-size: 22rpx;
  color: #9ca3af;
  font-style: italic;
}

.trans-content {
  background-color: rgba(255,255,255,0.6);
  border-radius: 12rpx;
  padding: 20rpx;
  margin-bottom: 12rpx;
}

.trans-text {
  font-size: 28rpx;
  color: #1f2937;
  line-height: 1.6;
}

.note-content {
  background-color: rgba(255,255,255,0.6);
  border-radius: 12rpx;
  padding: 20rpx;
}

.note-label {
  display: block;
  font-size: 22rpx;
  font-weight: 500;
  color: #c2410c;
  margin-bottom: 8rpx;
}

.note-text {
  font-size: 24rpx;
  color: #6b7280;
  line-height: 1.6;
}
</style>
