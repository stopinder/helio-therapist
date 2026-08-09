<template>
  <section class="bg-surface-elevated border border-border-muted rounded-panel overflow-hidden">
    <header class="p-5 md:p-6 border-b border-border-muted flex flex-col gap-4">
      <div class="flex items-start justify-between gap-4"><div><h3 class="text-h3 font-semibold text-ink">{{ title }}</h3><p class="text-body-sm text-ink-secondary mt-1">{{ description }}</p></div><button v-if="!archived" type="button" class="button-primary shrink-0" @click="$emit('create')">Create Document</button></div>
      <div class="flex flex-col sm:flex-row gap-3">
        <label class="relative flex-1"><span class="sr-only">Search documents</span><input v-model="search" type="search" class="w-full rounded-control border border-border bg-surface px-3 py-2 text-body-sm" placeholder="Search documents…" /></label>
        <div class="flex rounded-control border border-border p-1 bg-surface-subtle"><button type="button" class="px-3 py-1.5 rounded-control text-body-sm" :class="!archived?'bg-surface-elevated shadow-sm text-ink':'text-ink-muted'" @click="$emit('update:archived',false)">Current</button><button type="button" class="px-3 py-1.5 rounded-control text-body-sm" :class="archived?'bg-surface-elevated shadow-sm text-ink':'text-ink-muted'" @click="$emit('update:archived',true)">Archived</button></div>
      </div>
    </header>
    <div v-if="loading" class="p-10 text-center text-ink-muted">Loading documents…</div>
    <div v-else-if="error" class="p-6 text-state-danger">{{ error }}</div>
    <div v-else-if="filtered.length===0" class="p-10 text-center"><p class="font-medium text-ink">{{ search ? 'No matching documents.' : archived ? 'No archived documents.' : 'No documents yet.' }}</p><p class="text-body-sm text-ink-muted mt-2">{{ archived ? 'Archived documents will remain available here for recovery.' : emptyText }}</p></div>
    <div v-else class="divide-y divide-border-muted">
      <article v-for="document in visible" :key="document.id" class="p-4 md:p-5 flex items-center gap-4 hover:bg-surface-subtle/60 transition-colors">
        <div class="w-10 h-12 rounded-control border border-border-muted bg-surface flex items-center justify-center text-ink-muted shrink-0">PDF</div>
        <button type="button" class="min-w-0 flex-1 text-left" @click="primary(document)"><div class="flex items-center gap-2 flex-wrap"><h4 class="font-semibold text-ink truncate">{{ document.title }}</h4><span class="px-2 py-0.5 rounded-pill text-caption border border-border" :class="document.status==='completed'?'text-state-success':'text-ink-muted'">{{ document.status==='completed'?'Final':'Draft' }}</span></div><p class="text-caption text-ink-muted mt-1">{{ meta(document) }}</p><p v-if="document.purpose" class="text-body-sm text-ink-secondary mt-1 line-clamp-1">{{ document.purpose }}</p></button>
        <div class="flex gap-2 shrink-0"><button v-if="document.status==='completed' && !archived" type="button" class="button-secondary" @click="$emit('view',document)">View</button><button v-else-if="document.status!=='completed' && !archived" type="button" class="button-secondary" @click="$emit('edit',document)">Edit</button><details class="relative"><summary class="button-secondary list-none cursor-pointer" aria-label="More document actions">•••</summary><div class="absolute right-0 z-20 mt-2 w-40 rounded-control border border-border bg-surface-elevated shadow-lg p-1"><button v-if="document.storagePath" class="w-full text-left px-3 py-2 text-body-sm rounded-control hover:bg-surface-subtle" @click="$emit('download',document)">Download</button><button v-if="archived" class="w-full text-left px-3 py-2 text-body-sm rounded-control hover:bg-surface-subtle" @click="$emit('restore',document)">Restore</button><button v-else class="w-full text-left px-3 py-2 text-body-sm rounded-control hover:bg-surface-subtle text-state-danger" @click="$emit('archive',document)">Archive</button></div></details></div>
      </article>
      <div v-if="filtered.length>limit" class="p-4 text-center"><button type="button" class="button-secondary" @click="limit+=10">Load more <span class="text-ink-muted">({{ filtered.length-limit }} remaining)</span></button></div>
    </div>
  </section>
</template>
<script setup>
import { computed, ref, watch } from 'vue';
const props=defineProps({documents:{type:Array,default:()=>[]},loading:Boolean,error:{type:String,default:''},archived:Boolean,title:{type:String,default:'Documents'},description:{type:String,default:'Draft and final documents.'},emptyText:{type:String,default:'Create a document when you are ready.'}});
const emit=defineEmits(['create','edit','view','download','archive','restore','update:archived']);
const search=ref('');const limit=ref(10);
const filtered=computed(()=>{const q=search.value.trim().toLowerCase();return q?props.documents.filter(d=>[d.title,d.clientName,d.purpose,d.documentType].some(v=>String(v||'').toLowerCase().includes(q))):props.documents;});
const visible=computed(()=>filtered.value.slice(0,limit.value));watch([search,()=>props.archived],()=>limit.value=10);
function primary(d){if(props.archived)return;if(d.status==='completed')emit('view',d);else emit('edit',d);}
function meta(d){const bits=[];if(d.clientName)bits.push(d.clientName);if(d.documentType)bits.push(String(d.documentType).replaceAll('_',' '));if(d.updatedAt)bits.push(`Updated ${new Date(d.updatedAt).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})}`);return bits.join(' · ');}
</script>
