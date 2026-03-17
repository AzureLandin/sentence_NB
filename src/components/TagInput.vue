<template>
  <div>
    <div class="flex flex-wrap gap-1.5 mb-2">
      <span
        v-for="(tag, index) in modelValue"
        :key="tag"
        class="inline-flex items-center gap-1 text-sm bg-primary-100 text-primary-700 px-2.5 py-1 rounded-full"
      >
        {{ tag }}
        <button
          @click="removeTag(index)"
          class="hover:text-red-500 transition-colors"
        >
          &times;
        </button>
      </span>
    </div>
    <div class="flex gap-2">
      <input
        v-model="newTag"
        @keydown.enter.prevent="addTag"
        placeholder="输入标签后回车添加"
        class="input-field text-sm flex-1"
      />
      <button @click="addTag" class="btn-outline text-sm">添加</button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
  modelValue: { type: Array, default: () => [] },
})

const emit = defineEmits(['update:modelValue'])

const newTag = ref('')

function addTag() {
  const tag = newTag.value.trim()
  if (!tag) return
  if (props.modelValue.includes(tag)) {
    newTag.value = ''
    return
  }
  emit('update:modelValue', [...props.modelValue, tag])
  newTag.value = ''
}

function removeTag(index) {
  const tags = [...props.modelValue]
  tags.splice(index, 1)
  emit('update:modelValue', tags)
}
</script>
