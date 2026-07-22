<template>
  <div class="modal-backdrop" @click.self="close">
    <article class="resource-dialog" role="dialog" aria-modal="true" aria-labelledby="resource-picker-title">
      <header><div><p class="eyebrow">{{ client.name }}</p><h2 id="resource-picker-title">Send to client</h2><p>Choose one or more items, then add an instruction or due date if useful.</p></div><button class="close" aria-label="Close" @click="close">×</button></header>
      <p v-if="error" class="exchange-error" role="alert">{{ error }}</p>
      <label class="search-label">Find something to send<input v-model="query" autofocus placeholder="Search resources, measures, questionnaires and documents" @input="loadResources" /></label>
      <div v-if="resourcesLoading" class="empty-inline">Loading library…</div>
      <template v-else>
        <section v-for="group in groupedResources" :key="group.id" v-show="group.items.length" class="picker-group">
          <h3>{{ group.label }}</h3>
          <button v-for="resource in group.items" :key="catalogKey(resource)" class="resource-choice" :class="{ chosen: isSelected(resource) }" @click="toggleResource(resource)"><span><strong>{{ resource.title }}</strong><small>{{ kindLabel(resource.resource_kind) }} · {{ completionModeLabel(resource.version?.completion_mode) }}</small></span><span>{{ isSelected(resource) ? '✓ Selected' : 'Select' }}</span></button>
        </section>
        <p v-if="!resources.length" class="empty-inline">No matching resources yet. Add a reusable resource below.</p>
      </template>
      <button v-if="!resources.some(item => item.title === 'PHQ-9')" class="add-template" :disabled="creating" @click="createPhq9">{{ creating ? 'Adding…' : 'Add PHQ-9 to library' }}</button>
      <ReusableResourceCreator @created="handleResourceCreated" />
      <section class="selected-resources" aria-labelledby="selected-resources-title">
        <div class="selected-resources-heading"><h3 id="selected-resources-title">Selected</h3><span>{{ selectedResources.length ? `${selectedResources.length} selected` : 'No items selected' }}</span></div>
        <p v-if="!selectedResources.length" class="empty-inline">Select one or more items above to configure the request.</p>
        <template v-else><ul><li v-for="resource in selectedResources" :key="catalogKey(resource)"><span><strong>{{ resource.title }}</strong><small>{{ kindLabel(resource.resource_kind) }}</small></span><button type="button" class="remove-resource" :aria-label="`Remove ${resource.title}`" @click="toggleResource(resource)">Remove</button></li></ul>
        <label>Optional instruction<textarea v-model="instruction" :disabled="sending" placeholder="What would you like the client to do with these items?" /></label><label>Optional due date<input v-model="dueAt" :disabled="sending" type="date" /></label></template>
      </section>
      <footer><button class="secondary" @click="close">Cancel</button><button class="primary" :disabled="!selectedResources.length || !client?.id || sending" @click="send">{{ sending ? 'Sending…' : 'Send to client' }}</button></footer>
    </article>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { authenticatedFetch } from '../../lib/api.js'
import { completionModeLabel, resourceKinds } from '../../lib/clinicalExchange.js'
import ReusableResourceCreator from './ReusableResourceCreator.vue'

