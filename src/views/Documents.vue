<template>
  <div class="page-layout max-w-6xl mx-auto py-8 space-y-6">
    <header class="flex flex-wrap items-start justify-between gap-4">
      <div><p class="type-overline text-ink-muted">Practice library</p><h1 class="type-h1 text-ink">Documents</h1><p class="type-body text-ink-secondary mt-2">Create polished therapist-owned documents and keep client documents with their clinical record.</p></div>
      <button type="button" class="button-primary" @click="startCreate">Create Document</button>
    </header>
    <div class="flex flex-wrap gap-2"><button v-for="item in filters" :key="item.value" type="button" class="button-secondary" :class="filter===item.value?'state-selected font-semibold':''" @click="filter=item.value">{{ item.label }}</button></div>
    <div v-if="loading" class="py-12 text-center text-ink-muted">Loading documents…</div>
    <div v-else-if="filtered.length===0" class="rounded-panel border border-border bg-surface p-10 text-center"><h2 class="text-h3 font-semibold">No documents here yet</h2><p class="text-body-sm text-ink-muted mt-2">Create a professional practice or prospect document, or create a client document from a Client Workspace.</p></div>
    <div v-else class="rounded-panel border border-border bg-surface overflow-hidden">
      <div v-for="doc in filtered" :key="doc.id" class="p-4 border-b last:border-b-0 border-border-muted flex items-center justify-between gap-4">
        <div class="min-w-0"><div class="flex items-center gap-2"><strong class="truncate">{{ doc.title }}</strong><span class="text-caption px-2 py-0.5 rounded-pill bg-surface-subtle">{{ scopeLabel(doc.scope) }}</span></div><p class="text-caption text-ink-muted mt-1">{{ typeLabel(doc.documentType) }}<span v-if="doc.clientName"> · {{ doc.clientName }}</span> · {{ doc.status==='completed'?'Final PDF':'Draft' }} · Updated {{ formatDate(doc.updatedAt) }}</p></div>
        <div class="flex gap-2 shrink-0"><button v-if="doc.scope!=='client'&&doc.status==='draft'" type="button" class="button-secondary" @click="edit(doc)">Edit</button><button v-if="doc.status==='completed'" type="button" class="button-secondary" @click="download(doc)">Download</button></div>
      </div>
    </div>
    <div v-if="error" class="rounded-control bg-state-danger/10 text-state-danger p-4">{{ error }}</div>
  </div>

  <teleport to="body">
    <div v-if="composerOpen" class="fixed inset-0 z-[70] bg-black/45 flex" data-testid="professional-document-composer">
      <section class="w-full h-full bg-surface-subtle flex flex-col" role="dialog" aria-modal="true" aria-labelledby="document-composer-title">
        <header class="px-5 py-3 border-b border-border bg-surface-elevated flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div><p class="type-overline text-ink-muted">Document studio</p><h2 id="document-composer-title" class="text-h3 font-semibold">{{ current?'Edit document':'Create document' }}</h2></div>
          <div class="flex items-center gap-2"><span class="text-caption" :class="dirty?'text-state-warning':'text-ink-muted'">{{ dirty?'Unsaved changes':saveMessage }}</span><button class="button-secondary" :disabled="busy" @click="save">Save Draft</button><button class="button-primary" :disabled="busy||!form.title.trim()||!form.body.trim()" data-testid="document-export" @click="exportPdf">Export / Print PDF</button><button class="button-secondary" @click="requestClose">Close</button></div>
        </header>
        <div class="flex-1 min-h-0 grid lg:grid-cols-[300px_1fr]">
          <aside class="border-r border-border bg-surface-elevated p-5 overflow-auto space-y-5">
            <div v-if="!current"><label class="block text-caption font-semibold mb-2">Start from a template</label><div class="space-y-2"><button v-for="template in templates" :key="template.id" type="button" class="w-full text-left p-3 rounded-control border transition" :class="form.documentType===template.id?'border-action-link bg-state-selected':'border-border hover:bg-surface-subtle'" @click="applyTemplate(template)"><strong class="text-body-sm">{{ template.label }}</strong><span class="block text-caption text-ink-muted mt-1">{{ template.scope==='prospect'?'Prospect / marketing':'Practice' }}</span></button></div></div>
            <label class="block"><span class="text-caption font-semibold">Title</span><input v-model="form.title" class="mt-1 w-full p-2.5 border border-border rounded-control bg-surface" /></label>
            <label class="block"><span class="text-caption font-semibold">Recipient</span><input v-model="form.recipient" class="mt-1 w-full p-2.5 border border-border rounded-control bg-surface" placeholder="Optional" /></label>
            <label class="block"><span class="text-caption font-semibold">Purpose</span><input v-model="form.purpose" class="mt-1 w-full p-2.5 border border-border rounded-control bg-surface" placeholder="Optional" /></label>
            <div class="rounded-control bg-surface-subtle p-3"><p class="text-caption text-ink-muted">The page on the right is the document. Edit it there, then export the same layout to your browser's PDF/print destination.</p></div>
            <div v-if="modalError" class="p-3 rounded-control bg-state-danger/10 text-state-danger text-body-sm">{{ modalError }}</div>
          </aside>
          <main class="overflow-auto p-4 sm:p-8" data-testid="document-canvas-wrap">
            <article ref="paper" class="document-paper mx-auto bg-white text-[#1f2933] shadow-lg" data-testid="document-canvas">
              <div class="document-brand"><span>HELIO</span><span>THERAPIST</span></div>
              <div class="document-rule"></div>
              <p class="document-eyebrow">{{ selectedTemplate.eyebrow }}</p>
              <h1 class="document-title">{{ form.title || 'Untitled Document' }}</h1>
              <dl v-if="form.recipient||form.purpose" class="document-meta"><div v-if="form.recipient"><dt>For</dt><dd>{{ form.recipient }}</dd></div><div v-if="form.purpose"><dt>Purpose</dt><dd>{{ form.purpose }}</dd></div></dl>
              <textarea v-model="form.body" class="document-body-editor" aria-label="Document content" spellcheck="true" />
              <footer class="document-footer"><span>Helio Therapist</span><span>Professional document</span></footer>
            </article>
          </main>
        </div>
      </section>
    </div>
  </teleport>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { createUnscopedDocumentDraft, downloadDocument, listDocuments, saveDocumentDraft } from '../lib/documents.js'
