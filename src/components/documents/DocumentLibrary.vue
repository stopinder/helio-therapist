<template>
  <section class="space-y-6" data-testid="document-library">
    <div class="inline-flex rounded-full border border-border bg-[#eef1eb] p-1 shadow-sm" aria-label="Library view">
      <button
        type="button"
        class="rounded-full px-5 py-2 text-body-sm transition"
        :class="view==='documents' ? 'bg-white text-ink shadow-sm font-semibold' : 'text-ink-muted hover:text-ink'"
        @click="view='documents'"
      >
        Documents
      </button>
      <button
        type="button"
        class="rounded-full px-5 py-2 text-body-sm transition"
        :class="view==='resources' ? 'bg-white text-ink shadow-sm font-semibold' : 'text-ink-muted hover:text-ink'"
        @click="view='resources'"
      >
        Practice Resources
      </button>
    </div>

    <template v-if="view==='resources'">
      <section class="overflow-hidden rounded-[28px] border border-[#dce4db] bg-[#f4f1e8] shadow-[0_18px_55px_rgba(53,72,65,0.06)]">
        <div class="px-6 py-7 sm:px-8 sm:py-9">
          <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8c6b48]">Practice resources</p>
          <div class="mt-3 grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-end">
            <div>
              <h2 class="max-w-3xl font-serif text-[34px] leading-[1.05] text-[#284548] sm:text-[42px]">Useful material for the work you do with clients.</h2>
              <p class="mt-3 max-w-2xl text-body-sm leading-6 text-[#69736d]">Keep worksheets, measures and psychoeducation close at hand. Build a small library that feels like your practice, not a file store.</p>
            </div>
            <label class="relative block">
              <span class="sr-only">Search practice resources</span>
              <span class="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#91a097]" aria-hidden="true">⌕</span>
              <input
                v-model="query"
                type="search"
                class="w-full rounded-full border border-[#d5ddd4] bg-white/90 py-3 pl-10 pr-4 text-body-sm text-ink outline-none transition focus:border-[#8ca299] focus:ring-2 focus:ring-[#dfe8e1]"
                placeholder="Search resources…"
                data-testid="document-search"
              />
            </label>
          </div>
        </div>

        <div class="border-t border-[#dde4dc] bg-white/35 px-6 py-5 sm:px-8">
          <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div class="inline-flex w-fit rounded-full bg-[#e6ebe4] p-1">
              <button
                v-for="item in resourceLibraries"
                :key="item.value"
                type="button"
                class="rounded-full px-4 py-2 text-[12px] transition"
                :class="resourceLibrary===item.value ? 'bg-white text-[#284548] shadow-sm font-semibold' : 'text-[#6d786f] hover:text-[#284548]'"
                @click="resourceLibrary=item.value"
              >
                {{ item.label }}
              </button>
            </div>

            <div class="flex flex-wrap gap-2" aria-label="Resource categories">
              <button
                v-for="item in resourceCategories"
                :key="item"
                type="button"
                class="rounded-full border px-3.5 py-1.5 text-[11px] transition"
                :class="resourceCategory===item ? 'border-[#9caf9f] bg-[#dde7dc] text-[#35514b] font-semibold' : 'border-[#d6ddd5] bg-white/70 text-[#68746d] hover:border-[#b7c6b9]'"
                @click="resourceCategory=item"
              >
                {{ item }}
              </button>
            </div>
          </div>
        </div>
      </section>

      <div v-if="resourceLibrary==='helios'" class="rounded-[24px] border border-dashed border-[#cdd8cf] bg-[#f8f6ef] px-7 py-10 text-center">
        <p class="font-serif text-[25px] text-[#284548]">The Helios library is taking shape.</p>
        <p class="mx-auto mt-2 max-w-xl text-body-sm leading-6 text-[#6f7972]">Verified measures and carefully designed worksheets will live here. The first set will include outcome measures, CBT worksheets and everyday practice resources.</p>
      </div>

      <div v-else-if="resourceCards.length" class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <article
          v-for="doc in resourceCards"
          :key="doc.id"
          class="group rounded-[24px] border border-[#dce3db] bg-[#fbfaf6] p-5 shadow-[0_12px_36px_rgba(54,72,65,0.045)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_42px_rgba(54,72,65,0.07)]"
        >
          <div class="flex items-start justify-between gap-4">
            <div class="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#e3ebe3] text-lg text-[#4a675e]" aria-hidden="true">{{ resourceIcon(doc) }}</div>
            <span class="rounded-full bg-[#eee8dc] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8b6e4e]">{{ typeLabel(doc.documentType) }}</span>
          </div>

          <h3 class="mt-5 font-serif text-[25px] leading-tight text-[#2c474a]">{{ doc.title }}</h3>
          <p class="mt-2 min-h-[44px] text-[12px] leading-5 text-[#6d7771]">{{ resourceDescription(doc) }}</p>

          <div class="mt-5 flex items-center justify-between border-t border-[#e5e8e2] pt-4">
            <span class="text-[10px] text-[#929b95]">Updated {{ formatDate(doc.updatedAt) || 'recently' }}</span>
            <div class="flex gap-2">
              <button
                v-if="doc.status==='draft'"
                type="button"
                class="rounded-full border border-[#ccd7ce] bg-white px-3.5 py-1.5 text-[11px] font-semibold text-[#476159] transition hover:bg-[#eef3ee]"
                @click="$emit('edit',doc)"
              >
                Edit
              </button>
              <button
                v-if="doc.status==='completed'"
                type="button"
                class="rounded-full border border-[#ccd7ce] bg-white px-3.5 py-1.5 text-[11px] font-semibold text-[#476159] transition hover:bg-[#eef3ee]"
                @click="$emit('download',doc)"
              >
                Open
              </button>
            </div>
          </div>
        </article>
      </div>

      <div v-else class="rounded-[24px] border border-[#dce3db] bg-[#fbfaf6] px-7 py-10 text-center">
        <p class="font-serif text-[24px] text-[#284548]">No matching resources</p>
        <p class="mt-2 text-body-sm text-[#727c75]">{{ query ? 'Try a different search or category.' : 'Your own worksheets and reusable practice materials will appear here.' }}</p>
      </div>
    </template>

    <template v-else>
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label class="relative flex-1">
          <span class="sr-only">Search documents</span>
          <input
            v-model="query"
            type="search"
            class="w-full rounded-full border border-border bg-surface px-4 py-2.5"
            placeholder="Search practice documents or client records…"
            data-testid="document-search"
          />
        </label>
        <div class="flex flex-wrap gap-2" aria-label="Document filters">
          <button
            v-for="item in documentFilters"
            :key="item.value"
            type="button"
            class="rounded-full border px-4 py-2 text-body-sm transition"
            :class="filter===item.value ? 'border-[#9caf9f] bg-[#e4ebe4] font-semibold text-[#35514b]' : 'border-border bg-surface text-ink-muted hover:text-ink'"
            @click="filter=item.value"
          >
            {{ item.label }}
          </button>
        </div>
      </div>

      <div v-if="visibleDocuments.length===0" class="rounded-[24px] border border-border bg-surface p-10 text-center">
        <h2 class="font-serif text-[28px] text-[#284548]">No documents here yet</h2>
        <p class="mt-2 text-body-sm text-ink-muted">{{ query ? 'Try a different search or filter.' : 'Create a professional practice document, or manage retained client documents from the relevant client record.' }}</p>
      </div>

      <div v-else class="space-y-3">
        <section v-for="section in documentSections" v-show="section.documents.length" :key="section.scope" class="overflow-hidden rounded-[22px] border border-border bg-surface">
          <button type="button" class="flex w-full items-center justify-between gap-4 p-4 text-left hover:bg-surface-subtle" :aria-expanded="isOpen(section.key)" @click="toggle(section.key)">
            <span>
              <strong class="text-body font-semibold">{{ section.label }}</strong>
              <span class="ml-2 text-caption text-ink-muted">{{ section.documents.length }} {{ section.documents.length===1?'document':'documents' }}</span>
            </span>
            <span class="text-ink-muted" aria-hidden="true">{{ isOpen(section.key)?'▾':'▸' }}</span>
          </button>
          <div v-if="isOpen(section.key)" class="border-t border-border-muted">
            <div v-for="group in groupTypes(section.documents,'practice')" :key="group.key" class="border-b border-border-muted last:border-b-0">
              <button type="button" class="flex w-full items-center justify-between gap-4 bg-surface-subtle/40 px-4 py-3 text-left hover:bg-surface-subtle" :aria-expanded="isOpen(group.key)" @click="toggle(group.key)">
                <span>
                  <strong class="text-body-sm">{{ group.label }}</strong>
                  <span class="ml-2 text-caption text-ink-muted">{{ group.documents.length }}</span>
                </span>
                <span class="text-ink-muted" aria-hidden="true">{{ isOpen(group.key)?'▾':'▸' }}</span>
              </button>
              <div v-if="isOpen(group.key)">
                <DocumentRow v-for="doc in group.documents" :key="doc.id" :doc="doc" @edit="$emit('edit',$event)" @download="$emit('download',$event)" />
              </div>
            </div>
          </div>
        </section>
      </div>

      <section v-if="clientSearchResults.length" class="overflow-hidden rounded-[22px] border border-border bg-surface" aria-label="Client document search results">
        <div class="border-b border-border-muted p-4">
          <strong class="text-body font-semibold">Client document matches</strong>
          <p class="mt-1 text-caption text-ink-muted">Client documents remain part of the client record and appear here only when you search for them.</p>
        </div>
        <DocumentRow v-for="doc in clientSearchResults" :key="doc.id" :doc="doc" @edit="$emit('edit',$event)" @download="$emit('download',$event)" />
      </section>
    </template>
  </section>
