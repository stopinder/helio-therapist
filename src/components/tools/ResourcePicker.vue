<template>
  <div class="modal-backdrop" @mousedown.self="close">
    <article ref="dialog" class="resource-dialog" role="dialog" aria-modal="true" aria-labelledby="resource-picker-title" @keydown.esc.prevent="!sending && close" @keydown.tab="trapFocus">
      <header class="resource-dialog__header"><div><p class="eyebrow">{{ client.name }}</p><h2 id="resource-picker-title">Send to client</h2><p>Choose one or more items, then add an instruction or due date if useful.</p></div><button ref="closeButton" type="button" class="close" aria-label="Close send to client" :disabled="sending" @click="close">×</button></header>
      <div class="resource-dialog__body">
        <p v-if="error" class="exchange-error" role="alert">{{ error }}</p>
        <label class="search-label">Find something to send<input ref="searchInput" v-model="query" placeholder="Search resources, measures, questionnaires and documents" @input="scheduleSearch" /></label>
        <p v-if="searchStatus === 'loading'" class="empty-inline" aria-live="polite">Searching…</p>
        <p v-else-if="searchStatus === 'error'" class="exchange-error" role="alert">Items could not be loaded. <button type="button" class="link-button" @click="loadResources">Retry</button></p>
        <p v-else-if="searchStatus === 'empty'" class="empty-inline">No matching items found.</p>
        <template v-else>
          <section v-for="group in visibleGroups" :key="group.id" class="picker-group"><h3>{{ group.label }}</h3>
            <button v-for="item in group.items" :key="item.key" type="button" class="resource-choice" :class="{ chosen: draft.hasItem(item.key) }" :aria-pressed="draft.hasItem(item.key)" @click="toggleItem(item)"><span><strong>{{ item.title }}</strong><small>{{ typeLabel(item.type) }} · {{ completionModeLabel(item.completionMode) }}</small></span><span>{{ draft.hasItem(item.key) ? '✓ Selected' : 'Select' }}</span></button>
          </section>
        </template>
        <button v-if="!resources.some(item => item.title === 'PHQ-9')" type="button" class="add-template" :disabled="creating" @click="createPhq9">{{ creating ? 'Adding…' : 'Add PHQ-9 to library' }}</button>
        <ReusableResourceCreator @created="handleResourceCreated" />
        <section class="selected-resources" aria-labelledby="selected-resources-title"><div class="selected-resources-heading"><h3 id="selected-resources-title">Selected resources</h3><span>{{ draft.selectedCount ? `${draft.selectedCount} selected` : 'No items selected' }}</span></div>
          <p v-if="!draft.selectedCount" class="empty-inline">Select one or more items above to configure the request.</p>
          <template v-else><ul><li v-for="item in draft.items.value" :key="item.key"><span><strong>{{ item.title }}</strong><small>{{ typeLabel(item.type) }}</small></span><button type="button" class="remove-resource" :aria-label="`Remove ${item.title}`" @click="draft.removeItem(item.key)">Remove</button></li></ul>
          <label>Optional instruction<textarea :value="draft.instruction.value" :disabled="sending" placeholder="What would you like the client to do with these items?" @input="draft.setInstruction($event.target.value)" /></label><label>Optional due date<input :value="draft.dueDate.value || ''" :disabled="sending" type="date" @input="draft.setDueDate($event.target.value)" /></label></template>
        </section>
      </div>
      <footer><button type="button" class="secondary" :disabled="sending" @click="close">Cancel</button><button type="button" class="primary" :disabled="!draft.selectedCount || !client?.id || sending" @click="send">{{ sending ? 'Sending…' : 'Send to client' }}</button></footer>
    </article>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { authenticatedFetch } from '../../lib/api.js'
import { completionModeLabel } from '../../lib/clinicalExchange.js'
import { useClientRequestDraft } from '../../composables/useClientRequestDraft.js'
import ReusableResourceCreator from './ReusableResourceCreator.vue'

