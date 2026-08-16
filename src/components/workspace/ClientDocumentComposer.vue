<template>
  <teleport to="body">
    <div class="fixed inset-0 z-[70] bg-black/45 flex">
      <section class="relative w-full h-full bg-surface-subtle flex flex-col" role="dialog" aria-modal="true" data-testid="client-document-composer">
        <header class="px-5 py-3 border-b border-border bg-surface-elevated flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div>
            <p class="type-overline text-ink-muted">Client document</p>
            <h2 class="text-h3 font-semibold">{{ finalised ? 'Document Finalised' : (document ? 'Edit client document' : 'Create client document') }}</h2>
          </div>
          <div v-if="!finalised" class="flex flex-wrap items-center gap-2">
            <span class="text-caption" :class="dirty ? 'text-state-warning' : 'text-ink-muted'">{{ dirty ? 'Unsaved changes' : saveMessage }}</span>
            <button class="button-secondary" type="button" @click="sourcePanelOpen = true">Add from clinical notes</button>
            <button class="button-secondary" :disabled="saving || !form.title.trim()" @click="saveDraft">{{ saving && action === 'save' ? 'Saving…' : 'Save Draft' }}</button>
            <button class="button-primary" :disabled="saving || !form.title.trim() || !form.body.trim()" @click="finaliseDocument">{{ saving && action === 'finalise' ? 'Finalising…' : 'Finalise PDF' }}</button>
            <button class="button-secondary" :disabled="saving" @click="requestClose">Close</button>
          </div>
        </header>

        <div v-if="finalised" class="flex-1 overflow-auto p-8">
          <div class="max-w-2xl mx-auto rounded-panel border border-state-success/20 bg-state-success-surface p-6">
            <p class="text-h3 font-semibold text-state-success">✓ PDF finalised and saved</p>
            <p class="text-body-sm text-ink-secondary mt-2"><strong>{{ currentDocument.title }}</strong> is stored privately with this client and this version is read-only.</p>
            <p class="text-caption text-ink-muted mt-3">Finalised {{ formatDateTime(currentDocument.finalizedAt) }}</p>
            <div class="mt-5 flex gap-2"><button class="button-primary" @click="downloadFinalised">Download PDF</button><button class="button-secondary" @click="$emit('show-documents')">View Client Documents</button><button class="button-secondary" @click="requestClose">Close</button></div>
          </div>
        </div>

        <div v-else-if="loading" class="flex-1 grid place-items-center text-ink-muted">Loading document workspace…</div>

        <div v-else class="flex-1 min-h-0 overflow-auto">
          <div class="max-w-5xl mx-auto px-4 sm:px-8 py-5 space-y-5">
            <section class="rounded-panel border border-border bg-surface-elevated p-4 sm:p-5" aria-labelledby="document-details-heading">
              <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div>
                  <h3 id="document-details-heading" class="text-body font-semibold text-ink">Document details</h3>
                  <p class="text-caption text-ink-muted mt-1">Keep the document generic or add clinical context when it is useful.</p>
                </div>
                <span v-if="selectedSourceIds.length" class="text-caption text-ink-muted">{{ selectedSourceIds.length }} clinical source{{ selectedSourceIds.length === 1 ? '' : 's' }} linked</span>
              </div>
              <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                <label class="block xl:col-span-2"><span class="text-caption font-semibold">Title</span><input v-model="form.title" class="mt-1 w-full p-2.5 border border-border rounded-control bg-surface" placeholder="Document title" /></label>
                <label class="block"><span class="text-caption font-semibold">Document type</span><select v-model="form.documentType" class="mt-1 w-full p-2.5 border border-border rounded-control bg-surface"><option value="other">General document</option><option value="clinical_summary">Clinical summary</option><option value="progress_report">Progress report</option><option value="care_letter">Care letter</option></select></label>
                <label class="block"><span class="text-caption font-semibold">Recipient</span><input v-model="form.recipient" class="mt-1 w-full p-2.5 border border-border rounded-control bg-surface" placeholder="Optional" /></label>
                <label class="block md:col-span-2"><span class="text-caption font-semibold">Purpose</span><input v-model="form.purpose" class="mt-1 w-full p-2.5 border border-border rounded-control bg-surface" placeholder="Optional" /></label>
                <div class="grid grid-cols-2 gap-2 md:col-span-2"><label><span class="text-caption font-semibold">From</span><input v-model="form.periodStart" type="date" class="mt-1 w-full p-2 border border-border rounded-control bg-surface" /></label><label><span class="text-caption font-semibold">To</span><input v-model="form.periodEnd" type="date" class="mt-1 w-full p-2 border border-border rounded-control bg-surface" /></label></div>
              </div>
              <div v-if="error" class="mt-4 p-3 rounded-control bg-state-danger/10 text-state-danger text-body-sm">{{ error }}</div>
            </section>

            <article class="clinical-paper mx-auto bg-white text-ink shadow-lg" data-testid="clinical-document-canvas">
              <header class="clinical-letterhead"><div><strong>{{ identity.heading }}</strong><span v-if="identity.professionalTitle">{{ identity.professionalTitle }}</span></div><div class="text-right"><span v-for="line in identity.contactLines" :key="line">{{ line }}</span></div></header>
              <div class="clinical-rule"></div>
              <p class="clinical-eyebrow">CONFIDENTIAL CLINICAL DOCUMENT</p>
              <h1 class="clinical-title">{{ form.title || 'Untitled document' }}</h1>
              <dl class="clinical-meta"><div><dt>Client</dt><dd>{{ client.display_name }}</dd></div><div v-if="form.recipient"><dt>Recipient</dt><dd>{{ form.recipient }}</dd></div><div v-if="periodLabel"><dt>Period</dt><dd>{{ periodLabel }}</dd></div><div v-if="form.purpose"><dt>Purpose</dt><dd>{{ form.purpose }}</dd></div></dl>
              <textarea v-model="form.body" class="clinical-body" aria-label="Clinical document content" spellcheck="true" placeholder="Write the document here. Use ‘Add from clinical notes’ when you want to bring completed session material into the draft." />
              <footer class="clinical-footer"><span>{{ identity.footer }}</span><span>Confidential clinical document</span></footer>
            </article>
          </div>
        </div>

        <aside v-if="!finalised && sourcePanelOpen" class="absolute inset-y-0 right-0 z-20 w-full sm:w-[26rem] bg-surface-elevated border-l border-border shadow-2xl flex flex-col" data-testid="clinical-source-panel">
          <div class="p-4 border-b border-border-muted">
            <div class="flex items-start justify-between gap-3">
              <div><h3 class="text-body font-semibold">Add from clinical notes</h3><p class="text-caption text-ink-muted mt-1">Completed clinical session notes only. Private reflections and supervision material are excluded.</p></div>
              <button class="button-secondary shrink-0" type="button" @click="sourcePanelOpen = false">Done</button>
            </div>
            <input v-model="sourceQuery" type="search" class="mt-3 w-full p-2.5 border border-border rounded-control bg-surface text-body-sm" placeholder="Search session notes…" @input="resetSourceWindow" />
          </div>
          <div class="flex-1 overflow-y-auto p-2 space-y-1">
            <div v-if="!sources.length" class="p-3 text-body-sm text-ink-muted">No completed session notes are available.</div>
            <div v-for="source in visibleSources" :key="source.id" class="border border-border rounded-control bg-surface">
              <div class="flex items-center gap-2 p-2.5"><input v-model="selectedSourceIds" type="checkbox" :value="source.id"/><button class="min-w-0 flex-1 text-left" @click="toggleSourcePreview(source.id)"><strong class="block text-body-sm">{{ formatDate(source.occurredAt) }}</strong><span class="block text-caption text-ink-muted">Clinical session note · v{{ source.version }}</span></button><span v-if="addedSourceIds.includes(source.id)" class="text-caption text-state-success font-semibold">Added</span></div>
              <div v-if="expandedSourceId === source.id" class="px-3 pb-3 pt-3 border-t border-border-muted text-body-sm text-ink-secondary whitespace-pre-wrap">{{ source.notes || 'No note text' }}</div>
            </div>
            <div v-if="hasMoreSources" class="p-3 text-center"><button class="text-body-sm font-semibold text-action-link" @click="loadMoreSources">Load {{ nextSourceCount }} more</button></div>
          </div>
          <div class="p-3 border-t border-border-muted"><button class="button-primary w-full" :disabled="!addableSelectedSources.length" @click="appendSources">{{ addableSelectedSources.length ? `Add ${addableSelectedSources.length} selected note${addableSelectedSources.length === 1 ? '' : 's'} to document` : 'Select session notes to add' }}</button></div>
        </aside>
      </section>
    </div>
  </teleport>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { createClientDocumentDraft, downloadClientDocument, finaliseClientDocument, listDocumentSourceSessions, saveClientDocumentDraft } from '../../lib/clientDocuments.js'
