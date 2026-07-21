<template>
  <section class="section-card resources-measures">
    <header class="section-heading"><div><p class="eyebrow">Client exchange</p><h2>Resources &amp; measures</h2><p>Send the exact resource this client needs. Returned work will appear here for review.</p></div><button class="primary" @click="openPicker">Send to client</button></header>
    <p v-if="error" class="exchange-error" role="alert">{{ error }}</p>
    <div v-if="loading" class="empty-inline">Loading resources…</div>
    <div v-else-if="!assignments.length" class="empty-state"><div>⇄</div><h3>Nothing sent yet</h3><p>Choose a resource or measure to send to {{ client.name }}.</p></div>
    <article v-for="assignment in assignments" :key="assignment.id" class="assignment-row">
      <div><strong>{{ assignment.resource_versions?.client_title || 'Resource' }}</strong><small>{{ completionModeLabel(assignment.resource_versions?.completion_mode) }} · Sent {{ formatDate(assignment.sent_at) }}<template v-if="assignment.due_at"> · Due {{ formatDate(assignment.due_at) }}</template></small><p v-if="assignment.therapist_instruction">{{ assignment.therapist_instruction }}</p></div><span class="assignment-status">{{ assignmentStatusLabel(assignment.status) }}</span>
    </article>

    <div v-if="pickerOpen" class="modal-backdrop" @click.self="closePicker">
      <article class="resource-dialog" role="dialog" aria-modal="true" aria-labelledby="send-resource-title">
        <header><div><p class="eyebrow">{{ client.name }}</p><h2 id="send-resource-title">Send to client</h2></div><button class="close" aria-label="Close" @click="closePicker">×</button></header>
        <label>Find a resource<input v-model="query" autofocus placeholder="Search your resource library" @input="loadResources" /></label>
        <div v-if="resourcesLoading" class="empty-inline">Loading library…</div>
        <template v-else>
          <button v-for="resource in resources" :key="resource.id" class="resource-choice" :class="{ chosen: selectedResource?.version?.id === resource.version?.id }" @click="selectedResource = resource"><span><strong>{{ resource.title }}</strong><small>{{ kindLabel(resource.resource_kind) }} · {{ completionModeLabel(resource.version?.completion_mode) }}</small></span><span>{{ selectedResource?.version?.id === resource.version?.id ? 'Selected' : 'Select' }}</span></button>
          <p v-if="!resources.length" class="empty-inline">No matching resources yet. Add a simple reusable resource below.</p>
        </template>
        <details class="add-resource"><summary>Add a simple resource</summary><label>Title<input v-model="newResource.title" placeholder="e.g. Sleep diary" /></label><label>Type<select v-model="newResource.resourceKind"><option v-for="[value, label] in resourceKinds" :key="value" :value="value">{{ label }}</option></select></label><label>How the client completes it<select v-model="newResource.completionMode"><option value="structured">Complete in Helio</option><option value="upload">Upload completed copy</option><option value="either">Complete or upload</option><option value="read_only">Read only</option></select></label><button class="secondary" :disabled="creating" @click="createResource">{{ creating ? 'Adding…' : 'Add to library' }}</button></details>
        <label>Optional instruction<textarea v-model="instruction" placeholder="What would you like the client to do with this?" /></label><label>Optional due date<input v-model="dueAt" type="date" /></label>
        <footer><button class="secondary" @click="closePicker">Cancel</button><button class="primary" :disabled="!selectedResource || sending" @click="send">{{ sending ? 'Sending…' : 'Send to client' }}</button></footer>
      </article>
    </div>
  </section>
</template>

<script setup>
import { ref, watch } from 'vue'
import { authenticatedFetch } from '../../lib/api.js'
import { assignmentStatusLabel, completionModeLabel, resourceKinds } from '../../lib/clinicalExchange.js'

