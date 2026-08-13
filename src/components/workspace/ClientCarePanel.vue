<template>
  <section aria-labelledby="care-heading" class="space-y-stack-lg">
    <header class="border-b border-border pb-stack-md">
      <div class="flex flex-col md:flex-row md:items-end justify-between gap-stack-md">
        <div class="max-w-2xl"><h2 id="care-heading" class="text-h2 font-semibold text-ink">Care</h2><p class="text-body-sm text-ink-secondary mt-1">A living, shared understanding of what matters, what you are noticing, and what you are learning together.</p></div>
        <button type="button" class="px-inline-md py-stack-xs bg-action-link text-on-action rounded-control font-medium" @click="showAdd = !showAdd">Add to Care</button>
      </div>
      <p class="text-caption text-ink-muted mt-stack-sm">CBT-informed, without turning therapy into a checklist. Care records direction and learning rather than pass/fail goals.</p>
    </header>

    <form v-if="showAdd" class="border border-border rounded-panel p-inline-lg py-stack-md space-y-stack-md bg-surface-elevated" @submit.prevent="saveItem">
      <div><label class="text-caption font-medium text-ink-secondary" for="care-kind">Where does this belong?</label><select id="care-kind" v-model="draftKind" class="mt-1 w-full border border-border rounded-control bg-surface px-inline-md py-stack-xs text-body-sm text-ink"><option v-for="section in sections" :key="section.kind" :value="section.kind">{{ section.title }}</option></select></div>
      <div><label class="text-caption font-medium text-ink-secondary" for="care-body">Observation or focus</label><textarea id="care-body" v-model="draftBody" rows="4" class="mt-1 w-full border border-border rounded-control bg-surface px-inline-md py-stack-sm text-body text-ink" :placeholder="placeholderFor(draftKind)"></textarea></div>
      <div class="flex justify-end gap-inline-sm"><button type="button" class="px-inline-md py-stack-xs border border-border rounded-control text-body-sm text-ink-secondary" @click="cancelAdd">Cancel</button><button type="submit" :disabled="saving || !draftBody.trim()" class="px-inline-md py-stack-xs bg-action-link text-on-action rounded-control text-body-sm font-medium disabled:opacity-50">{{ saving ? 'Saving…' : 'Add to Care' }}</button></div>
      <p v-if="error" class="text-caption text-state-danger">{{ error }}</p>
    </form>

    <div class="rounded-panel border border-border bg-surface-subtle px-inline-lg py-stack-md">
      <div class="flex items-start justify-between gap-inline-lg"><div><h3 class="text-body font-semibold text-ink">AI suggestions</h3><p class="text-body-sm text-ink-secondary mt-1">Helio can help notice patterns and draft possible updates. Nothing is added to Care unless you review and accept it.</p></div><span class="text-caption font-medium text-ink-muted whitespace-nowrap">Clinician controlled</span></div>
      <p class="text-caption text-ink-muted mt-stack-sm">AI-supported Care will distinguish record evidence from clinical inference and retain provenance when an accepted suggestion becomes part of the Care record.</p>
    </div>

    <p v-if="loading" class="text-body-sm text-ink-muted py-stack-lg">Loading Care…</p>
    <div v-else class="space-y-stack-xl">
      <section v-for="section in sections" :key="section.kind" :aria-labelledby="`care-${section.kind}`">
        <div class="mb-stack-sm"><h3 :id="`care-${section.kind}`" class="text-h3 font-semibold text-ink">{{ section.title }}</h3><p class="text-body-sm text-ink-muted mt-1">{{ section.description }}</p></div>
        <div v-if="itemsFor(section.kind).length" class="border-y border-border divide-y divide-border">
          <article v-for="item in itemsFor(section.kind)" :key="item.id" class="py-stack-md flex gap-inline-md justify-between items-start"><div class="min-w-0"><p class="text-body text-ink leading-relaxed">{{ item.body }}</p><div class="flex gap-inline-sm flex-wrap mt-stack-xs text-caption text-ink-muted"><span>{{ formatDate(item.updatedAt) }}</span><span v-if="item.origin === 'ai_assisted'">AI-assisted · clinician accepted</span><span v-if="item.provenanceSessionId">Linked to session</span></div></div><select :value="item.status" class="shrink-0 border border-border rounded-control bg-surface px-inline-sm py-stack-xs text-caption text-ink-secondary" @change="changeStatus(item, $event.target.value)"><option value="current">Current</option><option value="less_relevant">Less relevant</option><option value="paused">Paused</option><option value="historical">Earlier</option></select></article>
        </div>
        <p v-else class="border-y border-border py-stack-md text-body-sm text-ink-muted">{{ section.empty }}</p>
      </section>
    </div>
  </section>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { listClientCareItems, createClientCareItem, updateClientCareItem } from '../../lib/clientCare.js'

