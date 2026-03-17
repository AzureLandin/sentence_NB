# English Sentence Notebook (v1.0)

An AI-powered web app for collecting, analyzing, and reviewing complex English sentences.

## Features

- Text input and sentence analysis
- Photo input with OCR sentence extraction
- Multi-select batch analysis with progress and failure retry
- Collection management with search, tags, and sorting
- API settings for multiple providers (OpenAI/Qwen/Claude/Custom)
- Data import/export (JSON)
- Markdown export for analyzed sentences

## Tech Stack

- Vue 3 + Vite
- Pinia
- Vue Router
- TailwindCSS
- IndexedDB + LocalStorage

## Getting Started

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Notes

- OCR and analysis depend on your configured AI API endpoint and key.
- Sentence/image data is stored locally in your browser.
