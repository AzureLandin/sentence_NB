<template>
  <div class="max-w-2xl mx-auto">
    <!-- Header -->
    <div class="flex items-center gap-3 mb-6">
      <router-link to="/" class="text-gray-400 hover:text-gray-600">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
      </router-link>
      <h1 class="text-xl font-bold text-gray-800">设置</h1>
    </div>

    <!-- API Configuration -->
    <div class="card mb-4">
      <h2 class="font-semibold text-gray-800 mb-4">API 配置</h2>

      <!-- Mode Switch -->
      <div class="flex items-center gap-3 mb-4 p-3 bg-gray-50 rounded-lg">
        <button
          @click="settingsStore.useMode = 'simple'"
          class="flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors text-center"
          :class="settingsStore.useMode === 'simple'
            ? 'bg-white shadow text-blue-600'
            : 'text-gray-500 hover:text-gray-700'"
        >
          简单模式
        </button>
        <button
          @click="settingsStore.useMode = 'advanced'"
          class="flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors text-center"
          :class="settingsStore.useMode === 'advanced'
            ? 'bg-white shadow text-blue-600'
            : 'text-gray-500 hover:text-gray-700'"
        >
          专业模式
        </button>
      </div>
      <p class="text-xs text-gray-400 mb-4">
        {{ settingsStore.useMode === 'simple'
          ? '只需配置一个多模态视觉模型，同时用于图片识别和句子分析'
          : '分别配置视觉模型（OCR）和文本模型（分析），速度更快、成本更低' }}
      </p>

      <!-- ===== Simple Mode: single config ===== -->
      <template v-if="settingsStore.useMode === 'simple'">
        <p class="text-xs text-gray-400 mb-3">选择一个支持视觉能力的多模态模型</p>

        <!-- Provider -->
        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-600 mb-1">AI提供商</label>
          <select
            :value="settingsStore.visionApi.provider"
            @change="settingsStore.setVisionProvider($event.target.value)"
            class="input-field"
          >
            <option value="openai">OpenAI (GPT-4o)</option>
            <option value="qwen">通义千问</option>
            <option value="zhipu">智谱 AI (GLM)</option>
            <option value="siliconflow">硅基流动 (SiliconFlow)</option>
            <option value="claude">Claude</option>
            <option value="custom">自定义</option>
          </select>
        </div>

        <!-- API Format (custom only) -->
        <div v-if="settingsStore.visionApi.provider === 'custom'" class="mb-4">
          <label class="block text-sm font-medium text-gray-600 mb-1">API 格式</label>
          <select
            :value="settingsStore.visionApi.apiFormat"
            @change="settingsStore.visionApi.apiFormat = $event.target.value"
            class="input-field"
          >
            <option value="openai">OpenAI 兼容格式</option>
            <option value="claude">Claude 格式</option>
          </select>
          <p class="text-xs text-gray-400 mt-1">大多数第三方服务使用 OpenAI 兼容格式</p>
        </div>

        <!-- API Key -->
        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-600 mb-1">API Key</label>
          <div class="relative">
            <input
              :type="showVisionApiKey ? 'text' : 'password'"
              :value="settingsStore.visionApi.apiKey"
              @input="settingsStore.visionApi.apiKey = $event.target.value"
              placeholder="输入你的API Key"
              class="input-field pr-10"
            />
            <button
              @click="showVisionApiKey = !showVisionApiKey"
              class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <svg v-if="showVisionApiKey" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
              </svg>
              <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </button>
          </div>
        </div>

        <!-- Model -->
        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-600 mb-1">模型ID</label>
          <div class="flex gap-2">
            <input
              :value="settingsStore.visionApi.model"
              @input="settingsStore.visionApi.model = $event.target.value"
              placeholder="例如: gpt-4o, Qwen2.5-VL-72B-Instruct"
              class="input-field flex-1"
            />
            <button
              @click="handleValidateVisionModel"
              :disabled="validatingVision || !settingsStore.visionApi.apiKey || !settingsStore.visionApi.model"
              class="btn-outline text-xs whitespace-nowrap"
            >
              {{ validatingVision ? '验证中...' : '验证' }}
            </button>
          </div>
          <p class="text-xs text-gray-400 mt-1">需选择支持视觉能力的多模态模型，纯文本模型无法识别图片</p>
        </div>

        <!-- Advanced: Endpoint -->
        <div class="mb-4">
          <button
            @click="showVisionAdvanced = !showVisionAdvanced"
            class="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
          >
            <svg
              class="w-4 h-4 transition-transform"
              :class="{ 'rotate-90': showVisionAdvanced }"
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
            高级选项
          </button>
          <div v-if="showVisionAdvanced" class="mt-2">
            <label class="block text-sm font-medium text-gray-600 mb-1">API 端点</label>
            <input
              :value="settingsStore.visionApi.endpoint"
              @input="settingsStore.visionApi.endpoint = $event.target.value"
              placeholder="https://api.openai.com/v1/chat/completions"
              class="input-field"
            />
          </div>
        </div>

        <!-- Test -->
        <div class="flex flex-wrap gap-2">
          <button
            @click="handleTestVisionConnection"
            :disabled="testingVision || !settingsStore.visionApi.apiKey || !settingsStore.visionApi.model"
            class="btn-primary text-sm"
          >
            {{ testingVision ? '测试中...' : '测试连接' }}
          </button>
        </div>

        <div
          v-if="visionTestResult !== null"
          class="mt-3 text-sm rounded-lg p-3"
          :class="visionTestResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'"
        >
          {{ visionTestResult.message }}
        </div>
        <div
          v-if="visionValidateResult !== null"
          class="mt-3 text-sm rounded-lg p-3"
          :class="visionValidateResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'"
        >
          {{ visionValidateResult.message }}
        </div>
      </template>

      <!-- ===== Advanced Mode: dual config with tabs ===== -->
      <template v-else>
        <!-- Tab Switch -->
        <div class="flex border-b border-gray-200 mb-4">
          <button
            @click="activeTab = 'text'"
            class="px-4 py-2 text-sm font-medium border-b-2 transition-colors"
            :class="activeTab === 'text'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'"
          >
            文本模型
          </button>
          <button
            @click="activeTab = 'vision'"
            class="px-4 py-2 text-sm font-medium border-b-2 transition-colors"
            :class="activeTab === 'vision'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'"
          >
            视觉模型
          </button>
        </div>

        <!-- Text API Config -->
        <div v-show="activeTab === 'text'">
          <p class="text-xs text-gray-400 mb-3">用于分析长难句的文本模型</p>

          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-600 mb-1">AI提供商</label>
            <select
              :value="settingsStore.textApi.provider"
              @change="settingsStore.setTextProvider($event.target.value)"
              class="input-field"
            >
              <option value="openai">OpenAI (GPT-4o)</option>
              <option value="qwen">通义千问</option>
              <option value="zhipu">智谱 AI (GLM)</option>
              <option value="siliconflow">硅基流动 (SiliconFlow)</option>
              <option value="claude">Claude</option>
              <option value="custom">自定义</option>
            </select>
          </div>

          <div v-if="settingsStore.textApi.provider === 'custom'" class="mb-4">
            <label class="block text-sm font-medium text-gray-600 mb-1">API 格式</label>
            <select
              :value="settingsStore.textApi.apiFormat"
              @change="settingsStore.textApi.apiFormat = $event.target.value"
              class="input-field"
            >
              <option value="openai">OpenAI 兼容格式</option>
              <option value="claude">Claude 格式</option>
            </select>
            <p class="text-xs text-gray-400 mt-1">大多数第三方服务使用 OpenAI 兼容格式</p>
          </div>

          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-600 mb-1">API Key</label>
            <div class="relative">
              <input
                :type="showTextApiKey ? 'text' : 'password'"
                :value="settingsStore.textApi.apiKey"
                @input="settingsStore.textApi.apiKey = $event.target.value"
                placeholder="输入你的API Key"
                class="input-field pr-10"
              />
              <button
                @click="showTextApiKey = !showTextApiKey"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <svg v-if="showTextApiKey" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                </svg>
                <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </button>
            </div>
          </div>

          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-600 mb-1">模型ID</label>
            <div class="flex gap-2">
              <input
                :value="settingsStore.textApi.model"
                @input="settingsStore.textApi.model = $event.target.value"
                placeholder="例如: gpt-4o, glm-4-plus"
                class="input-field flex-1"
              />
              <button
                @click="handleValidateTextModel"
                :disabled="validatingText || !settingsStore.textApi.apiKey || !settingsStore.textApi.model"
                class="btn-outline text-xs whitespace-nowrap"
              >
                {{ validatingText ? '验证中...' : '验证' }}
              </button>
            </div>
          </div>

          <div class="mb-4">
            <button
              @click="showTextAdvanced = !showTextAdvanced"
              class="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
            >
              <svg
                class="w-4 h-4 transition-transform"
                :class="{ 'rotate-90': showTextAdvanced }"
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
              高级选项
            </button>
            <div v-if="showTextAdvanced" class="mt-2">
              <label class="block text-sm font-medium text-gray-600 mb-1">API 端点</label>
              <input
                :value="settingsStore.textApi.endpoint"
                @input="settingsStore.textApi.endpoint = $event.target.value"
                placeholder="https://api.openai.com/v1/chat/completions"
                class="input-field"
              />
            </div>
          </div>

          <div class="flex flex-wrap gap-2">
            <button
              @click="handleTestTextConnection"
              :disabled="testingText || !settingsStore.textApi.apiKey || !settingsStore.textApi.model"
              class="btn-primary text-sm"
            >
              {{ testingText ? '测试中...' : '测试连接' }}
            </button>
          </div>

          <div
            v-if="textTestResult !== null"
            class="mt-3 text-sm rounded-lg p-3"
            :class="textTestResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'"
          >
            {{ textTestResult.message }}
          </div>
          <div
            v-if="textValidateResult !== null"
            class="mt-3 text-sm rounded-lg p-3"
            :class="textValidateResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'"
          >
            {{ textValidateResult.message }}
          </div>
        </div>

        <!-- Vision API Config -->
        <div v-show="activeTab === 'vision'">
          <div class="flex items-center justify-between mb-3">
            <p class="text-xs text-gray-400">用于拍照识别图片中的文字</p>
            <button
              @click="handleCopyTextToVision"
              class="text-xs text-blue-500 hover:text-blue-700 whitespace-nowrap"
            >
              从文本配置复制
            </button>
          </div>

          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-600 mb-1">AI提供商</label>
            <select
              :value="settingsStore.visionApi.provider"
              @change="settingsStore.setVisionProvider($event.target.value)"
              class="input-field"
            >
              <option value="openai">OpenAI (GPT-4o)</option>
              <option value="qwen">通义千问</option>
              <option value="zhipu">智谱 AI (GLM)</option>
              <option value="siliconflow">硅基流动 (SiliconFlow)</option>
              <option value="claude">Claude</option>
              <option value="custom">自定义</option>
            </select>
          </div>

          <div v-if="settingsStore.visionApi.provider === 'custom'" class="mb-4">
            <label class="block text-sm font-medium text-gray-600 mb-1">API 格式</label>
            <select
              :value="settingsStore.visionApi.apiFormat"
              @change="settingsStore.visionApi.apiFormat = $event.target.value"
              class="input-field"
            >
              <option value="openai">OpenAI 兼容格式</option>
              <option value="claude">Claude 格式</option>
            </select>
            <p class="text-xs text-gray-400 mt-1">大多数第三方服务使用 OpenAI 兼容格式</p>
          </div>

          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-600 mb-1">API Key</label>
            <div class="relative">
              <input
                :type="showVisionApiKey ? 'text' : 'password'"
                :value="settingsStore.visionApi.apiKey"
                @input="settingsStore.visionApi.apiKey = $event.target.value"
                placeholder="输入你的API Key"
                class="input-field pr-10"
              />
              <button
                @click="showVisionApiKey = !showVisionApiKey"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <svg v-if="showVisionApiKey" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                </svg>
                <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </button>
            </div>
          </div>

          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-600 mb-1">模型ID</label>
            <div class="flex gap-2">
              <input
                :value="settingsStore.visionApi.model"
                @input="settingsStore.visionApi.model = $event.target.value"
                placeholder="例如: gpt-4o, glm-4v-plus, qwen-vl-plus"
                class="input-field flex-1"
              />
              <button
                @click="handleValidateVisionModel"
                :disabled="validatingVision || !settingsStore.visionApi.apiKey || !settingsStore.visionApi.model"
                class="btn-outline text-xs whitespace-nowrap"
              >
                {{ validatingVision ? '验证中...' : '验证' }}
              </button>
            </div>
          </div>

          <div class="mb-4">
            <button
              @click="showVisionAdvanced = !showVisionAdvanced"
              class="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
            >
              <svg
                class="w-4 h-4 transition-transform"
                :class="{ 'rotate-90': showVisionAdvanced }"
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
              高级选项
            </button>
            <div v-if="showVisionAdvanced" class="mt-2">
              <label class="block text-sm font-medium text-gray-600 mb-1">API 端点</label>
              <input
                :value="settingsStore.visionApi.endpoint"
                @input="settingsStore.visionApi.endpoint = $event.target.value"
                placeholder="https://api.openai.com/v1/chat/completions"
                class="input-field"
              />
            </div>
          </div>

          <div class="flex flex-wrap gap-2">
            <button
              @click="handleTestVisionConnection"
              :disabled="testingVision || !settingsStore.visionApi.apiKey || !settingsStore.visionApi.model"
              class="btn-primary text-sm"
            >
              {{ testingVision ? '测试中...' : '测试连接' }}
            </button>
          </div>

          <div
            v-if="visionTestResult !== null"
            class="mt-3 text-sm rounded-lg p-3"
            :class="visionTestResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'"
          >
            {{ visionTestResult.message }}
          </div>
          <div
            v-if="visionValidateResult !== null"
            class="mt-3 text-sm rounded-lg p-3"
            :class="visionValidateResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'"
          >
            {{ visionValidateResult.message }}
          </div>
          <div
            v-if="copySuccess"
            class="mt-3 text-sm rounded-lg p-3 bg-green-50 text-green-700"
          >
            已从文本模型配置复制
          </div>
        </div>
      </template>
    </div>

    <!-- Data Management -->
    <div class="card mb-4">
      <h2 class="font-semibold text-gray-800 mb-4">数据管理</h2>

      <div class="space-y-3">
        <button @click="handleExport" class="btn-outline text-sm w-full text-left flex items-center gap-2">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          导出所有数据 (JSON)
        </button>

        <button @click="handleExportMarkdown" class="btn-outline text-sm w-full text-left flex items-center gap-2">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 8h10M7 12h10m-7 4h7M5 3h9l5 5v13a1 1 0 01-1 1H5a1 1 0 01-1-1V4a1 1 0 011-1z" />
          </svg>
          导出已分析句子 (Markdown)
        </button>

        <div class="rounded-lg border border-gray-200 p-3 space-y-2">
          <p class="text-xs font-medium text-gray-600">Markdown 导出范围</p>
          <select v-model="markdownExportScope" class="input-field text-sm">
            <option value="all">全部已分析句子</option>
            <option value="current">当前筛选结果（收藏页筛选）</option>
            <option value="tag">按标签</option>
          </select>

          <select
            v-if="markdownExportScope === 'tag'"
            v-model="markdownExportTag"
            class="input-field text-sm"
          >
            <option value="">请选择标签</option>
            <option v-for="tag in sentencesStore.allTags" :key="tag" :value="tag">
              {{ tag }}
            </option>
          </select>

          <p class="text-xs text-gray-500">{{ markdownScopeHint }}</p>
        </div>

        <label class="btn-outline text-sm w-full text-left flex items-center gap-2 cursor-pointer">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          导入数据
          <input type="file" accept=".json" @change="handleImport" class="hidden" />
        </label>

        <button
          @click="showClearConfirm = true"
          class="btn-danger text-sm w-full text-left flex items-center gap-2"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          清除所有数据
        </button>
      </div>

      <div
        v-if="importResult"
        class="mt-3 text-sm rounded-lg p-3"
        :class="importResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'"
      >
        {{ importResult.message }}
      </div>
    </div>

    <!-- Account Section -->
    <div class="card mb-4">
      <h2 class="font-semibold text-gray-800 mb-4">账号与同步</h2>

      <!-- 已登录 -->
      <template v-if="authStore.isLoggedIn">
        <div class="flex items-center gap-3 p-3 bg-gray-50 rounded-lg mb-3">
          <div class="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm">
            {{ authStore.user?.displayName?.[0]?.toUpperCase() || '?' }}
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-gray-800 truncate">{{ authStore.user?.displayName }}</p>
            <p class="text-xs text-gray-500 truncate">{{ authStore.user?.email }}</p>
          </div>
          <!-- 同步状态点 -->
          <span class="flex items-center gap-1 text-xs" :class="syncStatusColor">
            <span class="w-2 h-2 rounded-full" :class="syncDotClass"></span>
            {{ syncStatusText }}
          </span>
        </div>

        <!-- 同步统计 -->
        <div class="grid grid-cols-3 gap-2 mb-3 text-center">
          <div class="bg-gray-50 rounded-lg p-2">
            <p class="text-xs text-gray-500">上次同步</p>
            <p class="text-xs font-medium text-gray-700">{{ lastSyncText }}</p>
          </div>
          <div class="bg-yellow-50 rounded-lg p-2 cursor-pointer" @click="showConflicts = !showConflicts">
            <p class="text-xs text-yellow-600">冲突</p>
            <p class="text-xs font-medium text-yellow-700">{{ syncStore.conflictCount }}</p>
          </div>
          <div class="bg-red-50 rounded-lg p-2">
            <p class="text-xs text-red-600">死信</p>
            <p class="text-xs font-medium text-red-700">{{ syncStore.deadLetterCount }}</p>
          </div>
        </div>

        <div class="flex gap-2">
          <button
            @click="handleManualSync"
            :disabled="syncStore.status === 'syncing'"
            class="btn-outline text-sm flex-1 flex items-center justify-center gap-1"
          >
            <svg class="w-3.5 h-3.5" :class="syncStore.status === 'syncing' ? 'animate-spin' : ''" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            立即同步
          </button>
          <button @click="handleLogout" :disabled="authStore.loading" class="btn-outline text-sm flex-1">
            {{ authStore.loading ? '退出中…' : '退出登录' }}
          </button>
        </div>
      </template>

      <!-- 未登录 -->
      <template v-else>
        <p class="text-sm text-gray-500 mb-3">登录后可将句子同步到云端，跨设备访问。</p>
        <router-link to="/login" class="btn-primary text-sm w-full flex items-center justify-center gap-2">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
          </svg>
          登录 / 注册
        </router-link>
      </template>
    </div>

    <!-- Clear confirmation dialog -->
    <div
      v-if="showClearConfirm"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
    >
      <div class="bg-white rounded-xl p-6 max-w-sm w-full shadow-xl">
        <h3 class="font-bold text-lg mb-2 text-red-600">确认清除所有数据</h3>
        <p class="text-gray-600 text-sm mb-4">
          此操作将删除所有收藏的句子和分析结果，无法恢复。建议先导出数据备份。
        </p>
        <div class="flex gap-2 justify-end">
          <button @click="showClearConfirm = false" class="btn-outline text-sm">取消</button>
          <button @click="handleClear" class="btn-danger text-sm">确认清除</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useSettingsStore, useSentencesStore } from '../stores/index.js'
