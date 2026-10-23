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
    <div v-if="deliveryLinks.length" class="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" @click.self="deliveryLinks = []; deliveryMailto = ''">
      <article class="w-full max-w-xl rounded-panel border border-border bg-surface-elevated p-inline-lg py-stack-lg shadow-xl" role="dialog" aria-modal="true" aria-labelledby="measure-delivery-title">
        <p class="text-caption uppercase tracking-wide text-ink-muted">Ready to send</p>
        <h3 id="measure-delivery-title" class="text-h3 font-semibold text-ink mt-1">Copy the secure link</h3>
        <p v-if="deliveryMailto" class="text-body-sm text-ink-secondary mt-2">Your email draft is ready. Open it without leaving Helios, or copy the secure link instead.</p>
        <p v-else class="text-body-sm text-ink-secondary mt-2">No email address is saved for {{ client.name }}. Copy the link and send it using your usual contact method.</p>
        <label v-for="item in deliveryLinks" :key="item.url" class="block mt-stack-md text-body-sm font-medium text-ink">
          {{ item.title }}
          <input class="mt-1 w-full rounded-control border border-border bg-surface px-3 py-2 text-body-sm" readonly :value="item.url" @focus="$event.target.select()" />
        </label>
        <div class="mt-stack-lg flex flex-wrap justify-end gap-inline-sm">
          <button type="button" class="min-h-[2.75rem] px-inline-md py-stack-xs border border-border rounded-control" @click="deliveryLinks = []; deliveryMailto = ''">Close</button>
          <button type="button" class="min-h-[2.75rem] px-inline-md py-stack-xs border border-border rounded-control" @click="copyLinks">{{ copyLabel }}</button>
          <a v-if="deliveryMailto" :href="deliveryMailto" target="_blank" rel="noopener" class="min-h-[2.75rem] inline-flex items-center px-inline-md py-stack-xs rounded-control bg-action-primary text-on-action font-medium">Open email</a>
        </div>
      </article>
    </div>
  </section>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { listClientMeasureHistory } from '../../lib/clientMeasures.js'
import { buildResourceDelivery } from '../../lib/resourceDelivery.js'
import ResourcePicker from '../tools/ResourcePicker.vue'

const props = defineProps({
  client: { type: Object, required: true }
})

const measures = ref([])
const loading = ref(false)
const error = ref('')
const pickerOpen = ref(false)
const deliveryLinks = ref([])
const deliveryMailto = ref('')
const copyLabel = ref('Copy link')
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

async function handleSent(payload = {}) {
  pickerOpen.value = false
  const delivery = buildResourceDelivery({ ...payload, client: props.client, origin: window.location.origin })
  deliveryLinks.value = delivery.links
  deliveryMailto.value = delivery.mailto
  await load()
}

async function copyLinks() {
  try {
    await navigator.clipboard.writeText(deliveryLinks.value.map(item => `${item.title}: ${item.url}`).join('\n'))
    copyLabel.value = 'Copied'
    setTimeout(() => { copyLabel.value = 'Copy link' }, 1600)
  } catch {
    copyLabel.value = 'Select and copy'
  }
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
