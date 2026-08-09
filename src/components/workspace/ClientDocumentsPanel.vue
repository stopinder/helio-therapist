<template>
  <section class="bg-surface-elevated border border-border-muted rounded-panel overflow-hidden" data-testid="client-documents-panel">
    <header class="p-6 border-b border-border-muted flex items-center justify-between gap-4"><div><h3 class="text-h3 font-semibold text-ink">Documents</h3><p class="text-body-sm text-ink-secondary mt-1">Draft and finalised documents for this client.</p></div><button type="button" class="button-primary" @click="$emit('create')">Create Document</button></header>
    <div v-if="loading" class="p-10 text-center text-ink-muted">Loading documents…</div>
    <div v-else-if="error" class="p-6 text-state-danger">{{ error }}</div>
    <div v-else-if="documents.length === 0" class="p-10 text-center"><p class="font-medium text-ink">No client documents yet.</p><p class="text-body-sm text-ink-muted mt-2">Create a recoverable draft from the client workspace.</p></div>
    <div v-else class="divide-y divide-border-muted">
      <article v-for="document in documents" :key="document.id" class="p-5 flex flex-col md:flex-row md:items-center gap-4 justify-between"><div class="min-w-0"><div class="flex items-center gap-2 flex-wrap"><h4 class="font-semibold text-ink truncate">{{ document.title }}</h4><span class="px-2 py-0.5 rounded-pill text-caption border border-border" :class="document.status === 'completed' ? 'text-state-success' : 'text-ink-muted'">{{ document.status }}</span></div><p class="text-caption text-ink-muted mt-1">{{ labelType(document.documentType) }} · Updated {{ formatDate(document.updatedAt) }}</p><p v-if="document.purpose" class="text-body-sm text-ink-secondary mt-2 line-clamp-2">{{ document.purpose }}</p></div><div class="flex gap-2 shrink-0"><button v-if="document.status !== 'completed'" type="button" class="button-secondary" @click="$emit('edit', document)">Edit Draft</button><button v-if="document.storagePath" type="button" class="button-secondary" @click="$emit('download', document)">Download</button></div></article>
    </div>
  </section>
</template>
<script setup>
defineProps({ documents: { type: Array, default: () => [] }, loading: Boolean, error: { type: String, default: '' } });
defineEmits(['create', 'edit', 'download']);
function formatDate(value) { return value ? new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : ''; }
function labelType(value) { return ({ clinical_summary: 'Clinical summary', progress_report: 'Progress report', care_letter: 'Care letter', other: 'Other' })[value] || value || 'Document'; }
</script>
