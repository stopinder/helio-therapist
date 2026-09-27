<template>
  <Teleport to="body">
    <dialog ref="dialog" aria-labelledby="context-help-heading" class="help-dialog border-l border-border bg-surface-canvas text-ink shadow-overlay" @cancel.prevent="closeHelp" @close="closeHelp" @keydown.stop>
      <header class="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-border-muted bg-surface-elevated px-5 py-3">
        <div>
          <h2 id="context-help-heading" class="text-lg font-semibold">Help with Helios</h2>
          <p class="mt-0.5 text-xs text-ink-muted">Close Help to return to your work.</p>
        </div>
        <button type="button" autofocus aria-label="Close Help" class="flex min-h-touch min-w-11 items-center justify-center rounded-control border border-border text-ink-secondary hover:bg-surface-muted focus-visible:outline focus-visible:outline-2" @click="closeHelp"><X class="h-5 w-5" aria-hidden="true" /></button>
      </header>
      <HelpBrowser v-if="isHelpOpen" :article-id="helpTopic" compact @select="selectedTopic = $event" />
      <div class="border-t border-border-muted px-6 py-4">
        <a :href="selectedTopic ? `/help/${selectedTopic}` : '/help'" target="_blank" rel="noopener noreferrer" class="inline-flex min-h-touch items-center text-sm font-semibold text-action-link underline underline-offset-4">Open Help in a new tab</a>
      </div>
    </dialog>
  </Teleport>
</template>
<script setup>
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { X } from '@lucide/vue'
import HelpBrowser from './HelpBrowser.vue'
import { useHelp } from '../../composables/useHelp.js'
const { isHelpOpen, helpTopic, closeHelp } = useHelp()
const dialog = ref(null)
const selectedTopic = ref(null)
let opener = null
watch(isHelpOpen, async open => {
  if (open) {
    opener = document.activeElement
    selectedTopic.value = helpTopic.value
    await nextTick()
    if (isHelpOpen.value && dialog.value && !dialog.value.open) dialog.value.showModal()
  } else {
    if (dialog.value?.open) dialog.value.close()
    if (opener?.isConnected) opener.focus({ preventScroll: true })
    opener = null
  }
}, { flush: 'post' })
onBeforeUnmount(() => {
  dialog.value?.close()
  closeHelp()
})
</script>
<style scoped>
.help-dialog {
  position: fixed;
  inset: 0 0 0 auto;
  margin: 0;
  padding: 0;
  width: min(42rem, 100vw);
  height: 100dvh;
  max-width: 100vw;
  max-height: 100dvh;
  overflow-y: auto;
  overscroll-behavior: contain;
}
.help-dialog::backdrop { background: rgb(6 30 41 / 28%); }
</style>
