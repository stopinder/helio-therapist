<template>
  <div class="page-layout max-w-6xl mx-auto py-8 space-y-6">
    <header class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <p class="type-overline text-ink-muted">Practice library</p>
        <h1 class="type-h1 text-ink">Documents</h1>
        <p class="type-body text-ink-secondary mt-2">Create polished therapist-owned documents and keep client documents with their clinical record.</p>
      </div>
      <button type="button" class="button-primary" @click="startCreate">Create Document</button>
    </header>

    <PracticeIdentityEditor @updated="profile = $event" />
    <div v-if="loading" class="py-12 text-center text-ink-muted">Loading documents…</div>
    <DocumentLibrary v-else :documents="docs" @edit="edit" @download="download" />
    <div v-if="error" class="rounded-control bg-state-danger/10 text-state-danger p-4">{{ error }}</div>
  </div>

  <teleport to="body">
    <div v-if="composerOpen" class="fixed inset-0 z-[70] bg-black/45 flex" data-testid="professional-document-composer">
      <section class="w-full h-full bg-surface-subtle flex flex-col" role="dialog" aria-modal="true" aria-labelledby="document-composer-title">
        <header class="px-5 py-3 border-b border-border bg-surface-elevated flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div>
            <p class="type-overline text-ink-muted">Document studio</p>
            <h2 id="document-composer-title" class="text-h3 font-semibold">{{ current ? 'Edit document' : 'Create document' }}</h2>
          </div>
          <div class="flex flex-wrap items-center justify-end gap-2">
            <span class="text-caption" :class="dirty ? 'text-state-warning' : 'text-ink-muted'">{{ dirty ? 'Unsaved changes' : saveMessage }}</span>
            <button class="button-secondary" :disabled="busy" @click="save">Save Draft</button>
            <button class="button-primary" :disabled="busy || !form.title.trim() || !form.body.trim()" data-testid="document-export" @click="exportPdf">Export / Print PDF</button>
            <button class="button-secondary" @click="requestClose">Close</button>
          </div>
        </header>

        <div class="shrink-0 border-b border-border bg-surface-elevated px-5 py-3">
          <div class="max-w-7xl mx-auto flex flex-col gap-3">
            <div class="flex flex-wrap items-center gap-3">
              <div class="flex items-center gap-2 min-w-0">
                <span class="type-caption font-semibold text-ink-muted">Template</span>
                <strong class="type-body-sm text-ink truncate">{{ selectedTemplate.label }}</strong>
                <span class="type-caption text-ink-muted">{{ selectedTemplate.scope === 'prospect' ? 'Practice Resource' : 'Practice' }}</span>
              </div>
              <button v-if="!current" type="button" class="button-secondary" :aria-expanded="templatePickerOpen" @click="templatePickerOpen = !templatePickerOpen">
                {{ templatePickerOpen ? 'Done' : 'Change template' }}
              </button>
              <div class="flex-1"></div>
              <label class="flex items-center gap-2 min-w-[15rem] flex-1 max-w-sm">
                <span class="type-caption font-semibold text-ink-muted shrink-0">Title</span>
                <input v-model="form.title" class="control-field" />
              </label>
              <label class="flex items-center gap-2 min-w-[15rem] flex-1 max-w-sm">
                <span class="type-caption font-semibold text-ink-muted shrink-0">Recipient</span>
                <input v-model="form.recipient" class="control-field" placeholder="Optional" />
              </label>
              <label class="flex items-center gap-2 min-w-[15rem] flex-1 max-w-sm">
                <span class="type-caption font-semibold text-ink-muted shrink-0">Purpose</span>
                <input v-model="form.purpose" class="control-field" placeholder="Optional" />
              </label>
            </div>

            <div v-if="templatePickerOpen && !current" class="grid sm:grid-cols-2 lg:grid-cols-3 gap-2" aria-label="Document templates">
              <button
                v-for="template in templates"
                :key="template.id"
                type="button"
                class="text-left p-3 rounded-control border transition-colors"
                :class="form.documentType === template.id ? 'border-action-link bg-state-selected' : 'border-border hover:bg-surface-subtle'"
                @click="applyTemplate(template)"
              >
                <strong class="type-body-sm text-ink">{{ template.label }}</strong>
                <span class="block type-caption text-ink-muted mt-1">{{ template.scope === 'prospect' ? 'Practice Resource' : 'Practice' }}</span>
              </button>
            </div>

            <div v-if="modalError" class="p-3 rounded-control bg-state-danger/10 text-state-danger type-body-sm">{{ modalError }}</div>
          </div>
        </div>

        <main class="flex-1 min-h-0 overflow-auto p-4 sm:p-8" aria-label="Document editor">
          <article class="document-paper mx-auto bg-white text-ink shadow-lg" data-testid="document-canvas">
            <header class="document-letterhead">
              <div>
                <strong>{{ profile.practiceName || profile.fullName || 'Your practice' }}</strong>
                <span v-if="profile.professionalTitle">{{ profile.professionalTitle }}</span>
              </div>
              <div class="document-contact">
                <span v-if="profile.email">{{ profile.email }}</span>
                <span v-if="profile.phone">{{ profile.phone }}</span>
                <span v-if="profile.website">{{ profile.website }}</span>
              </div>
            </header>
            <div class="document-rule"></div>
            <p class="document-eyebrow">{{ selectedTemplate.eyebrow }}</p>
            <h1 class="document-title">{{ form.title || 'Untitled Document' }}</h1>
            <dl v-if="form.recipient || form.purpose" class="document-meta">
              <div v-if="form.recipient"><dt>For</dt><dd>{{ form.recipient }}</dd></div>
              <div v-if="form.purpose"><dt>Purpose</dt><dd>{{ form.purpose }}</dd></div>
            </dl>
            <textarea v-model="form.body" class="document-body-editor" aria-label="Document content" spellcheck="true" />
            <footer class="document-footer">
              <span>{{ profile.address || profile.practiceName || profile.fullName || 'Helio Therapist' }}</span>
              <span>{{ profile.footer || 'Professional document' }}</span>
            </footer>
          </article>
        </main>
      </section>
    </div>
  </teleport>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { createUnscopedDocumentDraft, downloadDocument, listDocuments, saveDocumentDraft } from '../lib/documents.js';