const props = defineProps({ clientId: { type: String, required: true } })
const emit = defineEmits(['changed'])
const items = ref([]), loading = ref(true), saving = ref(false), error = ref(''), showAdd = ref(false), draftKind = ref('current_focus'), draftBody = ref('')
const sections = [
  { kind: 'current_focus', title: 'Current focus', description: 'A small number of things that seem important in the work right now.', empty: 'No current focus has been recorded yet.' },
  { kind: 'shared_understanding', title: 'Shared understanding', description: 'Patterns, meanings, responses, strengths and maintaining processes you are beginning to understand together.', empty: 'The shared formulation can emerge gradually; nothing needs to be forced into a template.' },
  { kind: 'trying', title: 'What we’re trying', description: 'Approaches, experiments and practices being explored rather than tasks to pass or fail.', empty: 'No approaches or experiments are being tracked yet.' },
  { kind: 'change_noticed', title: 'Changes we’re noticing', description: 'Differences across sessions, including improvement, difficulty, recurrence or uncertainty.', empty: 'No changes have been recorded yet.' },
  { kind: 'learning', title: 'What we’re learning', description: 'What the work is teaching you and the client, including findings that challenge the current formulation.', empty: 'Learning from the work will appear here as it develops.' }
]

function itemsFor(kind) { return items.value.filter(item => item.kind === kind && item.status !== 'historical') }
function placeholderFor(kind) { return ({ current_focus: 'e.g. Understanding what happens around panic at work…', shared_understanding: 'e.g. Uncertainty appears to trigger predictions of rejection, followed by withdrawal…', trying: 'e.g. Experimenting with staying in meetings when anxiety rises…', change_noticed: 'e.g. Staying in difficult conversations for longer, while anticipatory anxiety remains high…', learning: 'e.g. Asking for clarification did not lead to the rejection that was expected…' })[kind] || '' }
async function load() { loading.value = true; error.value = ''; try { items.value = await listClientCareItems(props.clientId) } catch (e) { error.value = 'Care could not be loaded.' } finally { loading.value = false } }
async function saveItem() { if (!draftBody.value.trim()) return; saving.value = true; error.value = ''; try { const item = await createClientCareItem({ clientId: props.clientId, kind: draftKind.value, body: draftBody.value }); items.value.unshift(item); draftBody.value = ''; showAdd.value = false; emit('changed', items.value) } catch (e) { error.value = 'This Care item could not be saved.' } finally { saving.value = false } }
async function changeStatus(item, status) { error.value = ''; try { const updated = await updateClientCareItem(item.id, { status }); items.value = items.value.map(existing => existing.id === updated.id ? updated : existing); emit('changed', items.value) } catch (e) { error.value = 'This Care item could not be updated.' } }
function cancelAdd() { showAdd.value = false; draftBody.value = ''; error.value = '' }
function formatDate(value) { return value ? new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '' }
onMounted(load)
</script>
