<script setup>
import { onLaunch } from '@dcloudio/uni-app'
import { useAuthStore } from './stores/auth.js'

onLaunch(async () => {
  // 尝试恢复登录态（Pinia 已由 main.js 初始化）
  const authStore = useAuthStore()
  await authStore.restoreSession()
})
</script>

<style>
/* UniApp 全局样式 */
page {
  background-color: #f9fafb;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

/* 通用按钮样式 */
.btn-primary {
  background-color: #3b82f6;
  color: #ffffff;
  border-radius: 12rpx;
  padding: 20rpx 32rpx;
  font-weight: 600;
  font-size: 28rpx;
  text-align: center;
  border: none;
}

.btn-outline {
  background-color: #ffffff;
  color: #374151;
  border: 2rpx solid #d1d5db;
  border-radius: 12rpx;
  padding: 20rpx 32rpx;
  font-weight: 500;
  font-size: 28rpx;
  text-align: center;
}

.btn-danger {
  background-color: #fee2e2;
  color: #dc2626;
  border-radius: 12rpx;
  padding: 20rpx 32rpx;
  font-weight: 500;
  font-size: 28rpx;
  text-align: center;
  border: none;
}

.btn-accent {
  background-color: #f97316;
  color: #ffffff;
  border-radius: 12rpx;
  padding: 20rpx 32rpx;
  font-weight: 600;
  font-size: 28rpx;
  text-align: center;
  border: none;
}

/* 卡片 */
.card {
  background-color: #ffffff;
  border-radius: 16rpx;
  padding: 32rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.06);
  border: 2rpx solid #f3f4f6;
  margin-bottom: 24rpx;
}

/* 输入框 */
.input-field {
  width: 100%;
  border: 2rpx solid #d1d5db;
  border-radius: 12rpx;
  padding: 20rpx 24rpx;
  font-size: 28rpx;
  color: #111827;
  background-color: #ffffff;
  box-sizing: border-box;
}

.input-field:focus {
  border-color: #3b82f6;
  outline: none;
}

/* 错误提示 */
.alert-error {
  background-color: #fee2e2;
  color: #b91c1c;
  border-radius: 12rpx;
  padding: 20rpx 24rpx;
}
</style>
