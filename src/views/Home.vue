<template>
  <div class="max-w-2xl mx-auto">
    <!-- Header -->
    <div class="text-center mb-8">
      <h1 class="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">
        英语长难句笔记本
      </h1>
      <p class="text-gray-500">收藏、分析、掌握英语长难句</p>
    </div>

    <!-- Feature Cards -->
    <div class="grid grid-cols-2 gap-4">
      <FeatureCard
        to="/text-input"
        icon="📝"
        title="文本输入"
        description="输入或粘贴句子进行分析"
        icon-bg-class="bg-blue-100 text-blue-600"
      />
      <FeatureCard
        to="/photo-input"
        icon="📷"
        title="拍照输入"
        description="拍照识别句子"
        icon-bg-class="bg-purple-100 text-purple-600"
      />
      <FeatureCard
        to="/collection"
        icon="📚"
        title="我的收藏"
        description="查看所有收藏的句子"
        icon-bg-class="bg-green-100 text-green-600"
      />
      <FeatureCard
        to="/settings"
        icon="⚙️"
        title="设置"
        description="API配置与数据管理"
        icon-bg-class="bg-gray-100 text-gray-600"
      />
    </div>

    <!-- Quick Stats -->
    <div class="mt-8 card flex items-center justify-around text-center">
      <div>
        <div class="text-2xl font-bold text-primary-600">{{ sentenceCount }}</div>
        <div class="text-sm text-gray-500">收藏句子</div>
      </div>
      <div class="w-px h-10 bg-gray-200"></div>
      <div>
        <div class="text-2xl font-bold text-green-600">{{ analyzedCount }}</div>
        <div class="text-sm text-gray-500">已分析</div>
      </div>
      <div class="w-px h-10 bg-gray-200"></div>
      <div>
        <div class="text-2xl font-bold text-accent-500">{{ tagCount }}</div>
        <div class="text-sm text-gray-500">标签</div>
      </div>
    </div>

    <!-- API Warning -->
    <div
      v-if="!settingsStore.isConfigured()"
      class="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800"
    >
      尚未配置AI API。请前往
      <router-link to="/settings" class="text-primary-600 underline font-medium">设置页面</router-link>
      配置API Key以使用分析功能。
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import FeatureCard from '../components/FeatureCard.vue'
import { useSentencesStore, useSettingsStore } from '../stores/index.js'

const sentencesStore = useSentencesStore()
const settingsStore = useSettingsStore()

onMounted(() => {
  sentencesStore.loadSentences()
})

const sentenceCount = computed(() => sentencesStore.sentences.length)
const analyzedCount = computed(() =>
  sentencesStore.sentences.filter((s) => s.analysis).length
)
const tagCount = computed(() => sentencesStore.allTags.length)
</script>
