<template>
  <div class="rounded-xl p-5 shadow-sm" :class="bgClass">
    <h3 class="font-bold text-lg mb-3 flex items-center gap-2">
      <span>{{ icon }}</span>
      <span>{{ title }}</span>
    </h3>
    <div class="space-y-3">
      <slot />
    </div>
  </div>
</template>

<script setup>
defineProps({
  title: { type: String, required: true },
  icon: { type: String, default: '' },
  bgClass: {
    type: String,
    default: 'bg-gradient-to-br from-white to-blue-50 border border-blue-100',
  },
})
</script>
