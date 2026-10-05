<template>
  <section aria-labelledby="resources-heading" class="space-y-stack-lg">
    <div class="flex flex-col md:flex-row md:items-end justify-between gap-stack-md border-b border-border pb-stack-md">
      <div>
        <h2 id="resources-heading" class="text-h2 font-semibold text-ink">Resources</h2>
        <p class="text-body-sm text-ink-secondary mt-1">Materials and activities sent to this client.</p>
      </div>
      <button v-if="!archived" type="button" class="min-h-[2.75rem] px-inline-md py-stack-xs border border-border bg-surface-elevated text-body-sm font-medium text-ink rounded-control hover:bg-surface-subtle" @click="pickerOpen = true">Send resource</button>
    </div>

    <p v-if="loading" class="text-body-sm text-ink-muted py-stack-lg" aria-live="polite">Loading resources…</p>
    <div v-else-if="error" class="rounded-panel border border-state-danger/20 bg-surface-elevated p-inline-lg py-stack-md">
      <p class="text-body-sm text-state-danger">{{ error }}</p>
      <button type="button" class="text-body-sm text-action-link font-medium mt-stack-sm hover:underline" @click="load">Try again</button>
    </div>
    <div v-else-if="!groups.active.length && !groups.completed.length" class="border-y border-border py-stack-xl text-center">
      <p class="text-body text-ink-secondary">No resources have been sent to this client yet.</p>
    </div>

    <div v-else class="space-y-stack-xl">
      <section v-if="groups.active.length" aria-labelledby="active-resources-heading">
        <h3 id="active-resources-heading" class="text-caption uppercase tracking-wide text-ink-muted mb-stack-md">Active</h3>
        <div class="space-y-stack-sm">
          <article v-for="item in groups.active" :key="item.id" class="bg-surface-elevated border border-border-muted rounded-panel p-inline-md py-stack-md flex items-start justify-between gap-inline-md">
            <div>
              <p class="text-body font-medium text-ink">{{ item.title }}</p>
              <div class="flex flex-wrap gap-x-inline-sm gap-y-1 mt-1">
                <span class="text-caption text-ink-muted">{{ typeLabel(item.kind) }}</span>
                <span class="text-caption text-ink-muted">• Sent {{ formatDate(item.sentAt) }}</span>
                <span v-if="item.dueAt" class="text-caption text-ink-muted">• Due {{ formatDate(item.dueAt) }}</span>
              </div>
            </div>
            <div class="text-right shrink-0">
              <StatusBadge :status="item.status" :label="item.statusLabel" />
            </div>
          </article>
        </div>
      </section>

      <section v-if="groups.completed.length" aria-labelledby="completed-resources-heading">
        <h3 id="completed-resources-heading" class="text-caption uppercase tracking-wide text-ink-muted mb-stack-md">Completed</h3>
        <div class="space-y-stack-sm">
          <article v-for="item in groups.completed" :key="item.id" class="bg-surface-elevated border border-border-muted rounded-panel p-inline-md py-stack-md flex items-start justify-between gap-inline-md">
            <div>
              <p class="text-body font-medium text-ink">{{ item.title }}</p>
              <div class="flex flex-wrap gap-x-inline-sm gap-y-1 mt-1">
                <span class="text-caption text-ink-muted">{{ typeLabel(item.kind) }}</span>
                <span v-if="item.reviewedAt" class="text-caption text-ink-muted">• Reviewed {{ formatDate(item.reviewedAt) }}</span>
                <span v-else-if="item.completedAt" class="text-caption text-ink-muted">• Completed {{ formatDate(item.completedAt) }}</span>
                <span class="text-caption text-ink-muted">• Sent {{ formatDate(item.sentAt) }}</span>
              </div>
            </div>
            <div class="text-right shrink-0">
              <StatusBadge :status="item.status === 'reviewed' || item.status === 'completed' ? 'success' : item.status" :label="item.statusLabel" />
            </div>
          </article>
        </div>
      </section>
    </div>

    <ResourcePicker v-if="pickerOpen" :client="client" @close="pickerOpen = false" @sent="handleSent" />
    <div v-if="deliveryLinks.length" class="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" @click.self="deliveryLinks = []; deliveryMailto = ''">
      <article class="w-full max-w-xl rounded-panel border border-border bg-surface-elevated p-inline-lg py-stack-lg shadow-xl" role="dialog" aria-modal="true" aria-labelledby="resource-delivery-title">
        <p class="text-caption uppercase tracking-wide text-ink-muted">Ready to send</p>
        <h3 id="resource-delivery-title" class="text-h3 font-semibold text-ink mt-1">Copy the secure link</h3>
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
import { listClientResources } from '../../lib/clientResources.js'
import { buildResourceDelivery } from '../../lib/resourceDelivery.js'
import ResourcePicker from '../tools/ResourcePicker.vue'
import StatusBadge from './StatusBadge.vue'

const props = defineProps({
  client: { type: Object, required: true }
})

const groups = ref({ active: [], completed: [] })
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
    groups.value = await listClientResources(props.client.id)
  } catch (cause) {
    error.value = cause?.message || 'Resources could not be loaded.'
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

function typeLabel(kind) {
  return ({
    worksheet: 'Worksheet',
    thought_record: 'Thought record',
    behavioural_experiment: 'Behavioural experiment',
    sleep_diary: 'Sleep diary',
    psychoeducation: 'Psychoeducation',
    diagnostic_tool: 'Diagnostic tool',
    outcome_measure: 'Outcome measure',
    therapist_resource: 'Therapist resource',
    document: 'Document'
  })[kind] || 'Resource'
}

function formatDate(value) {
  if (!value) return ''
  return new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

onMounted(load)
</script>
