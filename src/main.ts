import './style.css'
import { pipeline, RawImage } from '@huggingface/transformers'

const MODEL_ID = 'Xenova/vit-gpt2-image-captioning'
const CAPTURE_INTERVAL_MS = 2500

const app = document.querySelector<HTMLDivElement>('#app')!
app.innerHTML = `
  <div class="min-h-screen bg-gray-950 flex flex-col items-center justify-center gap-6 p-8">

    <div id="status" class="flex flex-col items-center gap-4 text-white">
      <div class="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
      <p id="status-text" class="text-xl font-semibold tracking-wide">Loading model…</p>
      <p id="status-sub" class="text-sm text-white/50">First run may take a moment (downloading weights)</p>
    </div>

    <div id="main-ui" class="hidden flex-col items-center gap-6 w-full max-w-4xl">

      <div class="relative rounded-2xl overflow-hidden shadow-2xl border border-white/10 w-full" style="aspect-ratio: 16/9;">
        <video id="webcam" autoplay playsinline muted class="w-full h-full object-cover" style="transform: scaleX(-1);"></video>
        <div id="model-badge" class="absolute top-4 right-4 z-10">
          <span class="bg-black/60 backdrop-blur-sm text-white/80 text-sm font-medium px-4 py-1.5 rounded-full border border-white/10">vit-gpt2 · WebGPU</span>
        </div>
      </div>

      <div class="bg-gray-900 backdrop-blur-md rounded-2xl px-8 py-5 border border-white/10 shadow-2xl w-full">
        <p id="caption" class="text-white text-3xl text-center font-bold tracking-wide leading-tight min-h-[2em] drop-shadow-lg">…</p>
      </div>

      <button id="toggle-btn" class="px-8 py-3 rounded-full text-lg font-semibold transition-all border focus:outline-none focus:ring-2 focus:ring-white/40
        bg-white text-gray-950 border-white hover:bg-gray-200 active:scale-95">
        Pause inference
      </button>

    </div>

  </div>
`

const videoEl = document.getElementById('webcam') as HTMLVideoElement
const statusEl = document.getElementById('status') as HTMLDivElement
const statusTextEl = document.getElementById('status-text') as HTMLParagraphElement
const statusSubEl = document.getElementById('status-sub') as HTMLParagraphElement
const mainUiEl = document.getElementById('main-ui') as HTMLDivElement
const captionEl = document.getElementById('caption') as HTMLParagraphElement
const toggleBtn = document.getElementById('toggle-btn') as HTMLButtonElement

const canvas = document.createElement('canvas')
const ctx = canvas.getContext('2d')!

let inferenceRunning = true
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let captioner: ((input: any) => Promise<any>) | null = null

toggleBtn.addEventListener('click', () => {
  inferenceRunning = !inferenceRunning
  if (inferenceRunning) {
    toggleBtn.textContent = 'Pause inference'
    toggleBtn.className = toggleBtn.className.replace('bg-gray-800 text-white border-white/20', 'bg-white text-gray-950 border-white hover:bg-gray-200')
    runCaption()
  } else {
    toggleBtn.textContent = 'Resume inference'
    toggleBtn.className = toggleBtn.className.replace('bg-white text-gray-950 border-white hover:bg-gray-200', 'bg-gray-800 text-white border-white/20')
  }
})

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
  // draw without mirror for inference (model sees real image)
  ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height)
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  return new RawImage(imageData.data, canvas.width, canvas.height, 4)
}

async function runCaption() {
  if (!inferenceRunning || !captioner) return
  try {
    const frame = captureFrame()
    const result = await captioner(frame) as Array<{ generated_text: string }>
    const text = result[0]?.generated_text ?? ''
    if (text) captionEl.textContent = text
  } catch (e) {
    console.error('Caption error:', e)
  }
  if (inferenceRunning) {
    setTimeout(runCaption, CAPTURE_INTERVAL_MS)
  }
}

async function main() {
  statusTextEl.textContent = 'Starting camera…'
  await startWebcam()

  statusTextEl.textContent = 'Loading AI model…'
  statusSubEl.textContent = 'Downloading model weights (~100 MB, one-time only)'

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  captioner = await pipeline('image-to-text', MODEL_ID, { device: 'webgpu' }) as any

  statusEl.classList.add('hidden')
  mainUiEl.classList.remove('hidden')
  mainUiEl.classList.add('flex')

  runCaption()
}

main().catch(err => {
  statusTextEl.textContent = 'Error: ' + (err as Error).message
  statusSubEl.textContent = 'Make sure your browser supports WebGPU (Chrome/Edge 113+).'
})
