<template>
  <view class="analysis-card" :class="bgClass">
    <view class="card-header">
      <text class="icon">{{ icon }}</text>
      <text class="title">{{ title }}</text>
    </view>
    <view class="card-body">
      <slot />
    </view>
  </view>
</template>

<script setup>
defineProps({
  title: { type: String, required: true },
  icon: { type: String, default: '' },
  bgClass: { type: String, default: '' },
})
</script>

<style scoped>
.analysis-card {
  border-radius: 20rpx;
  padding: 32rpx;
  box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.06);
  margin-bottom: 24rpx;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 24rpx;
}

.icon {
  font-size: 40rpx;
}

.title {
  font-size: 32rpx;
  font-weight: 700;
  color: #1f2937;
}

.card-body {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}
</style>
