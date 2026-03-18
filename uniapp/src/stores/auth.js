import { defineStore } from 'pinia'
import { ref } from 'vue'
import { login, register, logout, tryRestoreSession } from '../repositories/authRepository.js'
import { useSyncStore } from './sync.js'
import { useAiConfigStore } from './aiConfig.js'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const loading = ref(false)
  const error = ref('')
  const isLoggedIn = ref(false)

  async function _postLogin() {
    const aiConfigStore = useAiConfigStore()
    const syncStore = useSyncStore()
    await Promise.allSettled([
      aiConfigStore.fetch(),
      syncStore.pull(),
    ])
  }

  async function restoreSession() {
    loading.value = true
    error.value = ''
    try {
      const restored = await tryRestoreSession()
      if (restored) {
        user.value = restored
        isLoggedIn.value = true
        await _postLogin()
      }
    } catch {
      user.value = null
      isLoggedIn.value = false
    } finally {
      loading.value = false
    }
  }

  async function doLogin(email, password) {
    loading.value = true
    error.value = ''
    try {
      const u = await login(email, password)
      user.value = u
      isLoggedIn.value = true
      await _postLogin()
      return true
    } catch (err) {
      error.value = err.message || '登录失败，请重试'
      return false
    } finally {
      loading.value = false
    }
  }

  async function doRegister(email, password, displayName) {
    loading.value = true
    error.value = ''
    try {
      const u = await register(email, password, displayName)
      user.value = u
      isLoggedIn.value = true
      await _postLogin()
      return true
    } catch (err) {
      error.value = err.message || '注册失败，请重试'
      return false
    } finally {
      loading.value = false
    }
  }

  async function doLogout() {
    loading.value = true
    try {
      await logout()
    } finally {
      user.value = null
      isLoggedIn.value = false
      loading.value = false
    }
  }

  return { user, loading, error, isLoggedIn, restoreSession, doLogin, doRegister, doLogout }
})
