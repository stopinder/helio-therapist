<template>
  <div class="fixed inset-0 z-50 bg-ink/60 backdrop-blur-sm flex flex-col" role="dialog" aria-modal="true" aria-label="Document preview">
    <header class="h-16 px-4 md:px-6 bg-surface-elevated border-b border-border-muted flex items-center justify-between gap-4 shadow-sm"><div class="min-w-0"><p class="text-caption uppercase tracking-wider text-ink-muted">Document preview</p><h2 class="font-semibold text-ink truncate">{{ title }}</h2></div><div class="flex items-center gap-2"><button v-if="downloadable" type="button" class="button-secondary" @click="$emit('download')">Download</button><button type="button" class="button-secondary" @click="print">Print</button><button type="button" class="button-primary" @click="$emit('close')">Close</button></div></header>
    <main class="flex-1 overflow-auto p-4 md:p-8 bg-surface-canvas"><div class="max-w-5xl mx-auto min-h-full"><div v-if="loading" class="bg-surface-elevated rounded-panel p-12 text-center text-ink-muted shadow-sm">Preparing preview…</div><div v-else-if="error" class="bg-surface-elevated rounded-panel p-8 text-state-danger shadow-sm">{{ error }}</div><iframe v-else :src="displayUrl" class="block w-full min-h-[calc(100vh-8rem)] bg-white rounded-panel shadow-xl border-0" title="PDF document preview" /></div></main>
  </div>
</template>
<script setup>
defineProps({title:{type:String,default:'Document'},displayUrl:{type:String,default:''},loading:Boolean,error:{type:String,default:''},downloadable:Boolean});
defineEmits(['close','download']);
function print(){window.print();}
</script>