import { DOCUMENT_TEMPLATES, getDocumentTemplate, templateBody } from '../lib/documentTemplates.js';
import PracticeIdentityEditor from '../components/documents/PracticeIdentityEditor.vue';
import DocumentLibrary from '../components/documents/DocumentLibrary.vue';

const docs = ref([]);
const loading = ref(true);
const error = ref('');
const composerOpen = ref(false);
const current = ref(null);
const busy = ref(false);
const modalError = ref('');
const saveMessage = ref('Not saved yet');
const baseline = ref('');
const templatePickerOpen = ref(false);
const profile = ref({ fullName: '', practiceName: '', professionalTitle: '', email: '', phone: '', website: '', address: '', footer: '' });
const templates = DOCUMENT_TEMPLATES;
const form = reactive({ scope: 'practice', documentType: 'agreement', title: '', recipient: '', purpose: '', body: '' });
const selectedTemplate = computed(() => getDocumentTemplate(form.documentType));
const snapshot = () => JSON.stringify(form);
const dirty = computed(() => baseline.value !== snapshot());

onMounted(refresh);

async function refresh() {
  loading.value = true;
  error.value = '';
  try {
    docs.value = await listDocuments();
  } catch (e) {
    error.value = e.message || 'Could not load documents.';
  } finally {
    loading.value = false;
  }
}

function applyTemplate(template) {
  form.scope = template.scope;
  form.documentType = template.id;
  form.title = template.title;
  form.purpose = template.purpose;
  form.body = templateBody(template);
  templatePickerOpen.value = false;
}