import { useAuthStore } from '../stores/auth.js'
import { useSyncStore } from '../stores/sync.js'
import { testConnection, validateModel } from '../api/index.js'
import { buildMarkdownDocument, downloadMarkdown } from '../utils/export.js'

const router = useRouter()
const settingsStore = useSettingsStore()
const sentencesStore = useSentencesStore()
const authStore = useAuthStore()
const syncStore = useSyncStore()

const showConflicts = ref(false)

const syncStatusText = computed(() => {
  const s = syncStore.status
  if (s === 'syncing') return '同步中'
  if (s === 'error') return '同步失败'
  if (s === 'offline') return '离线'
  return '已同步'
})

const syncStatusColor = computed(() => {
  const s = syncStore.status
  if (s === 'syncing') return 'text-blue-500'
  if (s === 'error') return 'text-red-500'
  if (s === 'offline') return 'text-gray-400'
  return 'text-green-500'
})

const syncDotClass = computed(() => {
  const s = syncStore.status
  if (s === 'syncing') return 'bg-blue-400 animate-pulse'
  if (s === 'error') return 'bg-red-400'
  if (s === 'offline') return 'bg-gray-400'
  return 'bg-green-400'
})

const lastSyncText = computed(() => {
  if (!syncStore.lastSyncAt) return '从未'
  const diff = Date.now() - syncStore.lastSyncAt
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  return `${Math.floor(diff / 3600000)}小时前`
})

