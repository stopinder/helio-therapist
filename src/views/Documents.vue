<template>
  <div class="page-layout max-w-6xl mx-auto py-8 space-y-6">
    <header class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <p class="type-overline text-ink-muted">Practice library</p>
        <h1 class="type-h1 text-ink">Documents</h1>
        <p class="type-body text-ink-secondary mt-2">Create, manage and export therapist-owned documents. Client documents remain linked to their client record.</p>
      </div>
      <button type="button" class="button-primary" @click="startCreate">Create Document</button>
    </header>

    <div class="flex flex-wrap gap-2">
      <button v-for="item in filters" :key="item.value" type="button" class="button-secondary" :class="filter===item.value?'state-selected font-semibold':''" @click="filter=item.value">{{ item.label }}</button>
    </div>

    <div v-if="loading" class="py-12 text-center text-ink-muted">Loading documents…</div>
    <div v-else-if="filtered.length===0" class="rounded-panel border border-border bg-surface p-10 text-center">
      <h2 class="text-h3 font-semibold">No documents here yet</h2>
      <p class="text-body-sm text-ink-muted mt-2">Create a practice or prospect document, or create a client document from a Client Workspace.</p>
    </div>
    <div v-else class="rounded-panel border border-border bg-surface overflow-hidden">
      <div v-for="doc in filtered" :key="doc.id" class="p-4 border-b last:border-b-0 border-border-muted flex items-center justify-between gap-4">
        <div class="min-w-0">
          <div class="flex items-center gap-2"><strong class="truncate">{{ doc.title }}</strong><span class="text-caption px-2 py-0.5 rounded-pill bg-surface-subtle">{{ scopeLabel(doc.scope) }}</span></div>
          <p class="text-caption text-ink-muted mt-1">{{ typeLabel(doc.documentType) }}<span v-if="doc.clientName"> · {{ doc.clientName }}</span> · {{ doc.status==='completed'?'Final PDF':'Draft' }} · Updated {{ formatDate(doc.updatedAt) }}</p>
        </div>
        <div class="flex gap-2 shrink-0">
          <button v-if="doc.scope!=='client'&&doc.status==='draft'" type="button" class="button-secondary" @click="edit(doc)">Edit</button>
          <button v-if="doc.status==='completed'" type="button" class="button-secondary" @click="download(doc)">Download</button>
        </div>
      </div>
    </div>
    <div v-if="error" class="rounded-control bg-state-danger/10 text-state-danger p-4">{{ error }}</div>
  </div>

  <teleport to="body">
    <div v-if="composerOpen" class="fixed inset-0 z-[70] bg-black/45 p-4 flex items-center justify-center" @click.self="requestClose">
      <section class="relative w-full max-w-3xl max-h-[92vh] overflow-hidden bg-surface-elevated border border-border rounded-panel shadow-overlay flex flex-col" role="dialog" aria-modal="true" aria-labelledby="global-document-composer-title" data-testid="global-document-composer">
        <header class="p-6 border-b border-border-muted flex justify-between gap-4 shrink-0">
          <div>
            <p class="type-overline text-ink-muted">{{ form.scope==='practice'?'Practice document':'Prospect document' }}</p>
            <h2 id="global-document-composer-title" class="text-h2 font-semibold">{{ finalised?'Document Finalised':(current?'Edit Document':'Create Document') }}</h2>
            <p class="text-body-sm text-ink-secondary mt-1">{{ finalised?'The PDF is read-only and safely stored in Documents.':'Not linked to a client. Private reflections and supervision content are never included.' }}</p>
          </div>
          <button type="button" aria-label="Close document composer" class="text-ink-muted hover:text-ink" @click="requestClose">✕</button>
        </header>

        <div class="flex-1 overflow-auto">
          <div v-if="finalised" class="p-8" data-testid="global-document-finalised-success">
            <div class="rounded-panel border border-state-success/20 bg-state-success-surface p-6">
              <p class="text-h3 font-semibold text-state-success">✓ PDF finalised and saved</p>
              <p class="text-body-sm text-ink-secondary mt-2"><strong>{{ current.title }}</strong> is now a read-only PDF in your {{ scopeLabel(current.scope).toLowerCase() }} library.</p>
              <p class="text-caption text-ink-muted mt-3">Finalised {{ formatDateTime(current.finalizedAt) }}.</p>
            </div>
            <div class="mt-5 flex flex-wrap gap-2">
              <button type="button" class="button-primary" @click="download(current)">Download PDF</button>
              <button type="button" class="button-secondary" @click="closeComposer">Close</button>
            </div>
          </div>

          <template v-else>
            <div class="p-6 space-y-4">
              <div v-if="!current" class="grid md:grid-cols-2 gap-4">
                <label><span class="text-caption font-semibold">Scope</span><select v-model="form.scope" class="mt-1 w-full p-3 border border-border rounded-control bg-surface"><option value="practice">Practice</option><option value="prospect">Prospect / marketing</option></select></label>
                <label><span class="text-caption font-semibold">Document type</span><select v-model="form.documentType" class="mt-1 w-full p-3 border border-border rounded-control bg-surface"><option value="agreement">Agreement</option><option value="consent_form">Consent form</option><option value="information_sheet">Information sheet</option><option value="marketing_letter">Marketing / prospect material</option><option value="other">Other</option></select></label>
              </div>
              <label class="block"><span class="text-caption font-semibold">Title</span><input v-model="form.title" class="mt-1 w-full p-3 border border-border rounded-control bg-surface" /></label>
              <div class="grid md:grid-cols-2 gap-4">
                <label><span class="text-caption font-semibold">Recipient</span><input v-model="form.recipient" class="mt-1 w-full p-3 border border-border rounded-control bg-surface" placeholder="Optional" /></label>
                <label><span class="text-caption font-semibold">Purpose</span><input v-model="form.purpose" class="mt-1 w-full p-3 border border-border rounded-control bg-surface" placeholder="Optional" /></label>
              </div>
              <label class="block"><span class="text-caption font-semibold">Document body</span><textarea v-model="form.body" rows="18" class="mt-1 w-full p-4 border border-border rounded-control bg-surface resize-y" /></label>
              <div v-if="modalError" class="p-3 rounded-control bg-state-danger/10 text-state-danger" role="alert">{{ modalError }}</div>
            </div>
          </template>
        </div>

        <footer v-if="!finalised" class="p-6 border-t border-border-muted flex flex-wrap items-center justify-between gap-3 shrink-0">
          <span class="text-caption" :class="dirty?'text-state-warning':'text-ink-muted'">{{ dirty?'Unsaved changes':saveMessage }}</span>
          <div class="flex flex-wrap gap-2">
            <button type="button" class="button-secondary" :disabled="busy" @click="requestClose">Close</button>
            <button type="button" class="button-secondary" :disabled="busy||!form.title.trim()" data-testid="global-document-preview" @click="preview">{{ busy&&action==='preview'?'Preparing…':'Preview PDF' }}</button>
            <button type="button" class="button-secondary" :disabled="busy||!form.title.trim()" data-testid="global-document-save" @click="save">{{ busy&&action==='save'?'Saving…':'Save Draft' }}</button>
            <button type="button" class="button-primary" :disabled="busy||!form.title.trim()||!form.body.trim()" data-testid="global-document-finalise" @click="finalise">{{ busy&&action==='finalise'?'Finalising…':'Finalise PDF' }}</button>
          </div>
        </footer>

        <div v-if="previewUrl" class="absolute inset-4 z-10 bg-surface-elevated border border-border rounded-panel shadow-overlay flex flex-col" data-testid="global-document-pdf-preview">
          <header class="p-4 border-b border-border-muted flex items-center justify-between gap-3">
            <div><strong>PDF preview</strong><p class="text-caption text-ink-muted mt-1">Generated by the same renderer used for finalisation.</p></div>
            <div class="flex gap-2"><button type="button" class="button-secondary" @click="printPreview">Print</button><button type="button" class="button-secondary" @click="closePreview">Back to document</button></div>
          </header>
          <iframe ref="previewFrame" :src="previewUrl" title="PDF preview" class="w-full flex-1 min-h-[70vh] bg-white rounded-b-panel"></iframe>
        </div>
      </section>
    </div>
  </teleport>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { createUnscopedDocumentDraft, downloadDocument, finaliseDocument, listDocuments, previewDocument, saveDocumentDraft } from '../lib/documents.js'