</template>

<script setup>
import { computed, defineComponent, h, ref } from 'vue'

const props = defineProps({ documents: { type: Array, default: () => [] } })
defineEmits(['edit', 'download'])

const view = ref('documents')
const query = ref('')
const filter = ref('practice')
const resourceLibrary = ref('mine')
const resourceCategory = ref('All')
const open = ref(new Set(['scope:practice']))

const documentFilters = [
  { value: 'practice', label: 'Practice Documents' },
  { value: 'all', label: 'All' },
]

const resourceLibraries = [
  { value: 'helios', label: 'Helios library' },
  { value: 'mine', label: 'My resources' },
]

const typeLabel = value => String(value || 'other')
  .replaceAll('_', ' ')
  .replace(/\b\w/g, char => char.toUpperCase())

const formatDate = value => value ? new Date(value).toLocaleDateString('en-GB') : ''

const practiceResources = computed(() => props.documents.filter(doc => doc.scope === 'prospect'))

const resourceCategories = computed(() => {
  const types = [...new Set(practiceResources.value.map(doc => typeLabel(doc.documentType)).filter(Boolean))]
  return ['All', ...types].slice(0, 7)
})

const resourceCards = computed(() => {
  const q = query.value.trim().toLowerCase()
  return practiceResources.value
    .filter(doc => resourceCategory.value === 'All' || typeLabel(doc.documentType) === resourceCategory.value)
    .filter(doc => !q || matchesQuery(doc, q))
})

