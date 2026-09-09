<template>
  <dialog ref="dialog" class="exercise-dialog" aria-labelledby="exercise-detail-title" @cancel.prevent="$emit('close')" @click="closeOnBackdrop">
    <header>
      <div><p class="context">Private CPD reflection</p><h2 id="exercise-detail-title">Your therapeutic stance</h2></div>
      <button type="button" class="button-secondary" autofocus @click="$emit('close')">Close</button>
    </header>
    <div class="reading">
      <p class="source-note">This is an authored reflection from selected hypothetical scenarios, not a therapist-authored observation of practice. Its original responses and interpretation are retained separately. Saving has not run AI analysis.</p>
      <p class="reflection-body" data-testid="saved-exercise-text">{{ reflection.body }}</p>
      <details v-if="snapshot">
        <summary>Original selected responses and provenance</summary>
        <p>Completed {{ snapshot.completedAt }}. {{ snapshot.questionVersion }} · {{ snapshot.scoringVersion }} · {{ snapshot.interpretationVersion }}.</p>
        <section v-for="item in snapshot.interpretation?.evidence || []" :key="item.id"><h3>{{ item.scenario }}</h3><p>{{ item.selectedApproach }}</p></section>
        <p>Some responses may have no usual choice. These are missing evidence, not a neutral score.</p>
      </details>
      <p class="source-note">The future continuity engine will need to distinguish these responses from generated wording and from your own observations. This entry does not add automatic findings to Map or measure professional growth.</p>
    </div>
  </dialog>
</template>
<script setup>
import { computed, onMounted, onBeforeUnmount, ref } from 'vue'
const props = defineProps({ reflection: { type: Object, required: true } })
const emit = defineEmits(['close'])
const dialog = ref(null)
const snapshot = computed(() => props.reflection.workspace_content?.stanceSnapshot)
let previousFocus
function closeOnBackdrop(event) { if (event.target === dialog.value) emit('close') }
onMounted(() => { previousFocus = document.activeElement; dialog.value.showModal() })
onBeforeUnmount(() => { dialog.value?.close(); if (previousFocus?.isConnected) previousFocus.focus() })
</script>
<style scoped>
.exercise-dialog { width: min(760px, calc(100vw - 32px)); max-height: 90dvh; border: 1px solid var(--border-muted); border-radius: var(--radius-panel); padding: 0; color: var(--text-primary); background: var(--surface-canvas); }
.exercise-dialog::backdrop { background: rgb(6 30 41 / .5); }
header { display: flex; justify-content: space-between; gap: 20px; align-items: flex-start; padding: 22px; border-bottom: 1px solid var(--border-muted); }
h2 { font: 500 26px/1.3 var(--font-editorial, Georgia, serif); }
.context { font-size: 13px; color: var(--accent); margin-bottom: 8px; }
.reading { padding: 24px; }
.reflection-body { white-space: pre-wrap; overflow-wrap: anywhere; line-height: 1.85; font-size: 16px; }
.source-note { background: var(--surface-reflection); padding: 16px; font-size: 14px; margin-bottom: 24px; }
details { border-block: 1px solid var(--border-muted); padding: 18px 0; margin: 24px 0; }
summary { cursor: pointer; color: var(--accent); } details p { margin: 14px 0; } h3 { margin-top: 20px; font-weight: 600; }
</style>
