import { computed, onBeforeUnmount, ref } from 'vue'
import { authenticatedFetch } from '../lib/api.js'

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

export function appendDictation(current, addition, separator = ' ') {
  const base = String(current || '').trimEnd()
  const text = String(addition || '').trim()
  if (!text) return base
  return base ? `${base}${separator}${text}` : text
}

export function useWhisperDictation({ onText, maxSeconds = 120 } = {}) {
  const recording = ref(false)
  const transcribing = ref(false)
  const seconds = ref(0)
  const error = ref('')
  const busy = computed(() => recording.value || transcribing.value)

  let recorder = null
  let stream = null
  let chunks = []
  let timer = 0
  let context = null
  let disposed = false

  function clearTimer() {
    window.clearInterval(timer)
    timer = 0
  }

  function releaseStream() {
    stream?.getTracks().forEach(track => track.stop())
    stream = null
  }

  function resetError() {
    error.value = ''
  }

  async function transcribe(blob, activeContext) {
    if (!blob.size || disposed) return
    transcribing.value = true
    try {
      const response = await authenticatedFetch('/api/ai/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audio: await blobToDataUrl(blob) })
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload?.error?.message || payload?.error || 'The recording could not be transcribed.')
      const text = String(payload?.text || '').trim()
      if (text && !disposed) await onText?.(text, activeContext)
    } catch (err) {
      if (!disposed) error.value = err.message || 'The recording could not be transcribed.'
    } finally {
      if (!disposed) transcribing.value = false
    }
  }

  async function start(nextContext = null) {
    if (busy.value || disposed) return
    error.value = ''
    context = nextContext
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      chunks = []
      recorder = new MediaRecorder(stream)
      recorder.ondataavailable = event => {
        if (event.data.size) chunks.push(event.data)
      }
      recorder.onstop = () => {
        const activeContext = context
        const blob = new Blob(chunks, { type: recorder?.mimeType || 'audio/webm' })
        releaseStream()
        transcribe(blob, activeContext)
      }
      recorder.start()
      recording.value = true
      seconds.value = 0
      timer = window.setInterval(() => {
        seconds.value += 1
        if (seconds.value >= maxSeconds) stop()
      }, 1000)
    } catch {
      releaseStream()
      error.value = 'Microphone access was unavailable. You can continue by typing.'
    }
  }

  function stop() {
    if (!recording.value || !recorder) return
    clearTimer()
    recording.value = false
    if (recorder.state !== 'inactive') recorder.stop()
  }

  function toggle(nextContext = null) {
    if (recording.value) stop()
    else if (!transcribing.value) start(nextContext)
  }

  onBeforeUnmount(() => {
    disposed = true
    clearTimer()
    if (recorder?.state && recorder.state !== 'inactive') {
      recorder.onstop = null
      recorder.stop()
    }
    releaseStream()
  })

  return { recording, transcribing, seconds, error, busy, start, stop, toggle, resetError }
}
