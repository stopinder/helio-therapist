<template>
  <section class="bg-surface-elevated border border-border-muted rounded-panel overflow-hidden" data-testid="client-documents-panel">
    <header class="p-6 border-b border-border-muted flex items-center justify-between gap-4">
      <div>
        <h3 class="text-h3 font-semibold text-ink">Documents</h3>
        <p class="text-body-sm text-ink-secondary mt-1">Letters, reports and clinical documents created for this client.</p>
      </div>
      <button v-if="!archived" type="button" class="button-primary" @click="$emit('create')">Create Document</button>
    </header>

    <div v-if="loading" class="p-10 text-center text-ink-muted">Loading documents…</div>
    <div v-else-if="error" class="p-6 text-state-danger">{{ error }}</div>
    <div v-else-if="documents.length === 0" class="p-10 text-center">
      <p class="font-medium text-ink">No documents yet.</p>
      <p class="text-body-sm text-ink-muted mt-2">Create a letter, report or clinical summary when you need one.</p>
    </div>

    <div v-else class="divide-y divide-border-muted">
      <section v-if="draftDocuments.length" aria-labelledby="draft-documents-heading" class="p-6">
        <div class="mb-4">
          <h4 id="draft-documents-heading" class="text-body font-semibold text-ink">Drafts</h4>
          <p class="text-caption text-ink-muted mt-1">Editable working documents.</p>
        </div>
        <div class="divide-y divide-border-muted border-y border-border-muted">
          <article v-for="document in draftDocuments" :key="document.id" class="py-4 flex flex-col md:flex-row md:items-center gap-4 justify-between">
            <div class="min-w-0">
              <h5 class="font-semibold text-ink truncate">{{ document.title }}</h5>
              <p class="text-caption text-ink-muted mt-1">{{ labelType(document.documentType) }} · Updated {{ formatDate(document.updatedAt) }}</p>
              <p v-if="document.purpose" class="text-body-sm text-ink-secondary mt-2 line-clamp-2">{{ document.purpose }}</p>
            </div>
            <button v-if="!archived" type="button" class="button-secondary shrink-0" @click="$emit('edit', document)">Continue editing</button>
          </article>
        </div>
      </section>

      <section v-if="finalisedDocuments.length" aria-labelledby="finalised-documents-heading" class="p-6">
        <div class="mb-4">
          <h4 id="finalised-documents-heading" class="text-body font-semibold text-ink">Finalised</h4>
          <p class="text-caption text-ink-muted mt-1">Read-only documents saved for this client.</p>
        </div>
        <div class="divide-y divide-border-muted border-y border-border-muted">
          <article v-for="document in finalisedDocuments" :key="document.id" class="py-4 flex flex-col md:flex-row md:items-center gap-4 justify-between">
            <div class="min-w-0">
              <h5 class="font-semibold text-ink truncate">{{ document.title }}</h5>
              <p class="text-caption text-ink-muted mt-1">{{ labelType(document.documentType) }} · Finalised {{ formatDate(document.finalizedAt || document.updatedAt) }}</p>
              <p v-if="document.purpose" class="text-body-sm text-ink-secondary mt-2 line-clamp-2">{{ document.purpose }}</p>
            </div>
            <button v-if="document.storagePath" type="button" class="button-secondary shrink-0" @click="$emit('download', document)">Download</button>
          </article>
        </div>
      </section>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  documents: { type: Array, default: () => [] },
  loading: Boolean,
  error: { type: String, default: '' },
  archived: Boolean
})

defineEmits(['create', 'edit', 'download'])

const draftDocuments = computed(() => props.documents.filter(document => document.status !== 'completed'))
const finalisedDocuments = computed(() => props.documents.filter(document => document.status === 'completed'))

function formatDate(value) {
  return value ? new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : ''
}

function labelType(value) {
  return ({
    clinical_summary: 'Clinical summary',
    progress_report: 'Progress report',
    care_letter: 'Care letter',
    other: 'Other'
  })[value] || value || 'Document'
}
</script>