const props = defineProps({ client: { type: Object, required: true } })
const emit = defineEmits(['close', 'sent'])
const resources = ref([]), resourcesLoading = ref(false), selectedResources = ref([]), query = ref(''), instruction = ref(''), dueAt = ref(''), sending = ref(false), creating = ref(false), error = ref('')
const kindLabel = kind => resourceKinds.find(([value]) => value === kind)?.[1] || 'Resource'
const catalogKey = resource => `${resource.resource_kind || 'resource'}:${resource.id || resource.version?.id}`
const recentlyUsed = () => { try { return JSON.parse(localStorage.getItem('helio_recent_resources') || '[]') } catch { return [] } }
const groupedResources = computed(() => {
  const recentIds = recentlyUsed()
  const groups = [
    ['recent', 'Recently used', item => recentIds.includes(item.id)], ['outcome', 'Outcome measures', item => item.resource_kind === 'outcome_measure'], ['worksheets', 'CBT worksheets', item => ['worksheet', 'thought_record'].includes(item.resource_kind)], ['psychoeducation', 'Psychoeducation', item => item.resource_kind === 'psychoeducation'], ['sleep', 'Sleep resources', item => item.resource_kind === 'sleep_diary'], ['experiments', 'Behavioural experiments', item => item.resource_kind === 'behavioural_experiment'], ['custom', 'My custom resources', item => !['outcome_measure', 'worksheet', 'thought_record', 'psychoeducation', 'sleep_diary', 'behavioural_experiment'].includes(item.resource_kind)]
  ]
  const used = new Set()
  return groups.map(([id, label, match]) => ({ id, label, items: resources.value.filter(item => match(item) && (id === 'recent' || !used.has(item.id))).filter(item => { used.add(item.id); return true }) }))
})
async function responseJson(response) { const data = await response.json().catch(() => ({})); if (!response.ok) throw new Error(data.error || 'Something went wrong.'); return data }
async function loadResources() { resourcesLoading.value = true; try { resources.value = (await responseJson(await authenticatedFetch(`/api/resources?q=${encodeURIComponent(query.value)}`))).resources || [] } catch (cause) { error.value = cause.message } finally { resourcesLoading.value = false } }
function close() { emit('close') }
function isSelected(resource) { return selectedResources.value.some(item => catalogKey(item) === catalogKey(resource)) }
function toggleResource(resource) { selectedResources.value = isSelected(resource) ? selectedResources.value.filter(item => catalogKey(item) !== catalogKey(resource)) : [...selectedResources.value, resource] }
async function createPhq9() { creating.value = true; error.value = ''; try { const resource = (await responseJson(await authenticatedFetch('/api/resources', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ template: 'phq9' }) }))).resource; handleResourceCreated(resource) } catch (cause) { error.value = cause.message } finally { creating.value = false } }
function handleResourceCreated(resource) { resources.value.unshift(resource); if (!isSelected(resource)) toggleResource(resource) }
async function send() { if (!selectedResources.value.length) return; sending.value = true; error.value = ''; try { const sent = await responseJson(await authenticatedFetch('/api/resource-assignments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clientId: props.client.id, resourceVersionIds: selectedResources.value.map(resource => resource.version.id), instruction: instruction.value, dueAt: dueAt.value || null }) })); const ids = [...selectedResources.value.map(resource => resource.id), ...recentlyUsed().filter(id => !selectedResources.value.some(resource => resource.id === id))].slice(0, 8); localStorage.setItem('helio_recent_resources', JSON.stringify(ids)); emit('sent', { request: sent.request, assignments: sent.assignments, clientAccessTokens: sent.clientAccessTokens }); emit('close') } catch (cause) { error.value = cause.message } finally { sending.value = false } }
loadResources()
</script>

<style scoped>
.resource-dialog{width:min(42rem,100%);max-height:90vh;overflow:auto;background:#fff;border-radius:1rem;padding:1.3rem;box-shadow:0 20px 60px #0004}.resource-dialog header{display:flex;justify-content:space-between;gap:1rem;align-items:flex-start}.resource-dialog h2{margin:.1rem 0}.resource-dialog header p:not(.eyebrow){margin:.4rem 0 0;color:#64748b;font-size:.88rem;line-height:1.4}.resource-dialog label{display:block;margin:.8rem 0;font-size:.85rem;font-weight:700;color:#334155}.resource-dialog input,.resource-dialog select,.resource-dialog textarea{box-sizing:border-box;width:100%;margin-top:.35rem;padding:.7rem;border:1px solid #cfd7e2;border-radius:.55rem;font:inherit;font-weight:400}.resource-dialog textarea{min-height:4.5rem;resize:vertical}.search-label{margin-bottom:.25rem!important}.picker-group{margin:.95rem 0}.picker-group h3{margin:0;padding:.45rem 0;border-bottom:1px solid #e7ebf0;color:#475569;font-size:.76rem;text-transform:uppercase;letter-spacing:.07em}.resource-choice{display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;width:100%;text-align:left;border:0;border-bottom:1px solid #edf0f4;background:#fff;padding:.75rem .2rem;color:#334155}.resource-choice strong,.resource-choice small{display:block}.resource-choice small{margin-top:.2rem;color:#64748b}.resource-choice:hover,.resource-choice.chosen{background:#f8fbff}.resource-choice.chosen{color:#1d4ed8}.add-resource{margin:.9rem 0;padding:.75rem;border:1px solid #dbe1e8;border-radius:.65rem;background:#f8fafc}.add-resource summary{cursor:pointer;font-weight:700;color:#334155}.selected-resources{margin-top:1.25rem;padding:1rem;border:1px solid #bfdbfe;border-radius:.75rem;background:#f8fbff}.selected-resources-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:.75rem}.selected-resources-heading h3{margin:.1rem 0;color:#1e3a5f}.selected-resources-heading>span{padding:.25rem .5rem;border-radius:999px;background:#dbeafe;color:#1d4ed8;font-size:.75rem;font-weight:700}.selected-resources ul{list-style:none;padding:0;margin:.7rem 0}.selected-resources li{display:flex;align-items:center;justify-content:space-between;gap:1rem;padding:.55rem 0;border-bottom:1px solid #dbeafe}.selected-resources li:last-child{border-bottom:0}.selected-resources strong,.selected-resources small{display:block}.selected-resources small{color:#64748b;font-size:.75rem;margin-top:.15rem}.remove-resource{border:0;background:transparent;color:#b91c1c;font:inherit;font-size:.8rem;font-weight:700}.selected-resources fieldset{border:0;padding:0;margin:0}.selected-resources fieldset:disabled{opacity:.55}.resource-dialog footer{display:flex;justify-content:flex-end;gap:.5rem;margin-top:1rem}.exchange-error{margin:.75rem 0;padding:.7rem .8rem;border:1px solid #fecaca;background:#fff7f7;border-radius:.55rem;color:#991b1b}.empty-inline{padding:.9rem 0;color:#64748b}.eyebrow{text-transform:uppercase;letter-spacing:.08em;color:#64748b;font-size:.7rem;font-weight:750;margin:0 0 .25rem}.close{border:0;background:transparent;font-size:1.7rem;color:#64748b}.primary,.secondary{border-radius:.55rem;padding:.6rem .9rem;font-weight:650}.primary{border:1px solid #2563eb;background:#2563eb;color:#fff}.secondary{border:1px solid #d7dde6;background:#fff;color:#334155}@media(max-width:700px){.resource-dialog{border-radius:1rem 1rem 0 0;max-height:94vh}.resource-dialog footer button{flex:1}}
.add-template{width:100%;margin:.8rem 0 0;border:1px solid #bfdbfe;border-radius:.6rem;padding:.65rem;background:#f8fbff;color:#1d4ed8;font-weight:700}
</style>
