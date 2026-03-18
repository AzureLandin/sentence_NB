<template>
  <div class="max-w-2xl mx-auto">
    <!-- Header -->
    <div class="flex items-center gap-3 mb-4">
      <router-link to="/" class="text-gray-400 hover:text-gray-600 min-w-[44px] min-h-[44px] flex items-center">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
      </router-link>
      <h1 class="text-xl font-bold text-gray-800">我的收藏</h1>
      <span class="text-sm text-gray-400 ml-1">({{ sentencesStore.filteredSentences.length }})</span>

      <!-- Active filter indicator -->
      <button
        v-if="hasActiveFilter"
        @click="clearAllFilters"
        class="ml-auto flex items-center gap-1 text-xs text-primary-600 bg-blue-50 px-2.5 py-1 rounded-full hover:bg-blue-100 transition-colors min-h-[32px]"
      >
        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
        清除筛选
      </button>
    </div>

    <!-- Search & Filter -->
    <div class="card mb-4 space-y-3">
      <input
        v-model="sentencesStore.searchQuery"
        placeholder="搜索句子内容..."
        class="input-field"
      />
      <div class="flex flex-wrap items-center gap-2">
        <button
          @click="sentencesStore.filterTag = ''"
          :class="[
            'text-xs px-3 py-1.5 rounded-full transition-colors min-h-[32px]',
            !sentencesStore.filterTag
              ? 'bg-primary-500 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
          ]"
        >
          全部
        </button>
        <button
          v-for="tag in sentencesStore.allTags"
          :key="tag"
          @click="sentencesStore.filterTag = tag"
          :class="[
            'text-xs px-3 py-1.5 rounded-full transition-colors min-h-[32px]',
            sentencesStore.filterTag === tag
              ? 'bg-primary-500 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
          ]"
        >
          {{ tag }}
        </button>

        <!-- Sort -->
        <button
          @click="toggleSort"
          class="ml-auto text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1 min-h-[32px] px-2"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
          </svg>
          {{ sentencesStore.sortOrder === 'desc' ? '最新优先' : '最早优先' }}
        </button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="sentencesStore.loading" class="text-center py-12">
      <div class="inline-block w-8 h-8 border-4 border-primary-200 border-t-primary-500 rounded-full animate-spin mb-3"></div>
      <p class="text-sm text-gray-400">加载中...</p>
    </div>

    <!-- Empty state: no sentences at all -->
    <div
      v-else-if="sentencesStore.sentences.length === 0"
      class="card text-center py-12"
    >
      <div class="text-5xl mb-4">📚</div>
      <h3 class="font-semibold text-gray-700 mb-1">还没有收藏的句子</h3>
      <p class="text-sm text-gray-400 mb-6">从文字输入或拍照识别开始，添加第一个句子</p>
      <div class="flex justify-center gap-3 flex-wrap">
        <router-link
          to="/text-input"
          class="btn-primary text-sm min-h-[44px] flex items-center"
        >
          ✍️ 文字输入
        </router-link>
        <router-link
          to="/photo-input"
          class="btn-outline text-sm min-h-[44px] flex items-center"
        >
          📷 拍照识别
        </router-link>
      </div>
    </div>

    <!-- Empty state: filter yields no results -->
    <div
      v-else-if="sentencesStore.filteredSentences.length === 0"
      class="card text-center py-10"
    >
      <div class="text-4xl mb-3">🔍</div>
      <h3 class="font-semibold text-gray-700 mb-1">没有匹配的句子</h3>
      <p class="text-sm text-gray-400 mb-4">
        <template v-if="sentencesStore.searchQuery">「{{ sentencesStore.searchQuery }}」没有搜索到相关内容</template>
        <template v-else>当前标签下没有句子</template>
      </p>
      <button
        @click="clearAllFilters"
        class="btn-outline text-sm min-h-[44px]"
      >
        清除筛选条件
      </button>
    </div>

    <!-- Sentence list -->
    <div v-else class="space-y-0">
      <SentenceItem
        v-for="sentence in sentencesStore.filteredSentences"
        :key="sentence.id"
        :sentence="sentence"
      />
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import SentenceItem from '../components/SentenceItem.vue'
import { useSentencesStore } from '../stores/index.js'

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
</script>
