function safeText(value) {
  return String(value || '').trim()
}

function formatList(items, formatter) {
  if (!Array.isArray(items) || items.length === 0) {
    return '- 暂无\n'
  }
  return items.map((item, index) => formatter(item, index)).join('\n') + '\n'
}

export function formatSentenceMarkdown(sentence) {
  const lines = []
  const content = safeText(sentence?.content)
  const createdAt = sentence?.createdAt
    ? new Date(sentence.createdAt).toLocaleString('zh-CN')
    : '未知时间'
  const source = sentence?.source === 'photo' ? '拍照输入' : '文本输入'
  const tags = Array.isArray(sentence?.tags) && sentence.tags.length > 0
    ? sentence.tags.join(', ')
    : '无'

  lines.push(`## ${content || '未命名句子'}`)
  lines.push('')
  lines.push(`- 来源: ${source}`)
  lines.push(`- 创建时间: ${createdAt}`)
  lines.push(`- 标签: ${tags}`)
  lines.push('')

  const analysis = sentence?.analysis
  if (!analysis) {
    lines.push('> 暂无分析结果')
    lines.push('')
    return lines.join('\n')
  }

  lines.push('### 句子结构拆分')
  lines.push(formatList(analysis.structure, (part) => (
    `- [${safeText(part?.type) || '未分类'}] ${safeText(part?.text)}\n  - 翻译: ${safeText(part?.translation) || '暂无'}`
  )))

  lines.push('### 语法点标注')
  lines.push(formatList(analysis.grammar, (item) => {
    const examples = Array.isArray(item?.examples) && item.examples.length > 0
      ? item.examples.map((example) => `    - ${safeText(example)}`).join('\n')
      : '    - 暂无示例'
    return `- ${safeText(item?.point) || '未命名语法点'}: ${safeText(item?.explanation) || '暂无说明'}\n${examples}`
  }))

  lines.push('### 重点词汇提取')
  lines.push(formatList(analysis.vocabulary, (item) => {
    const example = safeText(item?.example)
    return example
      ? `- ${safeText(item?.word)}: ${safeText(item?.meaning)}\n  - 例句: ${example}`
      : `- ${safeText(item?.word)}: ${safeText(item?.meaning)}`
  }))

  lines.push('### 全文翻译')
  lines.push(safeText(analysis.translation) || '暂无翻译')
  lines.push('')

  if (safeText(analysis.translationNote)) {
    lines.push('### 翻译思路')
    lines.push(safeText(analysis.translationNote))
    lines.push('')
  }

  return lines.join('\n')
}

export function buildMarkdownDocument(sentences, title = '英语长难句笔记导出') {
  const list = Array.isArray(sentences) ? sentences : []
  const header = [
    `# ${title}`,
    '',
    `导出时间: ${new Date().toLocaleString('zh-CN')}`,
    `句子数量: ${list.length}`,
    '',
    '---',
    '',
  ]

  const sections = list.map((sentence) => formatSentenceMarkdown(sentence))
  return header.join('\n') + sections.join('\n---\n\n')
}

/**
 * UniApp 版：将 Markdown 内容通过 uni.saveFile 或剪贴板方式导出。
 * 小程序不支持 Blob/URL，改为将内容写入临时文件后触发分享/保存。
 */
export function downloadMarkdown(content, filenamePrefix = 'sentence-notebook') {
  // #ifdef H5
  const safePrefix = String(filenamePrefix || 'sentence-notebook').replace(/[^a-zA-Z0-9-_]/g, '-')
  const datePart = new Date().toISOString().slice(0, 10)
  const filename = `${safePrefix}-${datePart}.md`
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
  // #endif

  // #ifndef H5
  // 小程序环境：复制到剪贴板，提示用户粘贴保存
  uni.setClipboardData({
    data: content,
    success: () => {
      uni.showToast({
        title: 'Markdown 已复制到剪贴板',
        icon: 'none',
        duration: 3000,
      })
    },
  })
  // #endif
}
