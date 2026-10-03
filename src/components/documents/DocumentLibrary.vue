<template>
  <section class="space-y-6" data-testid="document-library">
    <div class="inline-flex rounded-full border border-[#d9e1da] bg-[#eef2ed] p-1" aria-label="Library view">
      <button
        type="button"
        class="rounded-full px-5 py-2 text-body-sm transition"
        :class="view==='documents' ? 'bg-[#fffdf8] text-[#284548] shadow-[0_1px_2px_rgba(40,69,72,0.06)] font-semibold' : 'text-ink-muted hover:text-ink'"
        @click="view='documents'"
      >
        Documents
      </button>
      <button
        type="button"
        class="rounded-full px-5 py-2 text-body-sm transition"
        :class="view==='resources' ? 'bg-[#fffdf8] text-[#284548] shadow-[0_1px_2px_rgba(40,69,72,0.06)] font-semibold' : 'text-ink-muted hover:text-ink'"
        @click="view='resources'"
      >
        Practice Resources
      </button>
    </div>

    <template v-if="view==='resources'">
      <section class="overflow-hidden rounded-[26px] border border-[#dde4dc] bg-[#f5f2e9]">
        <div class="px-6 py-7 sm:px-8 sm:py-9">
          <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8c6b48]">Practice resources</p>
          <div class="mt-3 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-end">
            <div>
              <h2 class="max-w-3xl font-serif text-[32px] leading-[1.08] text-[#284548] sm:text-[39px]">Useful material for the work you do with clients.</h2>
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

        <div class="border-t border-[#dde4dc] bg-[#faf8f2]/80 px-6 py-4 sm:px-8">
          <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div class="flex flex-wrap items-center gap-2">
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
              <button
                v-if="resourceLibrary==='mine'"
                type="button"
                class="rounded-full border border-[#b9c9bd] bg-[#eef3ee] px-4 py-2 text-[11px] font-semibold text-[#3d5d54] transition hover:border-[#9fb3a4] hover:bg-[#e6eee7]"
                @click="emit('create-resource')"
              >
                + Create resource
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

      <div class="flex items-end justify-between gap-4 px-1">
        <div>
          <p class="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#9a7358]">{{ resourceLibrary==='helios' ? 'Curated by Helios' : 'Your practice library' }}</p>
          <p class="mt-1 text-[12px] text-[#7a847e]">{{ resourceLibrary==='helios' ? 'Preview a resource, then add it to your own library.' : 'Resources you can edit, reuse and send from client work.' }}</p>
        </div>
        <span class="text-[11px] text-[#9aa29d]">{{ resourceLibrary==='helios' ? heliosCards.length : myResourceCards.length }} {{ (resourceLibrary==='helios' ? heliosCards.length : myResourceCards.length) === 1 ? 'resource' : 'resources' }}</span>
      </div>

      <div v-if="resourceLibrary==='helios' && heliosCards.length" class="grid gap-5 md:grid-cols-2">
        <article
          v-for="item in heliosCards"
          :key="item.template"
          class="group cursor-pointer rounded-[22px] border border-[#dbe2da] bg-[#fffdf8] p-5 transition hover:border-[#c7d4c9] hover:shadow-[0_12px_28px_rgba(54,72,65,0.055)]"
          role="button"
          tabindex="0"
          @click="openTemplatePreview(item)"
          @keydown.enter.prevent="openTemplatePreview(item)"
        >
          <div class="flex items-start justify-between gap-4">
            <div class="flex h-10 w-10 items-center justify-center rounded-[14px] bg-[#e8eee7] text-[17px] text-[#4a675e]" aria-hidden="true">{{ item.icon }}</div>
            <span class="rounded-full bg-[#f0eadf] px-3 py-1 text-[9px] font-semibold uppercase tracking-[0.1em] text-[#8a6d4e]">{{ item.category }}</span>
          </div>
          <h3 class="mt-4 font-serif text-[26px] leading-tight text-[#2c474a]">{{ item.title }}</h3>
          <p class="mt-2 text-[12px] font-semibold text-[#62746b]">{{ item.detail }}</p>
          <p class="mt-2 min-h-[44px] text-[12px] leading-5 text-[#6d7771]">{{ item.description }}</p>
          <div class="mt-5 flex items-center justify-between gap-3 border-t border-[#e8ebe6] pt-4">
            <span class="text-[10px] uppercase tracking-[.08em] text-[#929b95]">Helios resource</span>
            <button
              type="button"
              class="rounded-full border px-4 py-2 text-[11px] font-semibold transition"
              :class="hasTemplate(item.template) ? 'border-[#d6ddd5] bg-[#eef2ec] text-[#738078]' : 'border-[#31584f] bg-[#31584f] text-white hover:bg-[#274b44]'"
              :disabled="hasTemplate(item.template) || resourceBusy===item.template"
              @click.stop="emit('add-resource-template', item.template)"
            >
              {{ hasTemplate(item.template) ? 'In my resources' : resourceBusy===item.template ? 'Adding…' : 'Add to my resources' }}
            </button>
          </div>
        </article>
      </div>

      <div v-else-if="resourceLibrary==='mine' && resourcesLoading" class="rounded-[24px] border border-[#dce3db] bg-[#fbfaf6] px-7 py-10 text-center">
        <p class="font-serif text-[24px] text-[#284548]">Loading your resources…</p>
      </div>

      <div v-else-if="resourceLibrary==='mine' && myResourceCards.length" class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <article
          v-for="item in myResourceCards"
          :key="item.id"
          class="group rounded-[22px] border border-[#dbe2da] bg-[#fffdf8] p-5 transition hover:border-[#c7d4c9] hover:shadow-[0_12px_28px_rgba(54,72,65,0.055)]"
        >
          <div class="flex items-start justify-between gap-4">
            <div class="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#e3ebe3] text-lg text-[#4a675e]" aria-hidden="true">{{ resourceIcon(item) }}</div>
            <span class="rounded-full bg-[#f0eadf] px-3 py-1 text-[9px] font-semibold uppercase tracking-[0.1em] text-[#8a6d4e]">{{ typeLabel(item.category || item.resource_kind) }}</span>
          </div>
          <h3 class="mt-4 font-serif text-[24px] leading-tight text-[#2c474a]">{{ item.title }}</h3>
          <p class="mt-2 min-h-[44px] text-[12px] leading-5 text-[#6d7771]">{{ item.subtitle || resourceDescription(item) }}</p>
          <div class="mt-5 flex items-center justify-between gap-3 border-t border-[#e5e8e2] pt-4">
            <span class="text-[10px] text-[#929b95]">{{ completionLabel(item.completionMode) }}</span>
            <div class="flex items-center gap-2">
              <span class="rounded-full bg-[#e7eee8] px-3 py-1.5 text-[10px] font-semibold text-[#4d675f]">Ready to send</span>
              <button
                v-if="item.resource_kind!=='outcome_measure'"
                type="button"
                class="rounded-full border border-[#ccd7ce] bg-white px-3 py-1.5 text-[10px] font-semibold text-[#4d675f] hover:bg-[#eef3ee]"
                @click="emit('edit-resource', item)"
              >
                Edit
              </button>
            </div>
          </div>
        </article>
      </div>

      <div v-else class="rounded-[24px] border border-[#dce3db] bg-[#fbfaf6] px-7 py-10 text-center">
        <p class="font-serif text-[24px] text-[#284548]">No matching resources</p>
        <p class="mt-2 text-body-sm text-[#727c75]">{{ query ? 'Try a different search or category.' : resourceLibrary==='mine' ? 'Add a Helios resource and it will appear here, ready to send to clients.' : 'More Helios resources will appear here as they are added.' }}</p>
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
      <teleport to="body">
        <div v-if="previewTemplate" class="fixed inset-0 z-[110] flex items-center justify-center bg-black/35 p-4" @mousedown.self="closeTemplatePreview">
          <section class="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-[24px] border border-[#d9e1d9] bg-[#fffdf8] shadow-[0_24px_70px_rgba(31,49,41,0.15)]" role="dialog" aria-modal="true">
            <header class="flex items-start justify-between gap-4 border-b border-[#e2e7e1] px-6 py-5">
              <div>
                <p class="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#9a7358]">Resource preview</p>
                <h2 class="mt-1 font-serif text-[32px] leading-tight text-[#284548]">{{ previewTemplate.title }}</h2>
                <p class="mt-2 max-w-2xl text-[13px] leading-5 text-[#6d7871]">{{ previewTemplate.description }}</p>
              </div>
              <button type="button" class="text-2xl text-[#7a857f]" aria-label="Close preview" @click="closeTemplatePreview">×</button>
            </header>
            <div class="min-h-0 overflow-auto bg-[#f0f2ed] p-5 sm:p-6">
              <div class="rounded-[18px] border border-[#dce3db] bg-[#fffdf8] p-4 sm:p-5">
                <ResourceFormRenderer v-model="previewAnswers" :definition="previewDefinition(previewTemplate.template)" />
              </div>
            </div>
            <footer class="flex flex-wrap items-center justify-between gap-3 border-t border-[#e2e7e1] bg-[#fffdf8] px-6 py-4">
              <span class="text-[11px] text-[#7c8781]">Preview only — nothing is saved until you add it to your resources.</span>
              <div class="flex gap-2">
                <button type="button" class="rounded-full border border-[#ccd7ce] bg-white px-4 py-2 text-[11px] font-semibold text-[#52665f]" @click="closeTemplatePreview">Close</button>
                <button
                  type="button"
                  class="rounded-full border border-[#31584f] bg-[#31584f] px-4 py-2 text-[11px] font-semibold text-white disabled:opacity-50"
                  :disabled="hasTemplate(previewTemplate.template) || resourceBusy===previewTemplate.template"
                  @click="addPreviewedTemplate"
                >
                  {{ hasTemplate(previewTemplate.template) ? 'Already in my resources' : resourceBusy===previewTemplate.template ? 'Adding…' : 'Add to my resources' }}
                </button>
              </div>
            </footer>
          </section>
        </div>
      </teleport>
  </section>
