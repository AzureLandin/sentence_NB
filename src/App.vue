<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Top Nav Bar -->
    <nav class="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div class="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
        <router-link to="/" class="font-bold text-primary-600 text-base sm:text-lg whitespace-nowrap">
          SentenceNB
        </router-link>
        <!-- Desktop nav icons (hidden on mobile) -->
        <div class="hidden sm:flex items-center gap-1">
          <router-link
            to="/text-input"
            class="p-2 rounded-lg text-gray-500 hover:text-primary-600 hover:bg-gray-50 transition-colors"
            active-class="text-primary-600 bg-blue-50"
            title="文字输入"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </router-link>
          <router-link
            to="/photo-input"
            class="p-2 rounded-lg text-gray-500 hover:text-primary-600 hover:bg-gray-50 transition-colors"
            active-class="text-primary-600 bg-blue-50"
            title="拍照输入"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </router-link>
          <router-link
            to="/collection"
            class="p-2 rounded-lg text-gray-500 hover:text-primary-600 hover:bg-gray-50 transition-colors"
            active-class="text-primary-600 bg-blue-50"
            title="收藏"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
          </router-link>
          <!-- 同步状态指示 -->
          <span v-if="authStore.isLoggedIn" class="flex items-center px-1" :title="syncStatusTitle">
            <span v-if="syncStore.status === 'syncing'" class="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span>
            <span v-else-if="syncStore.status === 'error'" class="w-2 h-2 rounded-full bg-red-400"></span>
            <span v-else-if="syncStore.status === 'offline'" class="w-2 h-2 rounded-full bg-gray-400"></span>
            <span v-else class="w-2 h-2 rounded-full bg-green-400"></span>
          </span>
          <span class="w-px h-4 bg-gray-200 mx-1"></span>
          <router-link
            v-if="!authStore.isLoggedIn"
            to="/login"
            class="p-2 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-gray-50 transition-colors text-sm"
            title="登录"
          >登录</router-link>
          <router-link
            to="/settings"
            class="p-2 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-gray-50 transition-colors"
            active-class="text-primary-600 bg-blue-50"
            title="设置"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </router-link>
        </div>
      </div>

      <!-- Breadcrumb (hidden on home) -->
      <div v-if="breadcrumbs.length > 0" class="border-t border-gray-100 bg-white">
        <div class="max-w-3xl mx-auto px-4 h-8 flex items-center gap-1 text-xs text-gray-400">
          <template v-for="(crumb, index) in breadcrumbs" :key="crumb.path">
            <span v-if="index > 0" class="mx-1 text-gray-300">/</span>
            <router-link
              v-if="index < breadcrumbs.length - 1"
              :to="crumb.path"
              class="hover:text-primary-600 transition-colors"
            >
              {{ crumb.label }}
            </router-link>
            <span v-else class="text-gray-600 font-medium">
              {{ crumb.label }}
            </span>
          </template>
        </div>
      </div>
    </nav>

    <!-- Main Content -->
    <main class="max-w-3xl mx-auto px-4 py-6 pb-[calc(5rem+env(safe-area-inset-bottom))] sm:pb-6">
      <router-view />
    </main>

    <!-- Bottom Nav Bar (mobile only) -->
    <nav
      class="sm:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40"
      style="padding-bottom: env(safe-area-inset-bottom)"
    >
      <div class="flex items-center justify-around h-14">
        <router-link
          to="/text-input"
          class="flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors"
          :class="isActive('TextInput') ? 'text-primary-600' : 'text-gray-400'"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          <span class="text-[10px] leading-tight">文字</span>
        </router-link>
        <router-link
          to="/photo-input"
          class="flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors"
          :class="isActive('PhotoInput') ? 'text-primary-600' : 'text-gray-400'"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span class="text-[10px] leading-tight">拍照</span>
        </router-link>
        <router-link
          to="/collection"
          class="flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors"
          :class="isActive('Collection') || isActive('SentenceDetail') ? 'text-primary-600' : 'text-gray-400'"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
          <span class="text-[10px] leading-tight">收藏</span>
        </router-link>
        <router-link
          to="/settings"
          class="flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors"
          :class="isActive('Settings') ? 'text-primary-600' : 'text-gray-400'"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span class="text-[10px] leading-tight">设置</span>
        </router-link>
      </div>
    </nav>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from './stores/auth.js'
import { useSyncStore } from './stores/sync.js'

const route = useRoute()
const authStore = useAuthStore()
const syncStore = useSyncStore()

function isActive(name) {
  return route.name === name
}

const ROUTE_LABELS = {
  Home: '首页',
  TextInput: '文字输入',
  PhotoInput: '拍照输入',
  Collection: '收藏',
  SentenceDetail: '句子详情',
  Settings: '设置',
}

const ROUTE_PARENTS = {
  SentenceDetail: { name: 'Collection', path: '/collection' },
}

const syncStatusTitle = computed(() => {
  const s = syncStore.status
  if (s === 'syncing') return '同步中…'
  if (s === 'error') return '同步失败'
  if (s === 'offline') return '离线模式'
  return '已同步'
})

const breadcrumbs = computed(() => {
  const name = route.name
  if (!name || name === 'Home') return []

  const crumbs = [{ label: '首页', path: '/' }]

  const parent = ROUTE_PARENTS[name]
  if (parent) {
    crumbs.push({ label: ROUTE_LABELS[parent.name] || parent.name, path: parent.path })
  }

  crumbs.push({ label: ROUTE_LABELS[name] || name, path: route.path })

  return crumbs
})

// 网络状态监听
function handleOnline() { syncStore.onNetworkRestore() }
function handleOffline() { syncStore.status = 'offline' }

onMounted(async () => {
  window.addEventListener('online', handleOnline)
  window.addEventListener('offline', handleOffline)
  // 尝试恢复登录态
  await authStore.restoreSession()
})

onUnmounted(() => {
  window.removeEventListener('online', handleOnline)
  window.removeEventListener('offline', handleOffline)
  syncStore.stopPeriodicPull()
})
</script>
