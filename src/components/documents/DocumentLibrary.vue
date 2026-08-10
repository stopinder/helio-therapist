<template>
  <section class="space-y-4" data-testid="document-library">
    <div class="flex flex-col sm:flex-row sm:items-center gap-3">
      <label class="relative flex-1"><span class="sr-only">Search documents</span><input v-model="query" type="search" class="w-full p-2.5 border border-border rounded-control bg-surface" placeholder="Search documents, clients or document types…" data-testid="document-search" /></label>
      <div class="flex flex-wrap gap-2" aria-label="Document filters"><button v-for="item in filters" :key="item.value" type="button" class="button-secondary" :class="filter===item.value?'state-selected font-semibold':''" @click="filter=item.value">{{ item.label }}</button></div>
    </div>

    <div v-if="visibleDocuments.length===0" class="rounded-panel border border-border bg-surface p-10 text-center"><h2 class="text-h3 font-semibold">No documents here yet</h2><p class="text-body-sm text-ink-muted mt-2">{{ query ? 'Try a different search or filter.' : 'Create a professional practice or prospect document, or create a client document from a Client Workspace.' }}</p></div>

    <div v-else class="space-y-3">
      <section v-for="section in sections" v-show="section.documents.length" :key="section.scope" class="rounded-panel border border-border bg-surface overflow-hidden">
        <button type="button" class="w-full p-4 flex items-center justify-between gap-4 text-left hover:bg-surface-subtle" :aria-expanded="isOpen(section.key)" @click="toggle(section.key)"><span><strong class="text-body font-semibold">{{ section.label }}</strong><span class="ml-2 text-caption text-ink-muted">{{ section.documents.length }} {{ section.documents.length===1?'document':'documents' }}</span></span><span class="text-ink-muted" aria-hidden="true">{{ isOpen(section.key)?'▾':'▸' }}</span></button>
        <div v-if="isOpen(section.key)" class="border-t border-border-muted">
          <template v-if="section.scope==='client'">
            <div v-for="group in groupClients(section.documents)" :key="group.key" class="border-b last:border-b-0 border-border-muted">
              <button type="button" class="w-full px-4 py-3 flex items-center justify-between gap-4 text-left bg-surface-subtle/40 hover:bg-surface-subtle" :aria-expanded="isOpen(group.key)" @click="toggle(group.key)"><span><strong class="text-body-sm">{{ group.label }}</strong><span class="ml-2 text-caption text-ink-muted">{{ group.documents.length }} {{ group.documents.length===1?'document':'documents' }}</span></span><span class="text-ink-muted" aria-hidden="true">{{ isOpen(group.key)?'▾':'▸' }}</span></button><div v-if="isOpen(group.key)"><DocumentRow v-for="doc in group.documents" :key="doc.id" :doc="doc" @edit="$emit('edit',$event)" @download="$emit('download',$event)" /></div>
            </div>
          </template>
          <template v-else-if="section.scope==='practice'">
            <div v-for="group in groupTypes(section.documents,'practice')" :key="group.key" class="border-b last:border-b-0 border-border-muted"><button type="button" class="w-full px-4 py-3 flex items-center justify-between gap-4 text-left bg-surface-subtle/40 hover:bg-surface-subtle" :aria-expanded="isOpen(group.key)" @click="toggle(group.key)"><span><strong class="text-body-sm">{{ group.label }}</strong><span class="ml-2 text-caption text-ink-muted">{{ group.documents.length }}</span></span><span class="text-ink-muted" aria-hidden="true">{{ isOpen(group.key)?'▾':'▸' }}</span></button><div v-if="isOpen(group.key)"><DocumentRow v-for="doc in group.documents" :key="doc.id" :doc="doc" @edit="$emit('edit',$event)" @download="$emit('download',$event)" /></div></div>
          </template>
          <template v-else><DocumentRow v-for="doc in section.documents" :key="doc.id" :doc="doc" @edit="$emit('edit',$event)" @download="$emit('download',$event)" /></template>
        </div>
      </section>
    </div>
  </section>
</template>
<script setup>
import { computed,defineComponent,h,ref } from 'vue';
const props=defineProps({documents:{type:Array,default:()=>[]}});defineEmits(['edit','download']);
const query=ref(''),filter=ref('all'),open=ref(new Set(['scope:client','scope:practice','scope:prospect']));
const filters=[{value:'all',label:'All'},{value:'client',label:'Client Documents'},{value:'practice',label:'Practice Documents'},{value:'prospect',label:'Prospect / Marketing'}];
const typeLabel=v=>String(v||'other').replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase());const formatDate=v=>v?new Date(v).toLocaleDateString('en-GB'):'';
const visibleDocuments=computed(()=>{const q=query.value.trim().toLowerCase();return props.documents.filter(doc=>(filter.value==='all'||doc.scope===filter.value)&&(!q||[doc.title,doc.clientName,typeLabel(doc.documentType),doc.status].some(value=>String(value||'').toLowerCase().includes(q))))});
const sections=computed(()=>[{scope:'client',key:'scope:client',label:'Client Documents'},{scope:'practice',key:'scope:practice',label:'Practice Documents'},{scope:'prospect',key:'scope:prospect',label:'Prospect / Marketing'}].map(section=>({...section,documents:visibleDocuments.value.filter(doc=>doc.scope===section.scope)})));
function groupClients(documents){const groups=new Map();for(const doc of documents){const label=doc.clientName||'Unknown client';const key=`client:${doc.clientId||label}`;if(!groups.has(key))groups.set(key,{key,label,documents:[]});groups.get(key).documents.push(doc)}return [...groups.values()].sort((a,b)=>a.label.localeCompare(b.label))}
function groupTypes(documents,prefix){const groups=new Map();for(const doc of documents){const label=typeLabel(doc.documentType);const key=`${prefix}:type:${doc.documentType||'other'}`;if(!groups.has(key))groups.set(key,{key,label,documents:[]});groups.get(key).documents.push(doc)}return [...groups.values()].sort((a,b)=>a.label.localeCompare(b.label))}
function isOpen(key){return open.value.has(key)}function toggle(key){const next=new Set(open.value);next.has(key)?next.delete(key):next.add(key);open.value=next}
const DocumentRow=defineComponent({props:{doc:{type:Object,required:true}},emits:['edit','download'],setup(p,{emit}){return()=>h('div',{class:'px-4 py-3 border-t first:border-t-0 border-border-muted flex items-center justify-between gap-4'},[h('div',{class:'min-w-0'},[h('strong',{class:'block truncate text-body-sm'},p.doc.title),h('p',{class:'text-caption text-ink-muted mt-1'},`${typeLabel(p.doc.documentType)} · ${p.doc.status==='completed'?'Final PDF':'Draft'} · Updated ${formatDate(p.doc.updatedAt)}`)]),h('div',{class:'flex gap-2 shrink-0'},[p.doc.scope!=='client'&&p.doc.status==='draft'?h('button',{type:'button',class:'button-secondary',onClick:()=>emit('edit',p.doc)},'Edit'):null,p.doc.status==='completed'?h('button',{type:'button',class:'button-secondary',onClick:()=>emit('download',p.doc)},'Download'):null])])}});
</script>
