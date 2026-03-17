# IndexedDB 序列化问题修复报告

**问题编号**: #001  
**发现日期**: 2026-03-17  
**修复日期**: 2026-03-17  
**严重程度**: 高  
**影响范围**: 拍照输入功能、文本分析功能

---

## 问题描述

### 错误信息
```
Failed to execute 'put' on 'IDBObjectStore': [object Array] could not be cloned.
```

### 触发场景
1. 使用拍照输入功能，OCR 识别句子后进行批量分析
2. 使用文本输入功能，对句子进行分析
3. 分析完成后保存到 IndexedDB 时失败

### 用户影响
- 句子无法保存到本地数据库
- 分析结果丢失
- 功能完全不可用

---

## 问题分析

### 根本原因

Vue 3 使用 `Proxy` 对象实现响应式系统，而 IndexedDB 的结构化克隆算法不支持克隆 `Proxy` 对象。

具体表现：
1. **Vue 响应式对象**: Pinia store 中的 `sentences.value` 是响应式数组
2. **嵌套对象**: 分析结果中的 `structure`、`grammar`、`vocabulary` 等数组也是响应式的
3. **AI 返回数据**: 可能包含 `undefined`、函数、或其他不可序列化的值

### 问题链路

```
AI 返回分析结果 
    → Vue 响应式包装 (Pinia store)
    → 直接存入 IndexedDB
    → 结构化克隆失败
    → 报错
```

### 之前修复的遗漏点

第一次修复时只处理了 `addSentence` 和 `updateAnalysis`，但遗漏了：
- `updateSentence` 中直接展开响应式对象
- `tags` 数组可能包含非字符串值
- 错误记录对象中的字段未清洗

---

## 修复方案

### 核心策略

在所有数据存入 IndexedDB 之前，使用 `JSON.parse(JSON.stringify())` 进行深拷贝清洗：
- 移除 Vue 的 Proxy 包装
- 过滤掉 `undefined`、函数等不可序列化的值
- 确保所有字段都是基本类型

---

## 修改清单

### 1. `src/utils/storage.js`

```javascript
// 修改前
export async function saveSentence(sentence) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const request = store.put(sentence)  // 直接存入
    // ...
  })
}

// 修改后
export async function saveSentence(sentence) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    
    // 深拷贝清洗数据
    let cleanSentence
    try {
      cleanSentence = JSON.parse(JSON.stringify(sentence))
    } catch (e) {
      reject(new Error('数据无法序列化: ' + e.message))
      return
    }
    
    const request = store.put(cleanSentence)
    // ...
  })
}
```

### 2. `src/stores/sentences.js`

#### addSentence 函数
```javascript
async function addSentence(content, source = 'text', analysis = null) {
  const now = Date.now()
  // 清洗 analysis 数据
  const cleanAnalysis = analysis
    ? JSON.parse(JSON.stringify({ ...analysis, analyzedAt: now }))
    : null
  const sentence = {
    id: generateUUID(),
    content: String(content || ''),
    source: String(source || 'text'),
    createdAt: now,
    updatedAt: now,
    tags: [],
    analysis: cleanAnalysis,
  }
  await dbSave(sentence)
  // ...
}
```

#### updateSentence 函数
```javascript
async function updateSentence(id, updates) {
  const idx = sentences.value.findIndex((s) => s.id === id)
  if (idx === -1) return null

  // 清洗 Vue 响应式对象
  const existingData = JSON.parse(JSON.stringify(sentences.value[idx]))
  const updatesData = JSON.parse(JSON.stringify(updates))

  const updated = {
    ...existingData,
    ...updatesData,
    updatedAt: Date.now(),
  }
  await dbSave(updated)
  // ...
}
```

#### updateTags 函数
```javascript
async function updateTags(id, tags) {
  // 确保 tags 是纯字符串数组
  const cleanTags = Array.isArray(tags)
    ? tags.map((t) => String(t || '')).filter(Boolean)
    : []
  return updateSentence(id, { tags: cleanTags })
}
```

#### addSentencesFromPhoto 函数
```javascript
// failed 数组字段强制转字符串
result.failed.push({
  id: String(sentence.id),
  content: String(content),
  error: String(err?.message || '分析失败，请重试'),
})
```

#### retrySentenceAnalyses 函数
```javascript
// 所有字段强制转字符串
result.failed.push({
  id: String(id),
  content: String(target.content || ''),
  error: String(err?.message || '分析失败，请重试'),
})
```

### 3. `src/api/analyze.js`

```javascript
// 解析后清洗数据
const cleanedAnalysis = JSON.parse(JSON.stringify({
  structure: Array.isArray(analysis.structure) ? analysis.structure.map((item) => ({
    text: String(item?.text || ''),
    type: String(item?.type || ''),
    translation: String(item?.translation || ''),
  })) : [],
  grammar: Array.isArray(analysis.grammar) ? analysis.grammar.map((item) => ({
    point: String(item?.point || ''),
    explanation: String(item?.explanation || ''),
    examples: Array.isArray(item?.examples)
      ? item.examples.map((ex) => String(ex || ''))
      : [],
  })) : [],
  vocabulary: Array.isArray(analysis.vocabulary) ? analysis.vocabulary.map((item) => ({
    word: String(item?.word || ''),
    meaning: String(item?.meaning || ''),
    example: String(item?.example || ''),
  })) : [],
  translation: String(analysis.translation || ''),
  translationNote: String(analysis.translationNote || ''),
}))
```

---

## 测试验证

### 测试步骤
1. 清理旧数据：`indexedDB.deleteDatabase('sentence-notebook-db')`
2. 重新配置 API Key 和模型
3. 测试文本输入分析
4. 测试拍照输入 OCR + 批量分析
5. 验证数据持久化（刷新页面后数据仍存在）

### 验证结果
- ✅ 文本输入分析成功保存
- ✅ 拍照批量分析成功保存
- ✅ 页面刷新后数据不丢失
- ✅ 无 IndexedDB 错误

---

## 经验教训

### 技术要点
1. **Vue 3 响应式对象不可直接序列化**  
   必须使用 `JSON.parse(JSON.stringify())` 或 `toRaw()` 清洗

2. **存储层统一处理**  
   在 `storage.js` 的 `saveSentence` 中统一清洗，避免遗漏

3. **边界情况处理**  
   所有可能存入数据库的字段都要确保是基本类型

### 最佳实践建议
1. 在 Pinia store 中，存入数据库前统一调用清洗函数
2. 封装一个 `toSerializable(obj)` 工具函数，统一处理序列化
3. 在开发环境添加数据校验，提前发现问题

---

## 相关文件

| 文件路径 | 修改内容 |
|---------|---------|
| `src/utils/storage.js` | saveSentence 添加数据清洗 |
| `src/stores/sentences.js` | addSentence、updateSentence、updateTags 等函数清洗数据 |
| `src/api/analyze.js` | 分析结果清洗为基本类型 |

---

## 附录：用户清理旧数据方法

如果用户之前遇到过此错误，需要清理旧数据：

**方法一：浏览器控制台**
```javascript
indexedDB.deleteDatabase('sentence-notebook-db')
location.reload()
```

**方法二：浏览器开发者工具**
1. 打开 DevTools (F12)
2. Application → IndexedDB → sentence-notebook-db
3. 右键删除数据库
4. 刷新页面

---

**报告编写**: Claude AI  
**审核状态**: 待用户验证