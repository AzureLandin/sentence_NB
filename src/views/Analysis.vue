<template>
  <div class="max-w-2xl mx-auto">
    <!-- Header -->
    <div class="flex items-center gap-3 mb-6">
      <router-link to="/" class="text-gray-400 hover:text-gray-600">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
      </router-link>
      <h1 class="text-xl font-bold text-gray-800">分析结果</h1>
    </div>

    <div v-if="!analysis" class="card text-center py-10 text-gray-500">
      暂无分析结果
    </div>

    <template v-else>
      <!-- Original sentence -->
      <div class="card mb-4">
        <h3 class="text-sm font-medium text-gray-500 mb-2">原句</h3>
        <p class="text-gray-800 leading-relaxed text-lg">{{ sentence }}</p>
      </div>

      <!-- Analysis cards -->
      <div class="space-y-4">
        <!-- Structure -->
        <AnalysisCard
          title="句子结构拆分"
          icon="🔍"
          bg-class="bg-gradient-to-br from-white to-blue-50 border border-blue-100"
        >
          <div
            v-for="(part, i) in analysis.structure"
            :key="i"
            class="bg-white bg-opacity-60 rounded-lg p-3"
          >
            <div class="flex items-start gap-2">
              <span class="text-xs bg-blue-200 text-blue-800 px-2 py-0.5 rounded-full whitespace-nowrap mt-0.5">
                {{ part.type }}
              </span>
              <div>
                <p class="text-gray-800 font-medium">{{ part.text }}</p>
                <p class="text-gray-500 text-sm mt-1">{{ part.translation }}</p>
              </div>
            </div>
          </div>
        </AnalysisCard>

        <!-- Grammar -->
        <AnalysisCard
          title="语法点标注"
          icon="📖"
          bg-class="bg-gradient-to-br from-white to-green-50 border border-green-100"
        >
          <div
            v-for="(item, i) in analysis.grammar"
            :key="i"
            class="bg-white bg-opacity-60 rounded-lg p-3"
          >
            <h4 class="font-semibold text-green-800 mb-1">{{ item.point }}</h4>
            <p class="text-gray-700 text-sm">{{ item.explanation }}</p>
            <div v-if="item.examples?.length" class="mt-2">
              <p
                v-for="(ex, j) in item.examples"
                :key="j"
                class="text-sm text-gray-500 italic"
              >
                {{ ex }}
              </p>
            </div>
          </div>
        </AnalysisCard>

        <!-- Vocabulary -->
        <AnalysisCard
          title="重点词汇提取"
          icon="📝"
          bg-class="bg-gradient-to-br from-white to-purple-50 border border-purple-100"
        >
          <div
            v-for="(item, i) in analysis.vocabulary"
            :key="i"
            class="bg-white bg-opacity-60 rounded-lg p-3"
          >
            <div class="flex items-baseline gap-2 mb-1">
              <span class="font-bold text-purple-800">{{ item.word }}</span>
              <span class="text-gray-600 text-sm">{{ item.meaning }}</span>
            </div>
            <p v-if="item.example" class="text-sm text-gray-500 italic">
              {{ item.example }}
            </p>
          </div>
        </AnalysisCard>

        <!-- Translation -->
        <AnalysisCard
          title="全文翻译"
          icon="🌐"
          bg-class="bg-gradient-to-br from-white to-orange-50 border border-orange-100"
        >
          <div class="bg-white bg-opacity-60 rounded-lg p-3">
            <p class="text-gray-800 leading-relaxed">{{ analysis.translation }}</p>
          </div>
          <div v-if="analysis.translationNote" class="bg-white bg-opacity-60 rounded-lg p-3">
            <h4 class="text-sm font-medium text-orange-700 mb-1">翻译思路</h4>
            <p class="text-gray-600 text-sm leading-relaxed">{{ analysis.translationNote }}</p>
          </div>
        </AnalysisCard>
      </div>
    </template>
  </div>
</template>

<script setup>
import AnalysisCard from '../components/AnalysisCard.vue'

defineProps({
  sentence: { type: String, default: '' },
  analysis: { type: Object, default: null },
})
</script>