import { loadDocumentProfile, profileDisplay } from '../../lib/documentProfile.js'

const props = defineProps({ client: { type: Object, required: true }, document: { type: Object, default: null } })
const emit = defineEmits(['close', 'saved', 'show-documents'])
const SOURCE_PAGE_SIZE = 8
const loading = ref(true), saving = ref(false), action = ref(''), error = ref(''), saveMessage = ref(props.document ? 'Saved' : 'Not saved yet'), sources = ref([]), selectedSourceIds = ref([]), addedSourceIds = ref([]), expandedSourceId = ref(null), sourceQuery = ref(''), visibleSourceCount = ref(SOURCE_PAGE_SIZE), currentDocument = ref(props.document), baseline = ref(''), profile = ref({}), sourcePanelOpen = ref(false)
const form = reactive({ title: props.document?.title || '', documentType: props.document?.documentType || 'other', recipient: props.document?.recipient || '', purpose: props.document?.purpose || '', periodStart: props.document?.periodStart || '', periodEnd: props.document?.periodEnd || '', body: props.document?.content?.body || '' })
const identity = computed(() => profileDisplay(profile.value))
const finalised = computed(() => currentDocument.value?.status === 'completed')
const selectedSources = computed(() => sources.value.filter(s => selectedSourceIds.value.includes(s.id)))
const addableSelectedSources = computed(() => selectedSources.value.filter(s => !addedSourceIds.value.includes(s.id)))
const filteredSources = computed(() => { const q = sourceQuery.value.trim().toLowerCase(); return q ? sources.value.filter(s => `${formatDate(s.occurredAt)} ${s.notes || ''}`.toLowerCase().includes(q)) : sources.value })
const visibleSources = computed(() => filteredSources.value.slice(0, visibleSourceCount.value))
const hasMoreSources = computed(() => visibleSources.value.length < filteredSources.value.length)
const nextSourceCount = computed(() => Math.min(SOURCE_PAGE_SIZE, filteredSources.value.length - visibleSources.value.length))
const periodLabel = computed(() => [form.periodStart && formatDate(form.periodStart), form.periodEnd && formatDate(form.periodEnd)].filter(Boolean).join(' – '))
function changes() { return { title: form.title, documentType: form.documentType, recipient: form.recipient, purpose: form.purpose, periodStart: form.periodStart || null, periodEnd: form.periodEnd || null, content: { body: form.body }, sourceManifest: selectedSources.value.map(s => ({ kind: 'session', id: s.id, version: s.version, occurredAt: s.occurredAt })) } }
function snapshot() { return JSON.stringify(changes()) }
const dirty = computed(() => !finalised.value && baseline.value !== snapshot())