const props = defineProps({ client: { type: Object, required: true } })
const emit = defineEmits(['close', 'sent'])
const dialog = ref(null), searchInput = ref(null), resources = ref([]), query = ref(''), searchStatus = ref('idle'), sending = ref(false), creating = ref(false), error = ref('')
const draft = useClientRequestDraft(props.client.id)
let debounceTimer, requestNumber = 0
const groupLabels = { outcome_measure: 'Outcome measures', worksheet: 'CBT worksheets', psychoeducation: 'Psychoeducation', sleep_diary: 'Sleep resources', behavioural_experiment: 'Behavioural experiments', document: 'Documents', general: 'My custom resources' }
const typeLabel = type => ({ outcome_measure: 'Outcome measure', questionnaire: 'Questionnaire', document: 'Document', resource: 'Resource' })[type] || 'Resource'
const visibleGroups = computed(() => {
  const groups = new Map()
  for (const item of resources.value.filter(item => item.canSendToClient && item.audience !== 'therapist')) {
    const id = item.category || 'general'; if (!groups.has(id)) groups.set(id, { id, label: groupLabels[id] || id.replace(/_/g, ' '), items: [], order: groups.size })
    groups.get(id).items.push(item)
  }
  return [...groups.values()].filter(group => group.items.length).sort((a, b) => a.order - b.order)
})
async function responseJson(response) { const data = await response.json().catch(() => ({})); if (!response.ok) throw new Error(data.error || 'Something went wrong.'); return data }
function scheduleSearch() { clearTimeout(debounceTimer); debounceTimer = setTimeout(loadResources, 250) }
async function loadResources() { const thisRequest = ++requestNumber; searchStatus.value = 'loading'; error.value = ''; try { const data = await responseJson(await authenticatedFetch(`/api/resources?q=${encodeURIComponent(query.value)}`)); if (thisRequest !== requestNumber) return; resources.value = data.resources || []; searchStatus.value = resources.value.length ? 'success' : 'empty' } catch (cause) { if (thisRequest === requestNumber) { searchStatus.value = 'error'; error.value = cause.message } } }
function toggleItem(item) { draft.hasItem(item.key) ? draft.removeItem(item.key) : draft.addItem(item) }
async function createPhq9() { creating.value = true; error.value = ''; try { handleResourceCreated((await responseJson(await authenticatedFetch('/api/resources', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ template: 'phq9' }) }))).resource) } catch (cause) { error.value = cause.message } finally { creating.value = false } }
function handleResourceCreated(item) { resources.value = [item, ...resources.value.filter(existing => existing.key !== item.key)]; draft.addItem(item); searchStatus.value = 'success' }
function close() { if (!sending.value) emit('close') }
function trapFocus(event) { const focusable = [...dialog.value.querySelectorAll('button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])')]; const first = focusable[0], last = focusable.at(-1); if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() } else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() } }
async function send() { if (!draft.selectedCount) return; sending.value = true; error.value = ''; const key = crypto.randomUUID(); try { const sent = await responseJson(await authenticatedFetch('/api/resource-assignments', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': key }, body: JSON.stringify({ clientId: props.client.id, resourceVersionIds: draft.items.value.map(item => item.version.id), instruction: draft.instruction.value, dueAt: draft.dueDate.value, idempotencyKey: key }) })); emit('sent', { request: sent.request, assignments: sent.assignments, clientAccessTokens: sent.clientAccessTokens }); draft.reset(); emit('close') } catch (cause) { error.value = cause.message } finally { sending.value = false } }
onMounted(async () => { await nextTick(); searchInput.value?.focus(); loadResources() })
onBeforeUnmount(() => clearTimeout(debounceTimer))
</script>

<style scoped>
.resource-dialog{display:flex;flex-direction:column;width:min(42rem,100%);max-height:min(90vh,900px);background:#fff;border-radius:1rem;box-shadow:0 20px 60px #0004}.resource-dialog__header,.resource-dialog footer{flex:0 0 auto;padding:1.3rem}.resource-dialog__header{display:flex;justify-content:space-between;gap:1rem;align-items:flex-start;border-bottom:1px solid #edf0f4}.resource-dialog__body{overflow-y:auto;min-height:0;padding:0 1.3rem}.resource-dialog h2{margin:.1rem 0}.resource-dialog header p:not(.eyebrow){margin:.4rem 0 0;color:#64748b;font-size:.88rem;line-height:1.4}.resource-dialog label{display:block;margin:.8rem 0;font-size:.85rem;font-weight:700;color:#334155}.resource-dialog input,.resource-dialog select,.resource-dialog textarea{box-sizing:border-box;width:100%;margin-top:.35rem;padding:.7rem;border:1px solid #cfd7e2;border-radius:.55rem;font:inherit;font-weight:400}.resource-dialog textarea{min-height:4.5rem;resize:vertical}.search-label{margin-bottom:.25rem!important}.picker-group{margin:.95rem 0}.picker-group h3{margin:0;padding:.45rem 0;border-bottom:1px solid #e7ebf0;color:#475569;font-size:.76rem;text-transform:uppercase;letter-spacing:.07em}.resource-choice{display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;width:100%;text-align:left;border:0;border-bottom:1px solid #edf0f4;background:#fff;padding:.75rem .2rem;color:#334155}.resource-choice strong,.resource-choice small{display:block}.resource-choice small{margin-top:.2rem;color:#64748b}.resource-choice:hover,.resource-choice:focus-visible,.resource-choice.chosen{background:#f8fbff}.resource-choice.chosen{color:#1d4ed8}.selected-resources{margin:1.25rem 0;padding:1rem;border:1px solid #bfdbfe;border-radius:.75rem;background:#f8fbff}.selected-resources-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:.75rem}.selected-resources-heading h3{margin:.1rem 0;color:#1e3a5f}.selected-resources-heading>span{padding:.25rem .5rem;border-radius:999px;background:#dbeafe;color:#1d4ed8;font-size:.75rem;font-weight:700}.selected-resources ul{list-style:none;padding:0;margin:.7rem 0}.selected-resources li{display:flex;align-items:center;justify-content:space-between;gap:1rem;padding:.55rem 0;border-bottom:1px solid #dbeafe}.selected-resources li:last-child{border-bottom:0}.selected-resources strong,.selected-resources small{display:block}.selected-resources small{color:#64748b;font-size:.75rem;margin-top:.15rem}.remove-resource,.link-button{border:0;background:transparent;color:#b91c1c;font:inherit;font-size:.8rem;font-weight:700}.resource-dialog footer{position:sticky;bottom:0;display:flex;justify-content:flex-end;gap:.5rem;background:#fff;border-top:1px solid #edf0f4}.exchange-error{margin:.75rem 0;padding:.7rem .8rem;border:1px solid #fecaca;background:#fff7f7;border-radius:.55rem;color:#991b1b}.empty-inline{padding:.9rem 0;color:#64748b}.eyebrow{text-transform:uppercase;letter-spacing:.08em;color:#64748b;font-size:.7rem;font-weight:750;margin:0 0 .25rem}.close{border:0;background:transparent;font-size:1.7rem;color:#64748b}.primary,.secondary{border-radius:.55rem;padding:.6rem .9rem;font-weight:650}.primary{border:1px solid #2563eb;background:#2563eb;color:#fff}.secondary{border:1px solid #d7dde6;background:#fff;color:#334155}.add-template{width:100%;margin:.8rem 0 0;border:1px solid #bfdbfe;border-radius:.6rem;padding:.65rem;background:#f8fbff;color:#1d4ed8;font-weight:700}@media(max-width:700px){.modal-backdrop{align-items:flex-end}.resource-dialog{width:100%;max-height:94vh;border-radius:1rem 1rem 0 0}.resource-dialog footer button{flex:1}}
</style>
