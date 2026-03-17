<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Top Nav Bar -->
    <nav class="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div class="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
        <router-link to="/" class="font-bold text-primary-600 text-lg">
          SentenceNB
        </router-link>
        <div class="flex items-center gap-1">
          <router-link
            to="/text-input"
            class="px-3 py-1.5 rounded-lg text-sm text-gray-500 hover:text-primary-600 hover:bg-gray-50 transition-colors"
            active-class="text-primary-600 bg-blue-50"
          >
            文字输入
          </router-link>
          <router-link
            to="/photo-input"
            class="px-3 py-1.5 rounded-lg text-sm text-gray-500 hover:text-primary-600 hover:bg-gray-50 transition-colors"
            active-class="text-primary-600 bg-blue-50"
          >
            拍照输入
          </router-link>
          <router-link
            to="/collection"
            class="px-3 py-1.5 rounded-lg text-sm text-gray-500 hover:text-primary-600 hover:bg-gray-50 transition-colors"
            active-class="text-primary-600 bg-blue-50"
          >
            收藏
          </router-link>
          <span class="w-px h-4 bg-gray-200 mx-1"></span>
          <router-link
            to="/settings"
            class="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-gray-50 transition-colors"
            active-class="text-primary-600 bg-blue-50"
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
    <main class="max-w-3xl mx-auto px-4 py-6">
      <router-view />
    </main>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

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

const breadcrumbs = computed(() => {
  const name = route.name
  if (!name || name === 'Home') return []

  const crumbs = [{ label: '首页', path: '/' }]

  // Insert parent if exists
  const parent = ROUTE_PARENTS[name]
  if (parent) {
    crumbs.push({ label: ROUTE_LABELS[parent.name] || parent.name, path: parent.path })
  }

  crumbs.push({ label: ROUTE_LABELS[name] || name, path: route.path })

  return crumbs
})
</script>