const visibleDocuments = computed(() => {
  const q = query.value.trim().toLowerCase()
  return props.documents
    .filter(doc => doc.scope !== 'client' && doc.scope !== 'prospect')
    .filter(doc => (filter.value === 'all' || doc.scope === filter.value) && (!q || matchesQuery(doc, q)))
})

const clientSearchResults = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q || filter.value !== 'all') return []
  return props.documents.filter(doc => doc.scope === 'client' && matchesQuery(doc, q))
})

const documentSections = computed(() => [
  { scope: 'practice', key: 'scope:practice', label: 'Practice Documents' },
].map(section => ({ ...section, documents: visibleDocuments.value.filter(doc => doc.scope === section.scope) })))

function matchesQuery(doc, q) {
  return [doc.title, doc.clientName, typeLabel(doc.documentType), doc.status]
    .some(value => String(value || '').toLowerCase().includes(q))
}

function groupTypes(documents, prefix) {
  const groups = new Map()
  for (const doc of documents) {
    const label = typeLabel(doc.documentType)
    const key = `${prefix}:type:${doc.documentType || 'other'}`
    if (!groups.has(key)) groups.set(key, { key, label, documents: [] })
    groups.get(key).documents.push(doc)
  }
  return [...groups.values()].sort((a, b) => a.label.localeCompare(b.label))
}

function resourceDescription(doc) {
  const type = String(doc.documentType || '').toLowerCase()
  if (type.includes('question') || type.includes('measure') || type.includes('assessment')) return 'A reusable client-facing measure or questionnaire kept ready for the work.'
  if (type.includes('worksheet') || type.includes('exercise')) return 'A practical worksheet you can adapt and return to with clients.'
  if (type.includes('psycho')) return 'Clear client-facing information to support understanding between sessions.'
  return 'A reusable practice resource kept ready to edit, share or return to when useful.'
}

function resourceIcon(doc) {
  const type = String(doc.documentType || '').toLowerCase()
  if (type.includes('question') || type.includes('measure') || type.includes('assessment')) return '◌'
  if (type.includes('worksheet') || type.includes('exercise')) return '✎'
  if (type.includes('psycho')) return '◐'
  return '✦'
}

function isOpen(key) {
  return open.value.has(key)
}

function toggle(key) {
  const next = new Set(open.value)
  next.has(key) ? next.delete(key) : next.add(key)
  open.value = next
}

const DocumentRow = defineComponent({
  props: { doc: { type: Object, required: true } },
  emits: ['edit', 'download'],
  setup(componentProps, { emit }) {
    return () => h('div', {
      class: 'px-4 py-3 border-t first:border-t-0 border-border-muted flex items-center justify-between gap-4',
    }, [
      h('div', { class: 'min-w-0' }, [
        h('strong', { class: 'block truncate text-body-sm' }, componentProps.doc.title),
        h('p', { class: 'text-caption text-ink-muted mt-1' }, `${typeLabel(componentProps.doc.documentType)} · ${componentProps.doc.status === 'completed' ? 'Final PDF' : 'Draft'} · Updated ${formatDate(componentProps.doc.updatedAt)}`),
      ]),
      h('div', { class: 'flex gap-2 shrink-0' }, [
        componentProps.doc.status === 'draft'
          ? h('button', { type: 'button', class: 'button-secondary', onClick: () => emit('edit', componentProps.doc) }, 'Edit')
          : null,
        componentProps.doc.status === 'completed'
          ? h('button', { type: 'button', class: 'button-secondary', onClick: () => emit('download', componentProps.doc) }, 'Download')
          : null,
      ]),
    ])
  },
})
</script>