function startCreate() {
  current.value = null;
  Object.assign(form, { scope: 'practice', documentType: 'agreement', title: '', recipient: '', purpose: '', body: '' });
  applyTemplate(getDocumentTemplate('agreement'));
  baseline.value = snapshot();
  saveMessage.value = 'Not saved yet';
  modalError.value = '';
  templatePickerOpen.value = false;
  composerOpen.value = true;
}

function edit(document) {
  current.value = document;
  Object.assign(form, { scope: document.scope, documentType: document.documentType, title: document.title, recipient: document.recipient, purpose: document.purpose, body: document.content?.body || '' });
  baseline.value = snapshot();
  saveMessage.value = 'Saved';
  modalError.value = '';
  templatePickerOpen.value = false;
  composerOpen.value = true;
}

function changes() {
  return { title: form.title, documentType: form.documentType, recipient: form.recipient, purpose: form.purpose, content: { body: form.body } };
}

async function persist() {
  current.value = current.value
    ? await saveDocumentDraft(current.value, changes())
    : await createUnscopedDocumentDraft({ scope: form.scope, ...changes() });
  baseline.value = snapshot();
  saveMessage.value = `Saved ${new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} to Documents`;
  await refresh();
  return current.value;
}

async function save() {
  if (busy.value || !form.title.trim()) return;
  busy.value = true;
  modalError.value = '';
  try {
    await persist();
  } catch (e) {
    modalError.value = e.message || 'Could not save this document draft.';
  } finally {
    busy.value = false;
  }
}

async function exportPdf() {
  if (busy.value) return;
  busy.value = true;
  modalError.value = '';
  try {
    await persist();
    window.print();
  } catch (e) {
    modalError.value = e.message || 'Could not prepare this document for export.';
  } finally {
    busy.value = false;
  }
}

async function download(document) {
  try {
    await downloadDocument(document);
  } catch (e) {
    error.value = e.message || 'Could not download this document.';
  }
}

function requestClose() {
  if (busy.value) return;
  if (dirty.value && !window.confirm('You have unsaved changes. Close without saving?')) return;
  composerOpen.value = false;
  current.value = null;
  templatePickerOpen.value = false;
  modalError.value = '';
}
</script>

<style scoped>
.document-paper{width:min(210mm,100%);min-height:297mm;padding:18mm 19mm;display:flex;flex-direction:column;font-family:'Noto Sans',Arial,sans-serif}.document-letterhead{display:flex;justify-content:space-between;gap:24px;font-size:10px;color:#52616b}.document-letterhead strong{display:block;font-size:15px;color:#17242b}.document-letterhead span{display:block;margin-top:2px}.document-contact{text-align:right}.document-rule{height:1px;background:#cfd8dc;margin:16px 0 38px}.document-eyebrow{font-size:10px;font-weight:700;letter-spacing:.16em;color:#657780;margin:0 0 12px}.document-title{font-size:30px;line-height:1.2;font-weight:600;letter-spacing:-.02em;margin:0 0 24px;color:#17242b}.document-meta{display:grid;grid-template-columns:1fr 1fr;gap:16px;padding:14px 0;border-top:1px solid #e2e8ea;border-bottom:1px solid #e2e8ea;margin-bottom:28px}.document-meta dt{font-size:9px;text-transform:uppercase;letter-spacing:.12em;color:#718087}.document-meta dd{font-size:12px;margin:4px 0 0}.document-body-editor{width:100%;flex:1;min-height:560px;border:0;outline:0;resize:none;background:transparent;font:400 11pt/1.7 'Noto Sans',Arial,sans-serif;color:#26343b;white-space:pre-wrap;overflow:hidden}.document-footer{margin-top:36px;padding-top:12px;border-top:1px solid #e2e8ea;display:flex;justify-content:space-between;gap:20px;font-size:9px;color:#718087;white-space:pre-line}@media print{:global(body *){visibility:hidden!important}.document-paper,.document-paper *{visibility:visible!important}.document-paper{position:absolute;left:0;top:0;width:210mm;min-height:297mm;box-shadow:none;padding:18mm 19mm}.document-body-editor{overflow:visible;resize:none}@page{size:A4;margin:0}}
</style>
