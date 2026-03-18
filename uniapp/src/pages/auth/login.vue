<template>
  <view class="container">
    <view class="login-box">
      <text class="title">英语句子笔记</text>
      <text class="subtitle">登录以同步你的句子收藏</text>

      <!-- Tab 切换 -->
      <view class="tab-row">
        <view
          class="tab-btn"
          :class="mode === 'login' ? 'tab-active' : 'tab-inactive'"
          @tap="mode = 'login'"
        >
          <text>登录</text>
        </view>
        <view
          class="tab-btn"
          :class="mode === 'register' ? 'tab-active' : 'tab-inactive'"
          @tap="mode = 'register'"
        >
          <text>注册</text>
        </view>
      </view>

      <view class="form">
        <view v-if="mode === 'register'" class="field">
          <text class="label">昵称</text>
          <input
            v-model="displayName"
            type="text"
            placeholder="可选"
            class="input-field"
          />
        </view>

        <view class="field">
          <text class="label">邮箱</text>
          <input
            v-model="email"
            type="email"
            placeholder="your@email.com"
            class="input-field"
          />
        </view>

        <view class="field">
          <text class="label">密码</text>
          <input
            v-model="password"
            password
            :placeholder="mode === 'register' ? '至少6位' : ''"
            class="input-field"
          />
        </view>

        <view v-if="error" class="alert-error">
          <text>{{ error }}</text>
        </view>

        <button
          class="btn-primary submit-btn"
          :disabled="authStore.loading"
          @tap="handleSubmit"
        >
          {{ authStore.loading ? '请稍候…' : (mode === 'login' ? '登录' : '注册') }}
        </button>
      </view>

      <view class="skip-row">
        <text class="skip-btn" @tap="skipLogin">暂不登录，继续本地使用</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { useAuthStore } from '../../stores/auth.js'

const authStore = useAuthStore()

const mode = ref('login')
const email = ref('')
const password = ref('')
const displayName = ref('')
const error = ref('')

async function handleSubmit() {
  error.value = ''
  let ok = false

  if (mode.value === 'login') {
    ok = await authStore.doLogin(email.value, password.value)
  } else {
    ok = await authStore.doRegister(email.value, password.value, displayName.value)
  }

  if (ok) {
    // 登录成功后返回首页
    uni.switchTab({ url: '/pages/input/text' })
  } else {
    error.value = authStore.error
  }
}

function skipLogin() {
  uni.navigateBack()
}
</script>

<style scoped>
.container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f9fafb;
  padding: 32rpx;
}

.login-box {
  width: 100%;
  max-width: 600rpx;
}

.title {
  display: block;
  font-size: 44rpx;
  font-weight: 700;
  text-align: center;
  color: #111827;
  margin-bottom: 16rpx;
}

.subtitle {
  display: block;
  text-align: center;
  color: #6b7280;
  font-size: 26rpx;
  margin-bottom: 48rpx;
}

.tab-row {
  display: flex;
  border-radius: 12rpx;
  overflow: hidden;
  border: 2rpx solid #e5e7eb;
  margin-bottom: 40rpx;
}

.tab-btn {
  flex: 1;
  padding: 20rpx;
  text-align: center;
  font-size: 28rpx;
  font-weight: 500;
}

.tab-active {
  background-color: #3b82f6;
  color: #ffffff;
}

.tab-inactive {
  background-color: #ffffff;
  color: #6b7280;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.label {
  font-size: 26rpx;
  font-weight: 500;
  color: #374151;
}

.submit-btn {
  margin-top: 8rpx;
}

.skip-row {
  text-align: center;
  margin-top: 40rpx;
}

.skip-btn {
  font-size: 26rpx;
  color: #6b7280;
  text-decoration: underline;
}
</style>
