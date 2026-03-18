<template>
  <view class="container">
    <!-- Search & Filter -->
    <view class="card filter-card">
      <input
        v-model="sentencesStore.searchQuery"
        placeholder="搜索句子内容..."
        class="input-field"
      />
      <scroll-view scroll-x class="tag-scroll">
        <view class="tag-row">
          <view
            class="tag-btn"
            :class="!sentencesStore.filterTag ? 'tag-active' : 'tag-normal'"
            @tap="sentencesStore.filterTag = ''"
          >
            <text>全部</text>
          </view>
          <view
            v-for="tag in sentencesStore.allTags"
            :key="tag"
            class="tag-btn"
            :class="sentencesStore.filterTag === tag ? 'tag-active' : 'tag-normal'"
            @tap="sentencesStore.filterTag = tag"
          >
            <text>{{ tag }}</text>
          </view>
        </view>
      </scroll-view>

      <view class="filter-footer">
        <view v-if="hasActiveFilter" class="clear-filter" @tap="clearAllFilters">
          <text class="clear-filter-text">✕ 清除筛选</text>
        </view>
        <view class="sort-btn" @tap="toggleSort">
          <text class="sort-text">{{ sentencesStore.sortOrder === 'desc' ? '最新优先' : '最早优先' }}</text>
        </view>
      </view>
    </view>

    <!-- Loading -->
    <view v-if="sentencesStore.loading" class="center-wrap">
      <text class="loading-text">加载中...</text>
    </view>

    <!-- Empty: no sentences -->
    <view v-else-if="sentencesStore.sentences.length === 0" class="card empty-card">
      <text class="empty-icon">📚</text>
      <text class="empty-title">还没有收藏的句子</text>
      <text class="empty-desc">从文字输入或拍照识别开始，添加第一个句子</text>
      <view class="empty-btns">
        <button class="btn-primary" @tap="goToText">✍️ 文字输入</button>
        <button class="btn-outline" @tap="goToPhoto">📷 拍照识别</button>
      </view>
    </view>

    <!-- Empty: filter no results -->
    <view v-else-if="sentencesStore.filteredSentences.length === 0" class="card empty-card">
      <text class="empty-icon">🔍</text>
      <text class="empty-title">没有匹配的句子</text>
      <button class="btn-outline" @tap="clearAllFilters">清除筛选条件</button>
    </view>

    <!-- Sentence list -->
    <view v-else>
      <view
        v-for="sentence in sentencesStore.filteredSentences"
        :key="sentence.id"
        class="card sentence-card"
        @tap="goToDetail(sentence.id)"
      >
        <text class="sentence-content">{{ truncate(sentence.content) }}</text>
        <view class="sentence-footer">
          <view class="tags-row">
            <view v-for="tag in sentence.tags" :key="tag" class="tag-chip">
              <text class="tag-chip-text">{{ tag }}</text>
            </view>
            <view v-if="sentence.analysis" class="tag-chip tag-analyzed">
              <text class="tag-chip-text">已分析</text>
            </view>
          </view>
          <text class="sentence-date">{{ formatDate(sentence.createdAt) }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useSentencesStore } from '../../stores/index.js'

const sentencesStore = useSentencesStore()

onMounted(() => {
  if (sentencesStore.sentences.length === 0) {
    sentencesStore.loadSentences()
  }
})

const hasActiveFilter = computed(() => {
  return sentencesStore.searchQuery || sentencesStore.filterTag
})

function clearAllFilters() {
  sentencesStore.searchQuery = ''
  sentencesStore.filterTag = ''
}

function toggleSort() {
  sentencesStore.sortOrder = sentencesStore.sortOrder === 'desc' ? 'asc' : 'desc'
}

function truncate(content) {
  return content.length > 80 ? content.slice(0, 80) + '...' : content
}

function formatDate(ts) {
  return new Date(ts).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

function goToDetail(id) {
  uni.navigateTo({ url: `/pages/collection/detail?id=${id}` })
}

function goToText() {
  uni.switchTab({ url: '/pages/input/text' })
}

function goToPhoto() {
  uni.switchTab({ url: '/pages/input/photo' })
}
</script>

<style scoped>
.container {
  padding: 24rpx 32rpx;
}

.filter-card {
  margin-bottom: 24rpx;
}

.tag-scroll {
  margin-top: 20rpx;
  white-space: nowrap;
}

.tag-row {
  display: flex;
  gap: 12rpx;
  padding-bottom: 4rpx;
}

.tag-btn {
  padding: 10rpx 24rpx;
  border-radius: 100rpx;
  white-space: nowrap;
  font-size: 24rpx;
}

.tag-active {
  background-color: #3b82f6;
  color: #ffffff;
}

.tag-normal {
  background-color: #f3f4f6;
  color: #6b7280;
}

.filter-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 16rpx;
}

.clear-filter {
  padding: 8rpx 16rpx;
  background-color: #eff6ff;
  border-radius: 100rpx;
}

.clear-filter-text {
  font-size: 22rpx;
  color: #3b82f6;
}

.sort-btn {
  padding: 8rpx 16rpx;
}

.sort-text {
  font-size: 22rpx;
  color: #9ca3af;
}

.center-wrap {
  text-align: center;
  padding: 80rpx 0;
}

.loading-text {
  font-size: 26rpx;
  color: #9ca3af;
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

.empty-title {
  display: block;
  font-size: 32rpx;
  font-weight: 600;
  color: #374151;
  margin-bottom: 16rpx;
}

.empty-desc {
  display: block;
  font-size: 26rpx;
  color: #9ca3af;
  margin-bottom: 40rpx;
}

.empty-btns {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  align-items: center;
}

.sentence-card {
  margin-bottom: 16rpx;
  padding: 28rpx;
}

.sentence-content {
  display: block;
  font-size: 28rpx;
  font-weight: 500;
  color: #1f2937;
  line-height: 1.6;
  margin-bottom: 16rpx;
}

.sentence-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.tags-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8rpx;
  flex: 1;
}

.tag-chip {
  padding: 4rpx 16rpx;
  border-radius: 100rpx;
  background-color: #dbeafe;
}

.tag-analyzed {
  background-color: #dcfce7;
}

.tag-chip-text {
  font-size: 20rpx;
  color: #1d4ed8;
}

.tag-analyzed .tag-chip-text {
  color: #15803d;
}

.sentence-date {
  font-size: 20rpx;
  color: #9ca3af;
  white-space: nowrap;
  margin-left: 16rpx;
}
</style>
