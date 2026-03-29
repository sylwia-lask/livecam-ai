# LiveCam AI

Real-time webcam image captioning running entirely in the browser — no server, no API calls.

## How it works

Captures a frame from your webcam every 2.5 seconds and runs it through [Xenova/vit-gpt2-image-captioning](https://huggingface.co/Xenova/vit-gpt2-image-captioning), a ViT encoder + GPT-2 decoder model converted to ONNX. Inference runs locally via [Transformers.js](https://huggingface.co/docs/transformers.js) on **WebGPU** — heavy ops (matmul, attention) run on GPU, shape-related ops fall back to WASM/CPU automatically.

## Stack

- [Vite](https://vite.dev/) + TypeScript
- [Tailwind CSS v4](https://tailwindcss.com/)
- [Transformers.js v3](https://huggingface.co/docs/transformers.js)
- Model: [Xenova/vit-gpt2-image-captioning](https://huggingface.co/Xenova/vit-gpt2-image-captioning)
- Device: WebGPU (with WASM fallback for shape ops)

## Requirements

A WebGPU-capable browser — Chrome or Edge 113+. Firefox does not support WebGPU by default.

## Getting started

```bash
npm install
npm run dev
```

On first run the model weights are downloaded from Hugging Face and cached in the browser. Subsequent loads are instant.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
