<template>
  <section aria-labelledby="measures-heading" class="space-y-stack-lg">
    <div class="flex flex-col md:flex-row md:items-end justify-between gap-stack-md border-b border-border pb-stack-md">
      <div>
        <h2 id="measures-heading" class="text-h2 font-semibold text-ink">Measures</h2>
        <p class="text-body-sm text-ink-secondary mt-1">Outcome-measure results recorded for this client over time.</p>
      </div>
      <button v-if="!archived" type="button" class="min-h-[2.75rem] px-inline-md py-stack-xs border border-border bg-surface-elevated text-body-sm font-medium text-ink rounded-control hover:bg-surface-subtle" @click="pickerOpen = true">Send measure</button>
    </div>

    <p v-if="loading" class="text-body-sm text-ink-muted py-stack-lg" aria-live="polite">Loading measures…</p>
    <div v-else-if="error" class="rounded-panel border border-state-danger/20 bg-surface-elevated p-inline-lg py-stack-md">
      <p class="text-body-sm text-state-danger">{{ error }}</p>
      <button type="button" class="text-body-sm text-action-link font-medium mt-stack-sm hover:underline" @click="load">Try again</button>
    </div>
    <div v-else-if="!measures.length" class="border-y border-border py-stack-xl text-center">
      <p class="text-body text-ink-secondary">No outcome-measure results have been recorded for this client yet.</p>
      <p class="text-body-sm text-ink-muted mt-stack-sm">Completed measures will appear here as a chronological history.</p>
    </div>

    <div v-else class="space-y-stack-lg">
      <article v-for="measure in measures" :key="measure.resourceId" class="bg-surface-elevated border border-border-muted rounded-panel p-inline-lg py-stack-lg">
        <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-stack-md">
          <div>
            <p class="text-caption uppercase tracking-wide text-ink-muted">Outcome measure</p>
            <h3 class="text-h3 font-semibold text-ink mt-1">{{ measure.title }}</h3>
            <p class="text-body-sm text-ink-secondary mt-1">{{ measure.results.length }} completed {{ measure.results.length === 1 ? 'result' : 'results' }}</p>
          </div>
          <div class="sm:text-right">
            <span class="text-caption text-ink-muted block">Latest result</span>
            <strong class="text-h2 text-ink">{{ scoreLabel(measure.results[0].scores) }}</strong>
            <span class="text-caption text-ink-muted block mt-1">{{ formatDate(measure.results[0].completedAt) }}</span>
          </div>
        </div>

        <div class="mt-stack-lg border-t border-border-muted">
          <div v-for="(result, index) in measure.results" :key="result.id" class="grid grid-cols-[minmax(0,1fr)_auto] gap-inline-md items-center py-stack-sm" :class="{ 'border-b border-border-muted': index < measure.results.length - 1 }">
            <div>
              <p class="text-body-sm font-medium text-ink">{{ formatDate(result.completedAt) }}</p>
              <p v-if="result.calculationVersion" class="text-caption text-ink-muted mt-0.5">Scoring: {{ result.calculationVersion }}</p>
            </div>
            <strong class="text-body text-ink tabular-nums">{{ scoreLabel(result.scores) }}</strong>
          </div>
        </div>
      </article>
    </div>

    <ResourcePicker v-if="pickerOpen" :client="client" @close="pickerOpen = false" @sent="handleSent" />
  </section>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { listClientMeasureHistory } from '../../lib/clientMeasures.js'
import ResourcePicker from '../tools/ResourcePicker.vue'

const props = defineProps({
  client: { type: Object, required: true }
})

const measures = ref([])
const loading = ref(false)
const error = ref('')
const pickerOpen = ref(false)
const archived = props.client?.archived === true

async function load() {
  loading.value = true
  error.value = ''
  try {
    measures.value = await listClientMeasureHistory(props.client.id)
  } catch (cause) {
    error.value = cause?.message || 'Measures could not be loaded.'
  } finally {
    loading.value = false
  }
}

function handleSent() {
  pickerOpen.value = false
  load()
}

function scoreLabel(scores) {
  if (Number.isFinite(Number(scores?.total))) return String(Number(scores.total))
  const values = Object.entries(scores || {}).filter(([, value]) => ['string', 'number'].includes(typeof value))
  if (values.length === 1) return String(values[0][1])
  return 'Recorded'
}

function formatDate(value) {
  if (!value) return ''
  return new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

onMounted(load)
</script>
