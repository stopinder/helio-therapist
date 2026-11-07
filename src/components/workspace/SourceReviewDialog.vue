<template>
  <Teleport to="body">
    <div
      data-testid="source-review-overlay"
      class="fixed inset-0 z-[120] flex items-center justify-center bg-backdrop p-2 sm:p-5"
      @keydown="handleKeydown"
    >
      <section
        ref="dialogElement"
        data-testid="source-review-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="source-review-dialog-title"
        aria-describedby="source-review-dialog-description"
        tabindex="-1"
        class="flex max-h-[calc(100dvh-1rem)] w-full max-w-5xl flex-col overflow-hidden rounded-panel border border-border bg-surface-elevated shadow-overlay sm:max-h-[calc(100dvh-2rem)]"
      >
        <header class="flex shrink-0 items-start justify-between gap-3 border-b border-border-muted px-4 py-3 sm:px-5">
          <div class="min-w-0">
            <h2 id="source-review-dialog-title" class="text-h3 font-semibold text-ink">Review session source</h2>
            <p v-if="sourceLabel" class="mt-1 break-words text-body-sm text-ink-secondary">{{ sourceLabel }}</p>
            <p id="source-review-dialog-description" class="mt-1 text-caption text-ink-muted">
              Review the Zoom note first; open the original transcript only when needed. Nothing changes without your confirmation.
            </p>
          </div>
          <button ref="closeButton" type="button" class="min-h-10 shrink-0 rounded-control border border-border-muted px-3 text-body-sm font-medium text-ink-secondary hover:bg-surface-subtle" @click="requestClose">
            Close
          </button>
        </header>
        <div data-testid="source-review-scroll-area" class="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 sm:p-5">
          <SourceReviewPanel :key="transcriptId" :transcript-id="transcriptId" embedded @close="requestClose" @resolved="emit('resolved', $event)" />
        </div>
      </section>
    </div>
  </Teleport>
</template>

<script setup>
import { nextTick, onMounted, onUnmounted, ref } from 'vue'
import SourceReviewPanel from './SourceReviewPanel.vue'

defineProps({
  transcriptId: { type: String, required: true },
  sourceLabel: { type: String, default: '' }
})
const emit = defineEmits(['close', 'resolved'])
const dialogElement = ref(null)
const closeButton = ref(null)
let previousFocus = null
let previousOverflow = ''

function requestClose() { emit('close') }
function handleKeydown(event) {
  if (event.key === 'Escape') {
    event.preventDefault()
    event.stopPropagation()
    requestClose()
    return
  }
  if (event.key !== 'Tab' || !dialogElement.value) return
  const focusable = [...dialogElement.value.querySelectorAll(
    'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'
  )].filter(element => element.getClientRects().length > 0)
  if (!focusable.length) { event.preventDefault(); dialogElement.value.focus(); return }
  const first = focusable[0], last = focusable.at(-1)
  if (event.shiftKey && (document.activeElement === first || document.activeElement === dialogElement.value)) {
    event.preventDefault(); last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault(); first.focus()
  }
}
onMounted(async () => {
  previousFocus = document.activeElement
  previousOverflow = document.body.style.overflow
  document.body.style.overflow = 'hidden'
  await nextTick()
  closeButton.value?.focus()
})
onUnmounted(() => {
  document.body.style.overflow = previousOverflow
  const target = previousFocus
  void nextTick(() => {
    if (target?.isConnected && typeof target.focus === 'function') target.focus({ preventScroll: true })
  })
})
</script>
