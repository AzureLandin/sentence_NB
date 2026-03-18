<template>
  <view class="container">
    <!-- Header -->
    <view class="header">
      <text class="header-title">英语长难句笔记本</text>
      <text class="header-sub">收藏、分析、掌握英语长难句</text>
    </view>

    <!-- Feature Cards -->
    <view class="grid">
      <view class="feature-card" @tap="goTo('/pages/input/text')">
        <view class="icon-wrap icon-blue">
          <text class="icon">📝</text>
        </view>
        <text class="feature-title">文本输入</text>
        <text class="feature-desc">输入或粘贴句子进行分析</text>
      </view>

      <view class="feature-card" @tap="goTo('/pages/input/photo')">
        <view class="icon-wrap icon-purple">
          <text class="icon">📷</text>
        </view>
        <text class="feature-title">拍照输入</text>
        <text class="feature-desc">拍照识别句子</text>
      </view>

      <view class="feature-card" @tap="goTo('/pages/collection/index')">
        <view class="icon-wrap icon-green">
          <text class="icon">📚</text>
        </view>
        <text class="feature-title">我的收藏</text>
        <text class="feature-desc">查看所有收藏的句子</text>
      </view>

      <view class="feature-card" @tap="goTo('/pages/settings/index')">
        <view class="icon-wrap icon-gray">
          <text class="icon">⚙️</text>
        </view>
        <text class="feature-title">设置</text>
        <text class="feature-desc">API配置与数据管理</text>
      </view>
    </view>

    <!-- Quick Stats -->
    <view class="card stats-card">
      <view class="stat">
        <text class="stat-num stat-blue">{{ sentenceCount }}</text>
        <text class="stat-label">收藏句子</text>
      </view>
      <view class="divider-v"></view>
      <view class="stat">
        <text class="stat-num stat-green">{{ analyzedCount }}</text>
        <text class="stat-label">已分析</text>
      </view>
      <view class="divider-v"></view>
      <view class="stat">
        <text class="stat-num stat-orange">{{ tagCount }}</text>
        <text class="stat-label">标签</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useSentencesStore } from '../../stores/index.js'

const sentencesStore = useSentencesStore()

onMounted(() => {
  sentencesStore.loadSentences()
})

const sentenceCount = computed(() => sentencesStore.sentences.length)
const analyzedCount = computed(() =>
  sentencesStore.sentences.filter((s) => s.analysis).length
)
const tagCount = computed(() => sentencesStore.allTags.length)

// tabBar 页面（在 pages.json 的 tabBar.list 中定义的）必须用 switchTab
const TAB_PAGES = ['/pages/input/text', '/pages/input/photo', '/pages/collection/index', '/pages/settings/index']

function goTo(path) {
  if (TAB_PAGES.includes(path)) {
    uni.switchTab({ url: path })
  } else {
    uni.navigateTo({ url: path })
  }
}
</script>

<style scoped>
.container {
  padding: 32rpx;
  min-height: 100vh;
}

.header {
  text-align: center;
  margin-bottom: 48rpx;
}

.header-title {
  display: block;
  font-size: 40rpx;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 8rpx;
}

.header-sub {
  display: block;
  font-size: 26rpx;
  color: #6b7280;
}

.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24rpx;
  margin-bottom: 32rpx;
}

.feature-card {
  background: #ffffff;
  border-radius: 20rpx;
  padding: 32rpx 24rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.06);
  border: 2rpx solid #f3f4f6;
}

.icon-wrap {
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20rpx;
}

.icon-blue { background-color: #dbeafe; }
.icon-purple { background-color: #ede9fe; }
.icon-green { background-color: #dcfce7; }
.icon-gray { background-color: #f3f4f6; }

.icon {
  font-size: 44rpx;
}

.feature-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 8rpx;
}

.feature-desc {
  font-size: 22rpx;
  color: #9ca3af;
}

.stats-card {
  display: flex;
  align-items: center;
  justify-content: space-around;
  padding: 32rpx;
}

.stat {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-num {
  font-size: 48rpx;
  font-weight: 700;
  margin-bottom: 4rpx;
}

.stat-blue { color: #3b82f6; }
.stat-green { color: #16a34a; }
.stat-orange { color: #f97316; }

.stat-label {
  font-size: 22rpx;
  color: #9ca3af;
}

.divider-v {
  width: 2rpx;
  height: 60rpx;
  background-color: #e5e7eb;
}
</style>