import { DOCUMENT_TEMPLATES, getDocumentTemplate, templateBody } from '../lib/documentTemplates.js'

const docs=ref([]),loading=ref(true),error=ref(''),filter=ref('all'),composerOpen=ref(false),current=ref(null),busy=ref(false),modalError=ref(''),saveMessage=ref('Not saved yet'),baseline=ref(''),paper=ref(null)
const filters=[{value:'all',label:'All'},{value:'client',label:'Client Documents'},{value:'practice',label:'Practice Documents'},{value:'prospect',label:'Prospect / Marketing'}]
const templates=DOCUMENT_TEMPLATES
const form=reactive({scope:'practice',documentType:'agreement',title:'',recipient:'',purpose:'',body:''})
const filtered=computed(()=>filter.value==='all'?docs.value:docs.value.filter(d=>d.scope===filter.value))
const selectedTemplate=computed(()=>getDocumentTemplate(form.documentType))
const snapshot=()=>JSON.stringify(form)
const dirty=computed(()=>baseline.value!==snapshot())
onMounted(refresh)
async function refresh(){loading.value=true;error.value='';try{docs.value=await listDocuments()}catch(e){error.value=e.message||'Could not load documents.'}finally{loading.value=false}}
function applyTemplate(template){form.scope=template.scope;form.documentType=template.id;form.title=template.title;form.purpose=template.purpose;form.body=templateBody(template)}
function startCreate(){current.value=null;Object.assign(form,{scope:'practice',documentType:'agreement',title:'',recipient:'',purpose:'',body:''});applyTemplate(getDocumentTemplate('agreement'));baseline.value=snapshot();saveMessage.value='Not saved yet';modalError.value='';composerOpen.value=true}
function edit(doc){current.value=doc;Object.assign(form,{scope:doc.scope,documentType:doc.documentType,title:doc.title,recipient:doc.recipient,purpose:doc.purpose,body:doc.content?.body||''});baseline.value=snapshot();saveMessage.value='Saved';modalError.value='';composerOpen.value=true}
function changes(){return{title:form.title,documentType:form.documentType,recipient:form.recipient,purpose:form.purpose,content:{body:form.body}}}
async function persist(){current.value=current.value?await saveDocumentDraft(current.value,changes()):await createUnscopedDocumentDraft({scope:form.scope,...changes()});baseline.value=snapshot();saveMessage.value=`Saved ${new Date().toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})} to Documents`;await refresh();return current.value}
async function save(){if(busy.value||!form.title.trim())return;busy.value=true;modalError.value='';try{await persist()}catch(e){modalError.value=e.message||'Could not save this document draft.'}finally{busy.value=false}}
async function exportPdf(){if(busy.value)return;busy.value=true;modalError.value='';try{await persist();window.print()}catch(e){modalError.value=e.message||'Could not prepare this document for export.'}finally{busy.value=false}}
async function download(doc){try{await downloadDocument(doc)}catch(e){error.value=e.message||'Could not download this document.'}}
function requestClose(){if(busy.value)return;if(dirty.value&&!window.confirm('You have unsaved changes. Close without saving?'))return;composerOpen.value=false;current.value=null;modalError.value=''}
function scopeLabel(s){return s==='client'?'Client':s==='practice'?'Practice':'Prospect / Marketing'}
function typeLabel(v){return String(v||'other').replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase())}
function formatDate(v){return v?new Date(v).toLocaleDateString('en-GB'):''}
</script>