</template>

<script setup>
import { computed, defineComponent, h, ref } from 'vue'
import ResourceFormRenderer from '../resources/ResourceFormRenderer.vue'
import { phq9Definition } from '../../lib/phq9.js'
import { thoughtRecordDefinition } from '../../lib/resourceTemplates.js'

const props = defineProps({
  documents: { type: Array, default: () => [] },
  resources: { type: Array, default: () => [] },
  resourcesLoading: { type: Boolean, default: false },
  resourceBusy: { type: String, default: '' }
})
const emit = defineEmits(['edit', 'download', 'add-resource-template', 'edit-resource', 'create-resource'])

const view = ref('documents')
const query = ref('')
const filter = ref('practice')
const resourceLibrary = ref('helios')
const resourceCategory = ref('All')
const previewTemplate = ref(null)
const previewAnswers = ref({})
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

const builtInResources = [
  {
    template: 'phq9',
    title: 'PHQ-9',
    category: 'Outcome measures',
    detail: '9 questions · about 2 minutes',
    description: 'A brief questionnaire about mood over the last two weeks.',
    icon: '◌'
  },
  {
    template: 'thought_record',
    title: 'CBT thought record',
    category: 'CBT worksheets',
    detail: 'Structured worksheet · client completes in Helios',
    description: 'Explore a situation, emotions, automatic thoughts and a more balanced perspective.',
    icon: '✎'
  }
]

