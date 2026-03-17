<template>
  <div class="card hover:shadow-md hover:border-primary-200 transition-all duration-200 mb-3 group relative">
    <router-link
      :to="`/sentence/${sentence.id}`"
      class="block pr-10"
    >
      <p class="text-gray-800 font-medium leading-relaxed mb-2">
        {{ truncatedContent }}
      </p>
      <div class="flex items-center justify-between">
        <div class="flex flex-wrap gap-1.5">
          <span
            v-for="tag in sentence.tags"
            :key="tag"
            class="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full"
          >
            {{ tag }}
          </span>
          <span
            v-if="sentence.analysis"
            class="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full"
          >
            已分析
          </span>
        </div>
        <span class="text-xs text-gray-400">{{ formattedDate }}</span>
      </div>
    </router-link>

    <button
      @click.prevent="handleDelete"
      class="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
      title="删除"
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
      </svg>
    </button>

    <div
      v-if="showConfirm"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      @click.self="showConfirm = false"
    >
      <div class="bg-white rounded-xl p-5 max-w-sm w-full shadow-xl">
        <h3 class="font-bold text-lg mb-2 text-gray-800">确认删除</h3>
        <p class="text-gray-600 text-sm mb-4">确定要删除这条句子吗？此操作无法撤销。</p>
        <div class="flex gap-2 justify-end">
          <button
            @click="showConfirm = false"
            class="px-4 py-2 rounded-lg text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
          >
            取消
          </button>
          <button
            @click="confirmDelete"
            class="px-4 py-2 rounded-lg text-sm bg-red-500 hover:bg-red-600 text-white transition-colors"
          >
            删除
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useSentencesStore } from '../stores/index.js'

const props = defineProps({
  sentence: { type: Object, required: true },
})

const emit = defineEmits(['deleted'])

const sentencesStore = useSentencesStore()
const showConfirm = ref(false)

const truncatedContent = computed(() => {
  const content = props.sentence.content
  return content.length > 80 ? content.slice(0, 80) + '...' : content
})

const formattedDate = computed(() => {
  return new Date(props.sentence.createdAt).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
})

function handleDelete() {
  showConfirm.value = true
}

async function confirmDelete() {
  await sentencesStore.removeSentence(props.sentence.id)
  showConfirm.value = false
  emit('deleted')
}
</script>