onMounted(async () => { try { const [sessionSources, p] = await Promise.all([listDocumentSourceSessions(props.client.id), loadDocumentProfile()]); sources.value = sessionSources; profile.value = p; const ids = new Set((props.document?.sourceManifest || []).filter(i => i.kind === 'session').map(i => i.id)); selectedSourceIds.value = sources.value.filter(s => ids.has(s.id)).map(s => s.id); addedSourceIds.value = [...selectedSourceIds.value]; baseline.value = snapshot() } catch (e) { error.value = e.message || 'Could not load document workspace.' } finally { loading.value = false } })
function appendSources() { const pending = addableSelectedSources.value; const text = pending.map(s => `Session ${formatDate(s.occurredAt)}\n${s.notes || ''}`.trim()).join('\n\n'); if (text) form.body = [form.body.trim(), text].filter(Boolean).join('\n\n'); addedSourceIds.value = [...new Set([...addedSourceIds.value, ...pending.map(s => s.id)])] }
function toggleSourcePreview(id) { expandedSourceId.value = expandedSourceId.value === id ? null : id }
function loadMoreSources() { visibleSourceCount.value += SOURCE_PAGE_SIZE }
function resetSourceWindow() { visibleSourceCount.value = SOURCE_PAGE_SIZE; expandedSourceId.value = null }
async function persistDraft() { currentDocument.value = currentDocument.value ? await saveClientDocumentDraft(currentDocument.value, changes()) : await createClientDocumentDraft({ client: props.client, ...changes() }); baseline.value = snapshot(); saveMessage.value = `Saved ${new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} to Client Documents`; emit('saved', currentDocument.value); return currentDocument.value }
async function saveDraft() { if (saving.value) return; saving.value = true; action.value = 'save'; error.value = ''; try { await persistDraft() } catch (e) { error.value = e.message || 'Could not save this draft.' } finally { saving.value = false; action.value = '' } }
async function finaliseDocument() { if (saving.value || !form.body.trim()) return; if (!window.confirm('Finalise this clinical document? This version will become read-only.')) return; saving.value = true; action.value = 'finalise'; error.value = ''; try { const draft = await persistDraft(); currentDocument.value = await finaliseClientDocument(draft); baseline.value = snapshot(); emit('saved', currentDocument.value) } catch (e) { error.value = e.message || 'Could not finalise this document.' } finally { saving.value = false; action.value = '' } }
async function downloadFinalised() { try { await downloadClientDocument(currentDocument.value) } catch (e) { error.value = e.message } }
function requestClose() { if (saving.value) return; if (!finalised.value && dirty.value && !window.confirm('You have unsaved changes. Close without saving?')) return; emit('close') }
function formatDate(v) { if (!v) return ''; const d = new Date(v.length === 10 ? `${v}T00:00:00` : v); return Number.isNaN(d.getTime()) ? v : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) }
function formatDateTime(v) { return v ? new Date(v).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }) : '' }
</script>