const resourceCategories = computed(() => {
  const source = resourceLibrary.value === 'helios'
    ? builtInResources.map(item => item.category)
    : props.resources.map(item => typeLabel(item.category || item.resource_kind))
  return ['All', ...new Set(source.filter(Boolean))].slice(0, 7)
})

const heliosCards = computed(() => {
  const q = query.value.trim().toLowerCase()
  return builtInResources
    .filter(item => resourceCategory.value === 'All' || item.category === resourceCategory.value)
    .filter(item => !q || [item.title, item.category, item.description].some(value => value.toLowerCase().includes(q)))
})

const myResourceCards = computed(() => {
  const q = query.value.trim().toLowerCase()
  return props.resources
    .filter(item => resourceCategory.value === 'All' || typeLabel(item.category || item.resource_kind) === resourceCategory.value)
    .filter(item => !q || [item.title, item.subtitle, item.category, item.resource_kind].some(value => String(value || '').toLowerCase().includes(q)))
})

const hasTemplate = template => props.resources.some(item => {
  if (template === 'phq9') return item.title === 'PHQ-9'
  if (template === 'thought_record') return item.title === 'CBT thought record'
  return false
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
  const type = String(doc.documentType || doc.resource_kind || doc.category || '').toLowerCase()
  if (type.includes('question') || type.includes('measure') || type.includes('assessment')) return 'A reusable client-facing measure or questionnaire kept ready for the work.'
  if (type.includes('worksheet') || type.includes('exercise')) return 'A practical worksheet you can adapt and return to with clients.'
  if (type.includes('psycho')) return 'Clear client-facing information to support understanding between sessions.'
  return 'A reusable practice resource kept ready to edit, share or return to when useful.'
}

function resourceIcon(doc) {
  const type = String(doc.documentType || doc.resource_kind || doc.category || '').toLowerCase()
  if (type.includes('question') || type.includes('measure') || type.includes('assessment')) return '◌'
  if (type.includes('worksheet') || type.includes('exercise')) return '✎'
  if (type.includes('psycho')) return '◐'
  return '✦'
}

function previewDefinition(template) {
  if (template === 'phq9') return phq9Definition()
  if (template === 'thought_record') return thoughtRecordDefinition()
  return { schema: 'helio-form-v1', items: [] }
}

function openTemplatePreview(item) {
  previewAnswers.value = {}
  previewTemplate.value = item
}

function closeTemplatePreview() {
  previewTemplate.value = null
  previewAnswers.value = {}
}

function addPreviewedTemplate() {
  if (!previewTemplate.value) return
  emit('add-resource-template', previewTemplate.value.template)
  closeTemplatePreview()
}

function completionLabel(value) {
  return ({
    complete_in_helio: 'Client completes in Helios',
    read_only: 'Read-only resource',
    upload: 'Client uploads a completed copy',
    complete_or_upload: 'Complete in Helios or upload'
  })[value] || 'Reusable resource'
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
