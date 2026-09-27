<template>
  <div class="help-browser min-w-0" :class="compact ? 'p-5 sm:p-6' : 'mx-auto max-w-5xl p-5 pb-16 sm:p-8 lg:p-10'">
    <header v-if="!compact" class="mb-8">
      <p class="type-eyebrow text-action-link">A guide to your workspace</p>
      <h1 class="mt-2 text-3xl font-semibold tracking-tight text-ink">Help with Helios</h1>
      <p class="mt-3 max-w-2xl text-base leading-7 text-ink-secondary">Understand what each area is for, follow a workflow, and find out what happens to your work.</p>
    </header>

    <div class="space-y-2">
      <label :for="`${prefix}-search`" class="block text-sm font-semibold text-ink">Search Help</label>
      <div class="relative">
        <Search class="pointer-events-none absolute left-3 top-3.5 h-5 w-5 text-ink-muted" aria-hidden="true" />
        <input :id="`${prefix}-search`" ref="searchInput" v-model="query" type="search" :maxlength="MAX_HELP_QUERY_LENGTH" autocomplete="off" spellcheck="false" :aria-describedby="`${prefix}-privacy`" placeholder="Try 'last three sessions' or 'where does my reflection go?'" class="min-h-12 w-full min-w-0 rounded-control border border-border bg-surface-elevated py-3 pl-10 pr-3 text-base text-ink focus:border-action-link focus:outline-none focus:ring-2 focus:ring-state-selected" @input="showResults" />
      </div>
      <p :id="`${prefix}-privacy`" class="text-xs leading-5 text-ink-muted">Searches help articles only. Your search is not saved or sent to an AI service.</p>
    </div>

    <template v-if="article">
      <div class="mt-5 flex flex-wrap items-center justify-between gap-2">
        <button type="button" class="min-h-touch rounded-control px-1 text-sm font-medium text-action-link hover:underline" @click="backToResults">Back to {{ query || category ? 'results' : 'all topics' }}</button>
        <span class="text-xs font-medium text-ink-muted">{{ article.category }}</span>
      </div>
      <article :aria-labelledby="`${prefix}-article-title`" class="mt-3">
        <h2 :id="`${prefix}-article-title`" ref="articleTitle" tabindex="-1" class="help-title text-2xl font-semibold tracking-tight text-ink outline-none">{{ article.title }}</h2>
        <p class="mt-4 border-l-2 border-action-link pl-4 text-base leading-7 text-ink-secondary">{{ article.summary }}</p>
        <section v-for="section in article.sections" :key="section.heading" class="mt-8">
          <h3 class="text-lg font-semibold leading-7 text-ink">{{ section.heading }}</h3>
          <p v-for="paragraph in section.paragraphs || []" :key="paragraph" class="mt-3 text-base leading-7 text-ink-secondary">{{ paragraph }}</p>
          <ol v-if="section.steps" class="mt-4 list-decimal space-y-4 pl-6 text-base leading-7 text-ink-secondary marker:font-semibold marker:text-action-link">
            <li v-for="step in section.steps" :key="step" class="pl-1">{{ step }}</li>
          </ol>
          <aside v-if="section.example" class="mt-3 rounded-panel border border-border-muted bg-surface-muted p-4 text-base leading-7 text-ink-secondary">{{ section.example }}</aside>
        </section>
        <footer class="mt-8 border-t border-border-muted pt-5">
          <h3 class="text-sm font-semibold text-ink">Related help</h3>
          <div class="mt-2 space-y-1">
            <button v-for="related in relatedArticles" :key="related.id" type="button" class="block min-h-touch rounded-control py-2 text-left text-sm font-medium text-action-link hover:underline" @click="selectArticle(related.id)">{{ related.title }}</button>
          </div>
          <p class="mt-4 text-xs text-ink-muted">Content reviewed {{ reviewLabel }}. Product help, not clinical advice.</p>
        </footer>
      </article>
    </template>

    <template v-else>
      <div v-if="missingArticle" role="status" class="mt-5 rounded-panel border border-border-muted bg-surface-muted p-4 text-sm text-ink-secondary">That help article is not available. Search or choose a topic below.</div>
      <div class="mt-5 flex flex-wrap gap-2" role="group" aria-label="Filter help topics">
        <button v-for="name in ['', ...HELP_CATEGORIES]" :key="name || 'all'" type="button" :aria-pressed="category === name" class="min-h-touch rounded-pill border px-4 py-2 text-sm font-medium transition-colors" :class="category === name ? 'border-action-link bg-state-selected text-action-link' : 'border-border bg-surface-elevated text-ink-secondary hover:border-action-link'" @click="category = name">{{ name || 'All topics' }}</button>
      </div>
      <p class="mt-5 text-sm text-ink-muted" role="status" aria-live="polite">{{ results.length }} {{ results.length === 1 ? 'article' : 'articles' }}{{ query.trim() ? ' found' : '' }}</p>
      <ul v-if="results.length" class="mt-3 grid gap-3" :class="!compact ? 'md:grid-cols-2' : ''">
        <li v-for="item in results" :key="item.id">
          <button type="button" class="h-full w-full rounded-panel border border-border-muted bg-surface-elevated p-5 text-left transition-colors hover:border-action-link focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action-link" @click="selectArticle(item.id)">
            <span class="block text-xs font-semibold uppercase tracking-wide text-action-link">{{ item.category }}</span>
            <span class="mt-2 block text-lg font-semibold leading-6 text-ink">{{ item.title }}</span>
            <span class="mt-2 block text-sm leading-6 text-ink-secondary">{{ item.summary }}</span>
          </button>
        </li>
      </ul>
      <div v-else class="mt-4 rounded-panel border border-dashed border-border p-6">
        <h2 class="text-lg font-semibold text-ink">No matching help yet</h2>
        <p class="mt-2 text-sm leading-6 text-ink-secondary">Try a feature name such as Care, Dictate, reflection or last three sessions, or clear the filters.</p>
        <button type="button" class="mt-3 min-h-touch rounded-control text-sm font-semibold text-action-link hover:underline" @click="clearSearch">Clear search and filters</button>
      </div>
    </template>

    <aside class="mt-8 border-t border-border-muted pt-5 text-sm leading-6 text-ink-muted">
      <p>Still need help? <a href="mailto:hello@helio.works" class="font-medium text-action-link underline underline-offset-4">Email product support</a>. Describe the screen and the problem without including client information.</p>
      <a href="/support" target="_blank" rel="noopener noreferrer" class="mt-2 inline-flex min-h-touch items-center text-action-link hover:underline">Support and contact details (new tab)</a>
    </aside>
  </div>
