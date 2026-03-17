# AGENTS.md - AI Coding Agent Guidelines

This document provides guidelines for AI coding agents working in the English Sentence Notebook codebase.

## Project Overview

- **Name**: English Sentence Notebook
- **Type**: Vue 3 SPA for collecting, analyzing, and reviewing English sentences with AI integration
- **Language**: JavaScript (ES Modules) - No TypeScript
- **Framework**: Vue 3 with Composition API, Pinia, Vue Router, TailwindCSS

## Build / Dev / Test Commands

```bash
# Development
npm run dev          # Start Vite dev server

# Production
npm run build        # Build for production
npm run preview      # Preview production build

# No test framework configured
# No linting tools configured (no ESLint/Prettier)
```

## Project Structure

```
src/
├── api/           # API integration layer (chatCompletion, analyze, ocr)
├── components/    # Reusable Vue components (PascalCase.vue)
├── views/         # Page-level components (PascalCase.vue)
├── stores/        # Pinia stores (camelCase.js)
├── utils/         # Helper functions (camelCase.js)
├── assets/        # Styles (TailwindCSS)
├── App.vue        # Root component
├── main.js        # Entry point
└── router.js      # Vue Router configuration
```

## Code Style Guidelines

### File Naming

| Type | Convention | Example |
|------|------------|---------|
| Vue Components | PascalCase | `AnalysisCard.vue`, `SentenceItem.vue` |
| JS Files | camelCase | `storage.js`, `analyze.js` |
| Functions | camelCase | `analyzeSentence`, `handleExport` |
| Constants | UPPER_SNAKE_CASE | `DB_NAME`, `STORE_NAME` |

### Import Order & Style

```javascript
// 1. External libraries first
import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'

// 2. Internal JS modules (ALWAYS include .js extension)
import { generateUUID } from '../utils/uuid.js'
import { analyzeSentence } from '../api/analyze.js'
import { useSentencesStore } from '../stores/index.js'

// 3. Vue components last
import AnalysisCard from '../components/AnalysisCard.vue'
```

**Critical**: Always include `.js` extension for local JavaScript imports.

### Vue Component Structure

```vue
<template>
  <!-- Template first, use TailwindCSS utilities -->
</template>

<script setup>
// 1. Imports
import { ref, computed, onMounted } from 'vue'
import { useSentencesStore } from '../stores/index.js'

// 2. Store initialization
const store = useSentencesStore()

// 3. Reactive state
const loading = ref(false)
const error = ref('')

// 4. Computed properties
const count = computed(() => store.items.length)

// 5. Lifecycle hooks
onMounted(() => {
  store.loadItems()
})

// 6. Methods (use function declarations)
async function handleSubmit() {
  // implementation
}
</script>

<!-- No <style> blocks - use Tailwind utilities inline -->
```

### Props & Emits

```javascript
// Props with type and default/required
defineProps({
  title: { type: String, required: true },
  icon: { type: String, default: '' },
  items: { type: Array, default: () => [] },
})

// Emits declaration
const emit = defineEmits(['update:modelValue', 'deleted'])
```

### Pinia Store Pattern (Composition API Style)

```javascript
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useExampleStore = defineStore('storeName', () => {
  // State as refs
  const items = ref([])
  const loading = ref(false)

  // Getters as computed
  const count = computed(() => items.value.length)

  // Actions as functions
  async function loadItems() {
    loading.value = true
    try {
      // async operation
    } finally {
      loading.value = false
    }
  }

  return { items, loading, count, loadItems }
})
```

### Async/Await & Error Handling

```javascript
// Always use async/await (not .then/.catch)
async function handleAction() {
  loading.value = true
  error.value = ''
  
  try {
    const result = await apiCall()
    // success handling
  } catch (err) {
    // User-facing error messages in Chinese
    error.value = err.message || '操作失败，请重试'
  } finally {
    loading.value = false
  }
}

// Throwing errors with Chinese messages
if (!settings.apiKey) {
  throw new Error('请先在设置中配置API Key')
}
```

### Data Serialization (Critical)

Vue 3 Proxy objects are incompatible with IndexedDB. Always deep-clone reactive data before storage:

```javascript
// Strip Vue reactivity proxies before storage
const cleanData = JSON.parse(JSON.stringify(reactiveObject))
```

### Styling

- **TailwindCSS only** - no inline styles or `<style>` blocks
- Custom component classes available in `src/assets/styles.css`:
  - Buttons: `.btn-primary`, `.btn-accent`, `.btn-outline`, `.btn-danger`
  - Cards: `.card`
  - Inputs: `.input-field`
- Color scheme: primary (blue), accent (orange)

### Router

```javascript
// Use lazy loading for routes
component: () => import('./views/TextInput.vue')

// Hash-based history (createWebHashHistory)
```

## API Integration

```javascript
// All AI API calls go through api/index.js chatCompletion function
import { chatCompletion } from './index.js'

// Domain APIs use chatCompletion internally
export async function analyzeSentence(sentence) {
  const response = await chatCompletion([...messages])
  return JSON.parse(response)
}
```

## Storage

- **IndexedDB**: Sentence data (via `utils/storage.js`)
- **LocalStorage**: Settings (via Pinia persist)

## Key Conventions Summary

1. **ES Modules** with `.js` extension on imports
2. **Composition API** with `<script setup>` for all components
3. **Pinia Composition style** (refs, computed, functions)
4. **async/await** for all async operations
5. **Chinese error messages** for user-facing errors
6. **TailwindCSS utilities** for all styling
7. **JSON.parse(JSON.stringify())** to clean reactive data before storage
8. **No TypeScript** - pure JavaScript
9. **No semicolons** at end of statements
10. **2-space indentation**

## Common Pitfalls

1. Forgetting `.js` extension on imports causes runtime errors
2. Storing Vue Proxy objects in IndexedDB causes DataCloneError
3. Using Options API instead of Composition API
4. Adding `<style>` blocks instead of Tailwind classes
5. Using English for user-facing error messages (should be Chinese)
