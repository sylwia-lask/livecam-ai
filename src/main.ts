import './style.css'
import { pipeline, RawImage } from '@huggingface/transformers'

const MODEL_ID = 'Xenova/vit-gpt2-image-captioning'
const CAPTURE_INTERVAL_MS = 2500

const app = document.querySelector<HTMLDivElement>('#app')!
app.innerHTML = `
  <div class="relative w-full h-screen bg-black flex items-center justify-center overflow-hidden">
    <video id="webcam" autoplay playsinline muted class="w-full h-full object-cover"></video>

    <div id="status" class="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-white gap-4 z-10">
      <div class="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
      <p id="status-text" class="text-xl font-semibold tracking-wide">Loading model…</p>
      <p id="status-sub" class="text-sm text-white/50">First run may take a moment (downloading weights)</p>
    </div>

    <div id="caption-bar" class="absolute bottom-16 left-8 right-8 hidden z-20">
      <div class="bg-black/75 backdrop-blur-md rounded-2xl px-8 py-5 border border-white/10 shadow-2xl">
        <p id="caption" class="text-white text-3xl text-center font-bold tracking-wide leading-tight min-h-[2em] drop-shadow-lg"></p>
      </div>
    </div>

    <div id="model-badge" class="absolute top-5 right-5 hidden z-20">
      <span class="bg-black/60 backdrop-blur-sm text-white/80 text-sm font-medium px-4 py-1.5 rounded-full border border-white/10">vit-gpt2 · WebGPU</span>
    </div>
  </div>
`

const videoEl = document.getElementById('webcam') as HTMLVideoElement
const statusEl = document.getElementById('status') as HTMLDivElement
const statusTextEl = document.getElementById('status-text') as HTMLParagraphElement
const statusSubEl = document.getElementById('status-sub') as HTMLParagraphElement
const captionBarEl = document.getElementById('caption-bar') as HTMLDivElement
const captionEl = document.getElementById('caption') as HTMLParagraphElement
const modelBadgeEl = document.getElementById('model-badge') as HTMLDivElement

const canvas = document.createElement('canvas')
const ctx = canvas.getContext('2d')!

async function startWebcam() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false })
    videoEl.srcObject = stream
    await new Promise<void>(resolve => { videoEl.onloadedmetadata = () => resolve() })
  } catch {
    statusTextEl.textContent = 'Camera access denied'
    statusSubEl.textContent = 'Please allow camera permissions in your browser.'
    throw new Error('No webcam access')
  }
}

function captureFrame(): RawImage {
  canvas.width = videoEl.videoWidth || 640
  canvas.height = videoEl.videoHeight || 480
  ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height)
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  return new RawImage(imageData.data, canvas.width, canvas.height, 4)
}

async function main() {
  statusTextEl.textContent = 'Starting camera…'
  await startWebcam()

  statusTextEl.textContent = 'Loading AI model…'
  statusSubEl.textContent = 'Downloading model weights (~100 MB, one-time only)'

  const captioner = await pipeline('image-to-text', MODEL_ID, { device: 'webgpu' })

  statusEl.classList.add('hidden')
  captionBarEl.classList.remove('hidden')
  modelBadgeEl.classList.remove('hidden')
  captionEl.textContent = '…'

  async function runCaption() {
    try {
      const frame = captureFrame()
      const result = await captioner(frame) as Array<{ generated_text: string }>
      const text = result[0]?.generated_text ?? ''
      if (text) captionEl.textContent = text
    } catch (e) {
      console.error('Caption error:', e)
    }
    setTimeout(runCaption, CAPTURE_INTERVAL_MS)
  }

  runCaption()
}

main().catch(err => {
  statusTextEl.textContent = 'Error: ' + (err as Error).message
  statusSubEl.textContent = 'Make sure your browser supports WebGPU (Chrome/Edge 113+).'
})