async function handleManualSync() {
  await syncStore.incrementalPull()
  await syncStore.flushQueue()
}

async function handleLogout() {
  await authStore.doLogout()
  syncStore.stopPeriodicPull()
  router.push('/')
}

const activeTab = ref('text')
const showTextApiKey = ref(false)
const showVisionApiKey = ref(false)
const showTextAdvanced = ref(false)
const showVisionAdvanced = ref(false)

const testingText = ref(false)
const textTestResult = ref(null)
const validatingText = ref(false)
const textValidateResult = ref(null)

const testingVision = ref(false)
const visionTestResult = ref(null)
const validatingVision = ref(false)
const visionValidateResult = ref(null)

const copySuccess = ref(false)
const showClearConfirm = ref(false)
const importResult = ref(null)
const markdownExportScope = ref('all')
const markdownExportTag = ref('')

onMounted(() => {
  if (sentencesStore.sentences.length === 0) {
    sentencesStore.loadSentences()
  }
})

const markdownScopeHint = computed(() => {
  if (markdownExportScope.value === 'current') {
    return `当前筛选条件：关键词「${sentencesStore.searchQuery || '无'}」、标签「${sentencesStore.filterTag || '全部'}」、排序「${sentencesStore.sortOrder === 'desc' ? '最新优先' : '最早优先'}」`
  }
  if (markdownExportScope.value === 'tag') {
    return markdownExportTag.value
      ? `仅导出标签「${markdownExportTag.value}」的已分析句子`
      : '请选择一个标签后再导出'
  }
  return '导出全部已分析句子'
})