const docs=ref([]),loading=ref(true),error=ref(''),filter=ref('all'),composerOpen=ref(false),current=ref(null),busy=ref(false),action=ref(''),modalError=ref(''),saveMessage=ref('Not saved yet'),baseline=ref(''),previewUrl=ref(''),previewFrame=ref(null)
const filters=[{value:'all',label:'All'},{value:'client',label:'Client Documents'},{value:'practice',label:'Practice Documents'},{value:'prospect',label:'Prospect / Marketing'}]
const form=reactive({scope:'practice',documentType:'agreement',title:'',recipient:'',purpose:'',body:''})
const filtered=computed(()=>filter.value==='all'?docs.value:docs.value.filter(d=>d.scope===filter.value))
const finalised=computed(()=>current.value?.status==='completed')
const snapshot=()=>JSON.stringify(form)
const dirty=computed(()=>!finalised.value&&baseline.value!==snapshot())

onMounted(refresh)
onBeforeUnmount(closePreview)

async function refresh(){loading.value=true;error.value='';try{docs.value=await listDocuments()}catch(e){error.value=e.message||'Could not load documents.'}finally{loading.value=false}}
function startCreate(){closePreview();current.value=null;Object.assign(form,{scope:'practice',documentType:'agreement',title:'',recipient:'',purpose:'',body:''});baseline.value=snapshot();saveMessage.value='Not saved yet';modalError.value='';composerOpen.value=true}
function edit(doc){closePreview();current.value=doc;Object.assign(form,{scope:doc.scope,documentType:doc.documentType,title:doc.title,recipient:doc.recipient,purpose:doc.purpose,body:doc.content?.body||''});baseline.value=snapshot();saveMessage.value='Saved';modalError.value='';composerOpen.value=true}
function changes(){return{title:form.title,documentType:form.documentType,recipient:form.recipient,purpose:form.purpose,content:{body:form.body}}}
async function persist(){current.value=current.value?await saveDocumentDraft(current.value,changes()):await createUnscopedDocumentDraft({scope:form.scope,...changes()});baseline.value=snapshot();saveMessage.value=`Saved ${new Date().toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})} to Documents`;await refresh();return current.value}
async function save(){if(busy.value||!form.title.trim())return;busy.value=true;action.value='save';modalError.value='';try{await persist()}catch(e){modalError.value=e.message||'Could not save this document draft.'}finally{busy.value=false;action.value=''}}
async function preview(){if(busy.value||!form.title.trim())return;busy.value=true;action.value='preview';modalError.value='';try{const d=await persist();const blob=await previewDocument(d);closePreview();previewUrl.value=URL.createObjectURL(blob)}catch(e){modalError.value=e.message||'Could not preview this document.'}finally{busy.value=false;action.value=''}}
async function finalise(){if(busy.value||!form.title.trim()||!form.body.trim())return;if(!window.confirm('Finalise this document? The saved PDF will become read-only.'))return;busy.value=true;action.value='finalise';modalError.value='';try{const d=await persist();current.value=await finaliseDocument(d);baseline.value=snapshot();saveMessage.value='Finalised and saved to Documents';await refresh()}catch(e){modalError.value=e.message||'Could not finalise this document.'}finally{busy.value=false;action.value=''}}
async function download(doc){try{await downloadDocument(doc)}catch(e){modalError.value=e.message||'Could not download this document.';if(!composerOpen.value)error.value=modalError.value}}
function requestClose(){if(busy.value)return;if(dirty.value&&!window.confirm('You have unsaved changes. Close without saving?'))return;closeComposer()}
function closeComposer(){closePreview();composerOpen.value=false;current.value=null;modalError.value='';action.value=''}
function closePreview(){if(previewUrl.value){URL.revokeObjectURL(previewUrl.value);previewUrl.value=''}}
function printPreview(){previewFrame.value?.contentWindow?.print()}
function scopeLabel(s){return s==='client'?'Client':s==='practice'?'Practice':'Prospect / Marketing'}
function typeLabel(v){return String(v||'other').replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase())}
function formatDate(v){return v?new Date(v).toLocaleDateString('en-GB'):''}
function formatDateTime(v){return v?new Date(v).toLocaleString('en-GB',{dateStyle:'medium',timeStyle:'short'}):''}
</script>
