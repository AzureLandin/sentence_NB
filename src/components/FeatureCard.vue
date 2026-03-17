<template>
  <router-link
    :to="to"
    class="card group cursor-pointer hover:shadow-md hover:border-primary-200 transition-all duration-300 flex flex-col items-center text-center"
  >
    <div
      class="w-14 h-14 rounded-full flex items-center justify-center text-2xl mb-3 transition-transform duration-300 group-hover:scale-110"
      :class="iconBgClass"
    >
      {{ icon }}
    </div>
    <h3 class="font-semibold text-gray-800 mb-1">{{ title }}</h3>
    <p class="text-sm text-gray-500">{{ description }}</p>
  </router-link>
</template>

<script setup>
defineProps({
  to: { type: String, required: true },
  icon: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  iconBgClass: { type: String, default: 'bg-primary-100 text-primary-600' },
})
</script>
