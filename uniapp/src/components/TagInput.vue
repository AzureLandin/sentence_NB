<template>
  <view>
    <view class="tags-wrap">
      <view v-for="(tag, index) in modelValue" :key="tag" class="tag-chip">
        <text class="tag-text">{{ tag }}</text>
        <text class="tag-remove" @tap="removeTag(index)">×</text>
      </view>
    </view>
    <view class="input-row">
      <input
        v-model="newTag"
        placeholder="输入标签后回车添加"
        class="input-field tag-input"
        @confirm="addTag"
      />
      <button class="btn-outline add-btn" @tap="addTag">添加</button>
    </view>
  </view>
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

<style scoped>
.tags-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-bottom: 16rpx;
}

.tag-chip {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 8rpx 20rpx;
  background-color: #dbeafe;
  border-radius: 100rpx;
}

.tag-text {
  font-size: 24rpx;
  color: #1d4ed8;
}

.tag-remove {
  font-size: 24rpx;
  color: #93c5fd;
}

.input-row {
  display: flex;
  gap: 12rpx;
  align-items: center;
}

.tag-input {
  flex: 1;
}

.add-btn {
  padding: 16rpx 24rpx;
  font-size: 24rpx;
  min-height: 64rpx;
  white-space: nowrap;
}
</style>
