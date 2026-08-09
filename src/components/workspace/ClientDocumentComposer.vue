<template>
  <teleport to="body">
    <div class="fixed inset-0 z-[70] bg-black/45 p-4 flex items-center justify-center" @click.self="requestClose">
      <section class="w-full max-w-5xl max-h-[92vh] overflow-hidden bg-surface-elevated border border-border rounded-panel shadow-overlay flex flex-col" role="dialog" aria-modal="true" aria-labelledby="document-composer-title" data-testid="client-document-composer">
        <header class="p-6 border-b border-border-muted flex items-start justify-between gap-4">
          <div><p class="type-overline text-ink-muted">Client document</p><h2 id="document-composer-title" class="text-h2 font-semibold text-ink mt-1">{{ document ? 'Edit Document' : 'Create Document' }}</h2><p class="text-body-sm text-ink-secondary mt-1">Drafts are saved to Helio. Only completed clinical session notes can be selected as source material.</p></div>
          <button type="button" aria-label="Close document composer" class="text-ink-muted hover:text-ink" @click="requestClose">✕</button>
        </header>
        <div class="flex-1 overflow-auto p-6">
          <div v-if="loading" class="py-16 text-center text-ink-muted">Loading document workspace…</div>
          <div v-else class="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-6">
            <div class="space-y-5">
              <label class="block"><span class="text-caption font-semibold text-ink">Title</span><input v-model="form.title" class="mt-1 w-full p-3 border border-border rounded-control bg-surface" placeholder="e.g. Clinical summary – August 2026" /></label>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label class="block"><span class="text-caption font-semibold text-ink">Document type</span><select v-model="form.documentType" class="mt-1 w-full p-3 border border-border rounded-control bg-surface"><option value="clinical_summary">Clinical summary</option><option value="progress_report">Progress report</option><option value="care_letter">Care letter</option><option value="other">Other</option></select></label>
                <label class="block"><span class="text-caption font-semibold text-ink">Recipient</span><input v-model="form.recipient" class="mt-1 w-full p-3 border border-border rounded-control bg-surface" placeholder="Optional" /></label>
              </div>
              <label class="block"><span class="text-caption font-semibold text-ink">Purpose</span><input v-model="form.purpose" class="mt-1 w-full p-3 border border-border rounded-control bg-surface" placeholder="Why this document is being prepared" /></label>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4"><label class="block"><span class="text-caption font-semibold text-ink">Period start</span><input v-model="form.periodStart" type="date" class="mt-1 w-full p-3 border border-border rounded-control bg-surface" /></label><label class="block"><span class="text-caption font-semibold text-ink">Period end</span><input v-model="form.periodEnd" type="date" class="mt-1 w-full p-3 border border-border rounded-control bg-surface" /></label></div>
              <label class="block"><span class="text-caption font-semibold text-ink">Document body</span><textarea v-model="form.body" rows="16" class="mt-1 w-full p-4 border border-border rounded-control bg-surface resize-y" placeholder="Write the document here. You can copy selected session notes into the draft from the source panel." /></label>
            </div>
            <aside class="space-y-4">
              <div class="p-4 rounded-panel border border-border bg-surface-subtle"><h3 class="text-body-sm font-semibold text-ink">Clinical sources</h3><p class="text-caption text-ink-muted mt-1">Private reflections and supervision material are not available here.</p></div>
              <div v-if="sources.length === 0" class="p-4 border border-border rounded-panel text-body-sm text-ink-muted">No completed session notes are available for this client.</div>
              <label v-for="source in sources" :key="source.id" class="block p-4 border border-border rounded-panel bg-surface cursor-pointer"><span class="flex items-start gap-3"><input v-model="selectedSourceIds" type="checkbox" :value="source.id" class="mt-1" /><span class="min-w-0"><strong class="text-body-sm text-ink">{{ formatDate(source.occurredAt) }}</strong><span class="block text-caption text-ink-muted mt-1">Clinical session note · version {{ source.version }}</span><span class="block text-body-sm text-ink-secondary mt-2 line-clamp-4">{{ source.notes || 'No note text' }}</span></span></span></label>
              <button v-if="selectedSources.length" type="button" class="button-secondary w-full" @click="appendSources">Copy selected notes into draft</button>
            </aside>
          </div>
          <div v-if="error" class="mt-5 p-4 rounded-control bg-state-danger/10 text-state-danger" role="alert">{{ error }}</div>
        </div>
        <footer class="p-6 border-t border-border-muted flex items-center justify-between gap-4"><p class="text-caption text-ink-muted">{{ saveMessage }}</p><div class="flex gap-2"><button type="button" class="button-secondary" :disabled="saving" @click="requestClose">Close</button><button type="button" class="button-primary" :disabled="saving || !form.title.trim()" @click="saveDraft">{{ saving ? 'Saving…' : 'Save Draft' }}</button></div></footer>
      </section>
    </div>
  </teleport>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { createClientDocumentDraft, listDocumentSourceSessions, saveClientDocumentDraft } from '../../lib/clientDocuments.js';
const props = defineProps({ client: { type: Object, required: true }, document: { type: Object, default: null } });
const emit = defineEmits(['close', 'saved']);
const loading = ref(true); const saving = ref(false); const error = ref(''); const saveMessage = ref('Unsaved changes'); const sources = ref([]); const selectedSourceIds = ref([]); const currentDocument = ref(props.document);
const form = reactive({ title: props.document?.title || '', documentType: props.document?.documentType || 'clinical_summary', recipient: props.document?.recipient || '', purpose: props.document?.purpose || '', periodStart: props.document?.periodStart || '', periodEnd: props.document?.periodEnd || '', body: props.document?.content?.body || '' });
const selectedSources = computed(() => sources.value.filter(source => selectedSourceIds.value.includes(source.id)));
onMounted(async () => { try { sources.value = await listDocumentSourceSessions(props.client.id); const ids = new Set((props.document?.sourceManifest || []).filter(item => item.kind === 'session').map(item => item.id)); selectedSourceIds.value = sources.value.filter(source => ids.has(source.id)).map(source => source.id); } catch (e) { console.error('Failed to load document sources:', e); error.value = 'Could not load completed session notes.'; } finally { loading.value = false; } });
function sourceManifest() { return selectedSources.value.map(source => ({ kind: 'session', id: source.id, version: source.version, occurredAt: source.occurredAt })); }
function appendSources() { const text = selectedSources.value.map(source => `Session ${formatDate(source.occurredAt)}\n${source.notes || ''}`.trim()).join('\n\n'); if (!text) return; form.body = [form.body.trim(), text].filter(Boolean).join('\n\n'); }
async function saveDraft() { if (saving.value || !form.title.trim()) return; saving.value = true; error.value = ''; try { const changes = { title: form.title, documentType: form.documentType, recipient: form.recipient, purpose: form.purpose, periodStart: form.periodStart || null, periodEnd: form.periodEnd || null, content: { body: form.body }, sourceManifest: sourceManifest() }; currentDocument.value = currentDocument.value ? await saveClientDocumentDraft(currentDocument.value, changes) : await createClientDocumentDraft({ client: props.client, ...changes }); saveMessage.value = `Saved ${new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`; emit('saved', currentDocument.value); } catch (e) { console.error('Failed to save document draft:', e); error.value = e.code === 'DOCUMENT_CONFLICT' ? e.message : 'Could not save this document draft.'; } finally { saving.value = false; } }
function requestClose() { if (!saving.value) emit('close'); }
function formatDate(value) { return value ? new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Date unavailable'; }
</script>