</template>

<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { Search } from '@lucide/vue'
import { HELP_CATEGORIES, HELP_REVIEW_DATE, getHelpArticle } from '../../content/help/articles.js'
import { MAX_HELP_QUERY_LENGTH, searchHelp } from '../../lib/helpSearch.js'

const props = defineProps({ articleId: { type: String, default: null }, compact: Boolean })
const emit = defineEmits(['select'])
const query = ref('')
const category = ref('')
const selectedId = ref(props.articleId)
const searchInput = ref(null)
const articleTitle = ref(null)
const prefix = computed(() => props.compact ? 'context-help' : 'help-page')
const article = computed(() => getHelpArticle(selectedId.value))
const missingArticle = computed(() => Boolean(selectedId.value && !article.value))
const results = computed(() => searchHelp(query.value, category.value))
const relatedArticles = computed(() => (article.value?.related || []).map(getHelpArticle).filter(Boolean))
const reviewLabel = new Date(`${HELP_REVIEW_DATE}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })

watch(() => props.articleId, value => { selectedId.value = value })
async function selectArticle(id) {
  selectedId.value = id
  emit('select', id)
  await nextTick()
  articleTitle.value?.focus({ preventScroll: true })
  articleTitle.value?.scrollIntoView?.({ block: 'start', behavior: 'instant' })
}
function showResults() {
  if (selectedId.value) {
    selectedId.value = null
    emit('select', null)
  }
}
async function backToResults() {
  selectedId.value = null
  emit('select', null)
  await nextTick()
  searchInput.value?.focus()
}
function clearSearch() {
  query.value = ''
  category.value = ''
  backToResults()
}
</script>

<style scoped>
.help-browser { overflow-wrap: anywhere; }
.help-title { scroll-margin-top: 6rem; }
.help-browser button:focus-visible, .help-browser a:focus-visible {
  outline: 2px solid currentColor;
  outline-offset: 3px;
}
</style>
