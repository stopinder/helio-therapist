<template>
  <Teleport to="body">
    <div
      v-if="target && position"
      data-global-whisper-fallback
      class="fixed z-[80]"
      :style="{ top: position.top + 'px', left: position.left + 'px' }"
    >
      <WhisperMicButton
        :recording="dictation.recording.value"
        :transcribing="dictation.transcribing.value"
        label="Dictate into focused field"
        @toggle="toggle"
      />
    </div>
  </Teleport>
</template>

<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useWhisperDictation } from '../../composables/useWhisperDictation.js'
import WhisperMicButton from './WhisperMicButton.vue'

const target = ref(null)
const position = ref(null)

function hasLocalWhisperControl(element) {
  let node = element?.parentElement
  let depth = 0
  while (node && depth < 3) {
    if (node.querySelector?.('[data-whisper-control]')) return true
    node = node.parentElement
    depth += 1
  }
  return false
}

function isEligibleTextarea(element) {
  if (!(element instanceof HTMLTextAreaElement)) return false
  if (element.disabled || element.readOnly) return false
  if (element.dataset.noWhisper === 'true') return false
  if (hasLocalWhisperControl(element)) return false
  const rows = Number(element.getAttribute('rows') || 0)
  return rows >= 2 || element.clientHeight >= 56
}

function updatePosition() {
  if (!target.value?.isConnected) {
    target.value = null
    position.value = null
    return
  }
  const rect = target.value.getBoundingClientRect()
  const size = 32
  const inset = 8
  position.value = {
    top: Math.max(inset, Math.min(window.innerHeight - size - inset, rect.bottom - size - inset)),
    left: Math.max(inset, Math.min(window.innerWidth - size - inset, rect.right - size - inset))
  }
}

function handleFocusIn(event) {
  if (event.target?.closest?.('[data-global-whisper-fallback]')) return
  if (isEligibleTextarea(event.target)) {
    target.value = event.target
    dictation.resetError()
    nextTick(updatePosition)
    return
  }
  if (!dictation.busy.value) {
    target.value = null
    position.value = null
  }
}

function insertText(text) {
  const element = target.value
  if (!element?.isConnected) return
  const current = String(element.value || '')
  const start = Number.isFinite(element.selectionStart) ? element.selectionStart : current.length
  const end = Number.isFinite(element.selectionEnd) ? element.selectionEnd : start
  const prefix = current.slice(0, start)
  const suffix = current.slice(end)
  const spacer = prefix && !/[\s\n]$/.test(prefix) ? ' ' : ''
  const maxLength = Number(element.maxLength)
  let next = prefix + spacer + String(text || '').trim() + suffix
  if (maxLength > 0) next = next.slice(0, maxLength)
  element.value = next
  element.dispatchEvent(new Event('input', { bubbles: true }))
  const cursor = Math.min(next.length, prefix.length + spacer.length + String(text || '').trim().length)
  element.focus()
  element.setSelectionRange?.(cursor, cursor)
  nextTick(updatePosition)
}

const dictation = useWhisperDictation({ onText: insertText })

function toggle() {
  dictation.toggle()
}

function handleViewportChange() {
  if (target.value) updatePosition()
}

onMounted(() => {
  document.addEventListener('focusin', handleFocusIn, true)
  window.addEventListener('resize', handleViewportChange)
  window.addEventListener('scroll', handleViewportChange, true)
})

onBeforeUnmount(() => {
  document.removeEventListener('focusin', handleFocusIn, true)
  window.removeEventListener('resize', handleViewportChange)
  window.removeEventListener('scroll', handleViewportChange, true)
})
</script>