<style scoped>
.document-paper{width:min(210mm,100%);min-height:297mm;padding:20mm 19mm 18mm;display:flex;flex-direction:column;font-family:'Noto Sans',Arial,sans-serif}.document-brand{display:flex;justify-content:space-between;font-size:10px;font-weight:700;letter-spacing:.18em;color:#52616b}.document-rule{height:1px;background:#cfd8dc;margin:12px 0 42px}.document-eyebrow{font-size:10px;font-weight:700;letter-spacing:.16em;color:#657780;margin:0 0 12px}.document-title{font-size:30px;line-height:1.2;font-weight:600;letter-spacing:-.02em;margin:0 0 24px;color:#17242b}.document-meta{display:grid;grid-template-columns:1fr 1fr;gap:16px;padding:14px 0;border-top:1px solid #e2e8ea;border-bottom:1px solid #e2e8ea;margin-bottom:28px}.document-meta dt{font-size:9px;text-transform:uppercase;letter-spacing:.12em;color:#718087}.document-meta dd{font-size:12px;margin:4px 0 0}.document-body-editor{width:100%;flex:1;min-height:560px;border:0;outline:0;resize:none;background:transparent;font:400 11pt/1.7 'Noto Sans',Arial,sans-serif;color:#26343b;white-space:pre-wrap;overflow:hidden}.document-footer{margin-top:36px;padding-top:12px;border-top:1px solid #e2e8ea;display:flex;justify-content:space-between;font-size:9px;color:#718087}
@media print{ :global(body *){visibility:hidden!important} .document-paper,.document-paper *{visibility:visible!important} .document-paper{position:absolute;left:0;top:0;width:210mm;min-height:297mm;box-shadow:none;padding:18mm 19mm}.document-body-editor{overflow:visible;resize:none} @page{size:A4;margin:0} }
</style>