const props = defineProps({ client: { type: Object, required: true } })
const assignments = ref([]); const loading = ref(false); const error = ref(''); const pickerOpen = ref(false); const resources = ref([]); const resourcesLoading = ref(false); const selectedResource = ref(null); const query = ref(''); const instruction = ref(''); const dueAt = ref(''); const sending = ref(false); const creating = ref(false)
const newResource = ref({ title: '', resourceKind: 'worksheet', completionMode: 'structured' })
const kindLabel = kind => resourceKinds.find(([value]) => value === kind)?.[1] || 'Resource'
const formatDate = value => new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
async function responseJson(response) { const data = await response.json().catch(() => ({})); if (!response.ok) throw new Error(data.error || 'Something went wrong.'); return data }
async function loadAssignments() { if (!props.client?.id) return; loading.value = true; error.value = ''; try { assignments.value = (await responseJson(await authenticatedFetch(`/api/resource-assignments?clientId=${encodeURIComponent(props.client.id)}`))).assignments || [] } catch (cause) { error.value = cause.message } finally { loading.value = false } }
async function loadResources() { resourcesLoading.value = true; try { resources.value = (await responseJson(await authenticatedFetch(`/api/resources?q=${encodeURIComponent(query.value)}`))).resources || [] } catch (cause) { error.value = cause.message } finally { resourcesLoading.value = false } }
async function openPicker() { pickerOpen.value = true; await loadResources() }
function closePicker() { pickerOpen.value = false; selectedResource.value = null; instruction.value = ''; dueAt.value = ''; query.value = '' }
async function createResource() { creating.value = true; error.value = ''; try { const resource = (await responseJson(await authenticatedFetch('/api/resources', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newResource.value) }))).resource; resources.value.unshift(resource); selectedResource.value = resource; newResource.value = { title: '', resourceKind: 'worksheet', completionMode: 'structured' } } catch (cause) { error.value = cause.message } finally { creating.value = false } }
async function send() { if (!selectedResource.value?.version?.id) return; sending.value = true; error.value = ''; try { await responseJson(await authenticatedFetch('/api/resource-assignments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clientId: props.client.id, resourceVersionId: selectedResource.value.version.id, instruction: instruction.value, dueAt: dueAt.value || null }) })); closePicker(); await loadAssignments() } catch (cause) { error.value = cause.message } finally { sending.value = false } }
watch(() => props.client?.id, loadAssignments, { immediate: true })
</script>

<style scoped>
.resources-measures{position:relative}.resources-measures .section-heading{margin-bottom:1rem}.assignment-row,.resource-choice{display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;width:100%;text-align:left;border:0;border-top:1px solid #edf0f4;background:#fff;padding:.9rem .15rem;color:#334155}.assignment-row strong,.assignment-row small,.resource-choice strong,.resource-choice small{display:block}.assignment-row small,.resource-choice small{margin-top:.2rem;color:#64748b}.assignment-row p{margin:.4rem 0 0;font-size:.85rem;color:#475569}.assignment-status{border:1px solid #dbe1e8;border-radius:999px;padding:.2rem .5rem;font-size:.72rem;font-weight:700;white-space:nowrap;color:#475569}.exchange-error{margin:.75rem 0;padding:.7rem .8rem;border:1px solid #fecaca;background:#fff7f7;border-radius:.55rem;color:#991b1b}.resource-dialog{width:min(40rem,100%);max-height:90vh;overflow:auto;background:#fff;border-radius:1rem;padding:1.3rem;box-shadow:0 20px 60px #0004}.resource-dialog header{display:flex;justify-content:space-between;align-items:flex-start}.resource-dialog h2{margin:.1rem 0 1rem}.resource-dialog label{display:block;margin:.8rem 0;font-size:.85rem;font-weight:700;color:#334155}.resource-dialog input,.resource-dialog select,.resource-dialog textarea{box-sizing:border-box;width:100%;margin-top:.35rem;padding:.7rem;border:1px solid #cfd7e2;border-radius:.55rem;font:inherit;font-weight:400}.resource-dialog textarea{min-height:4.5rem;resize:vertical}.resource-choice{padding:.75rem .1rem}.resource-choice:hover,.resource-choice.chosen{background:#f8fbff}.resource-choice.chosen{color:#1d4ed8}.add-resource{margin:.9rem 0;padding:.75rem;border:1px solid #dbe1e8;border-radius:.65rem;background:#f8fafc}.add-resource summary{cursor:pointer;font-weight:700;color:#334155}.resource-dialog footer{display:flex;justify-content:flex-end;gap:.5rem;margin-top:1rem}@media(max-width:700px){.resources-measures .section-heading{flex-direction:column}.resources-measures .section-heading .primary{width:100%}.resource-dialog{border-radius:1rem 1rem 0 0;max-height:94vh}.resource-dialog footer button{flex:1}}
</style>