async function handleTestTextConnection() {
  testingText.value = true
  textTestResult.value = null
  try {
    const ok = await testConnection(settingsStore.textApi)
    textTestResult.value = {
      success: ok,
      message: ok ? 'API连接成功！' : 'API返回了异常结果，请检查配置',
    }
  } catch (err) {
    textTestResult.value = { success: false, message: err.message || '连接失败' }
  } finally {
    testingText.value = false
  }
}

async function handleValidateTextModel() {
  validatingText.value = true
  textValidateResult.value = null
  try {
    const ok = await validateModel(settingsStore.textApi)
    textValidateResult.value = {
      success: ok,
      message: ok ? `文本模型「${settingsStore.textApi.model}」可用` : '模型不可用，请检查模型ID是否正确',
    }
  } catch (err) {
    textValidateResult.value = { success: false, message: err.message || '验证失败' }
  } finally {
    validatingText.value = false
  }
}

async function handleTestVisionConnection() {
  testingVision.value = true
  visionTestResult.value = null
  try {
    const ok = await testConnection(settingsStore.visionApi)
    visionTestResult.value = {
      success: ok,
      message: ok ? 'API连接成功！' : 'API返回了异常结果，请检查配置',
    }
  } catch (err) {
    visionTestResult.value = { success: false, message: err.message || '连接失败' }
  } finally {
    testingVision.value = false
  }
}

