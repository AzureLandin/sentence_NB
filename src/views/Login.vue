<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 px-4">
    <div class="w-full max-w-sm">
      <h1 class="text-2xl font-bold text-center text-gray-900 mb-2">英语句子笔记</h1>
      <p class="text-center text-gray-500 text-sm mb-8">登录以同步你的句子收藏</p>

      <!-- Tab 切换 -->
      <div class="flex rounded-lg overflow-hidden border border-gray-200 mb-6">
        <button
          class="flex-1 py-2 text-sm font-medium transition-colors"
          :class="mode === 'login' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600'"
          @click="mode = 'login'"
        >登录</button>
        <button
          class="flex-1 py-2 text-sm font-medium transition-colors"
          :class="mode === 'register' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600'"
          @click="mode = 'register'"
        >注册</button>
      </div>

      <form class="space-y-4" @submit.prevent="handleSubmit">
        <div v-if="mode === 'register'">
          <label class="block text-sm font-medium text-gray-700 mb-1">昵称</label>
          <input
            v-model="displayName"
            type="text"
            placeholder="可选"
            class="input-field w-full"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">邮箱</label>
          <input
            v-model="email"
            type="email"
            required
            placeholder="your@email.com"
            class="input-field w-full"
            autocomplete="email"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">密码</label>
          <input
            v-model="password"
            type="password"
            required
            :placeholder="mode === 'register' ? '至少6位' : ''"
            class="input-field w-full"
            autocomplete="current-password"
          />
        </div>

        <div v-if="error" class="alert-error text-sm">{{ error }}</div>

        <button
          type="submit"
          class="btn-primary w-full"
          :disabled="authStore.loading"
        >
          {{ authStore.loading ? '请稍候…' : (mode === 'login' ? '登录' : '注册') }}
        </button>
      </form>

      <p class="text-center text-sm text-gray-500 mt-6">
        <button class="underline" @click="skipLogin">暂不登录，继续本地使用</button>
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth.js'

const router = useRouter()
const route = useRoute()
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
    const redirect = route.query.redirect || '/'
    router.replace(redirect)
  } else {
    error.value = authStore.error
  }
}

function skipLogin() {
  router.replace('/')
}
</script>
