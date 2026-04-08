import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: process.env.BASE_URL ?? '/',
  plugins: [
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        // model weights can exceed 100 MB
        maximumFileSizeToCacheInBytes: 500 * 1024 * 1024,
        globPatterns: ['**/*.{js,css,html,svg,ico,wasm}'],
        runtimeCaching: [
          {
            // HuggingFace model files (config, tokenizer, onnx weights)
            urlPattern: /^https:\/\/huggingface\.co\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'hf-models',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 24 * 60 * 60, // 60 days
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // HuggingFace LFS / CDN
            urlPattern: /^https:\/\/cdn-lfs.*\.huggingface\.co\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'hf-lfs',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 24 * 60 * 60,
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      manifest: {
        name: 'LiveCam AI',
        short_name: 'LiveCam AI',
        description: 'Real-time AI image captioning via webcam',
        theme_color: '#030712',
        background_color: '#030712',
        display: 'standalone',
        icons: [
          {
            src: 'favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
          },
        ],
      },
    }),
  ],
})