async function handleValidateVisionModel() {
  validatingVision.value = true
  visionValidateResult.value = null
  try {
    const ok = await validateModel(settingsStore.visionApi)
    visionValidateResult.value = {
      success: ok,
      message: ok ? `模型「${settingsStore.visionApi.model}」可用` : '模型不可用，请检查模型ID是否正确',
    }
  } catch (err) {
    visionValidateResult.value = { success: false, message: err.message || '验证失败' }
  } finally {
    validatingVision.value = false
  }
}

function handleCopyTextToVision() {
  settingsStore.copyTextToVision()
  copySuccess.value = true
  setTimeout(() => { copySuccess.value = false }, 2000)
}

function handleExport() {
  const data = sentencesStore.exportData()
  const blob = new Blob([data], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `sentence-notebook-export-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

function handleExportMarkdown() {
  let list = []
  if (markdownExportScope.value === 'current') {
    list = sentencesStore.filteredSentences.filter((sentence) => sentence.analysis)
  } else if (markdownExportScope.value === 'tag') {
    if (!markdownExportTag.value) {
      importResult.value = { success: false, message: '请先选择标签，再执行 Markdown 导出' }
      return
    }
    list = sentencesStore.sentences.filter(
      (sentence) => sentence.analysis && sentence.tags.includes(markdownExportTag.value)
    )
  } else {
    list = sentencesStore.sentences.filter((sentence) => sentence.analysis)
  }
  if (list.length === 0) {
    importResult.value = { success: false, message: '当前范围内无可导出的分析结果，请调整筛选或先完成句子分析' }
    return
  }
  const markdown = buildMarkdownDocument(list, '英语长难句笔记导出')
  downloadMarkdown(markdown, 'sentence-notebook')
  importResult.value = { success: true, message: `Markdown 导出完成，共 ${list.length} 条句子` }
}

async function handleImport(event) {
  const file = event.target.files?.[0]
  if (!file) return
  importResult.value = null
  try {
    const text = await file.text()
    await sentencesStore.importData(text)
    importResult.value = { success: true, message: `成功导入数据！当前共 ${sentencesStore.sentences.length} 条句子` }
  } catch (err) {
    importResult.value = { success: false, message: `导入失败: ${err.message}` }
  }
  event.target.value = ''
}

async function handleClear() {
  await sentencesStore.clearAll()
  showClearConfirm.value = false
}
</script>
