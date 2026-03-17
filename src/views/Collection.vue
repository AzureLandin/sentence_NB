<template>
  <div class="max-w-2xl mx-auto">
    <!-- Header -->
    <div class="flex items-center gap-3 mb-6">
      <router-link to="/" class="text-gray-400 hover:text-gray-600">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
      </router-link>
      <h1 class="text-xl font-bold text-gray-800">我的收藏</h1>
      <span class="text-sm text-gray-400">({{ sentencesStore.filteredSentences.length }})</span>
    </div>

    <!-- Search & Filter -->
    <div class="card mb-4 space-y-3">
      <input
        v-model="sentencesStore.searchQuery"
        placeholder="搜索句子内容..."
        class="input-field"
      />
      <div class="flex flex-wrap items-center gap-2">
        <!-- Tag filter -->
        <button
          @click="sentencesStore.filterTag = ''"
          :class="[
            'text-xs px-3 py-1 rounded-full transition-colors',
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
            'text-xs px-3 py-1 rounded-full transition-colors',
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
          class="ml-auto text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
          </svg>
          {{ sentencesStore.sortOrder === 'desc' ? '最新优先' : '最早优先' }}
        </button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="sentencesStore.loading" class="text-center py-10">
      <div class="inline-block w-8 h-8 border-4 border-primary-200 border-t-primary-500 rounded-full animate-spin"></div>
    </div>

    <!-- Empty state -->
    <div
      v-else-if="sentencesStore.filteredSentences.length === 0"
      class="card text-center py-10"
    >
      <div class="text-4xl mb-3">📚</div>
      <p class="text-gray-500" v-if="sentencesStore.sentences.length === 0">
        还没有收藏的句子。<br />
        去
        <router-link to="/text-input" class="text-primary-600 underline">添加一个</router-link>
        吧！
      </p>
      <p class="text-gray-500" v-else>
        没有找到匹配的句子
      </p>
    </div>

    <!-- Sentence list -->
    <div v-else>
      <SentenceItem
        v-for="sentence in sentencesStore.filteredSentences"
        :key="sentence.id"
        :sentence="sentence"
      />
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import SentenceItem from '../components/SentenceItem.vue'
import { useSentencesStore } from '../stores/index.js'

const sentencesStore = useSentencesStore()

onMounted(() => {
  if (sentencesStore.sentences.length === 0) {
    sentencesStore.loadSentences()
  }
})

function toggleSort() {
  sentencesStore.sortOrder = sentencesStore.sortOrder === 'desc' ? 'asc' : 'desc'
}
</script>