<style scoped>
.clinical-paper{width:min(210mm,100%);min-height:297mm;padding:18mm 19mm;display:flex;flex-direction:column;font-family:'Noto Sans',Arial,sans-serif}.clinical-letterhead{display:flex;justify-content:space-between;gap:24px;font-size:10px;color:#52616b}.clinical-letterhead strong{display:block;font-size:13px;color:#17242b}.clinical-letterhead span{display:block;margin-top:2px}.clinical-rule{height:1px;background:#cfd8dc;margin:14px 0 36px}.clinical-eyebrow{font-size:9px;font-weight:700;letter-spacing:.16em;color:#657780;margin-bottom:10px}.clinical-title{font-size:28px;line-height:1.2;font-weight:600;color:#17242b;margin:0 0 22px}.clinical-meta{display:grid;grid-template-columns:1fr 1fr;gap:14px;padding:14px 0;border-top:1px solid #e2e8ea;border-bottom:1px solid #e2e8ea;margin-bottom:24px}.clinical-meta dt{font-size:9px;text-transform:uppercase;letter-spacing:.1em;color:#718087}.clinical-meta dd{font-size:11px;margin:3px 0 0}.clinical-body{width:100%;flex:1;min-height:520px;border:0;outline:0;resize:none;background:transparent;font:400 10.5pt/1.7 'Noto Sans',Arial,sans-serif;color:#26343b;white-space:pre-wrap;overflow:hidden}.clinical-footer{margin-top:30px;padding-top:10px;border-top:1px solid #e2e8ea;display:flex;justify-content:space-between;gap:20px;font-size:8.5px;color:#718087}
</style>
