<template>
  <div class="help-browser min-w-0" :class="compact ? 'p-5 sm:p-6' : 'mx-auto max-w-5xl p-5 pb-16 sm:p-8 lg:p-10'">
    <header v-if="!compact" class="mb-8">
      <p class="type-eyebrow text-action-link">A guide to your workspace</p>
      <h1 class="mt-2 text-3xl font-semibold tracking-tight text-ink">Help with Helios</h1>
      <p class="mt-3 max-w-2xl text-base leading-7 text-ink-secondary">Guides to using your workspace and understanding how Helios works.</p>
    </header>

    <template v-if="article">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <button type="button" class="min-h-touch rounded-control px-1 text-sm font-medium text-action-link hover:underline" @click="backToHelp">Back to Help</button>
        <span class="text-xs font-medium text-ink-muted">{{ article.category }}</span>
      </div>
      <article :aria-labelledby="prefix + '-article-title'" class="mt-3">
        <h2 :id="prefix + '-article-title'" ref="articleTitle" tabindex="-1" class="help-title text-2xl font-semibold tracking-tight text-ink outline-none">{{ article.title }}</h2>
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
      <div v-if="missingArticle" role="status" class="mb-7 rounded-panel border border-border-muted bg-surface-muted p-4 text-sm text-ink-secondary">That help article is not available. Choose a topic below.</div>

      <div ref="topicsStart" tabindex="-1" class="space-y-10 outline-none">
        <section v-for="group in groupedArticles" :key="group.category" :aria-labelledby="groupId(group.category)">
          <h2 :id="groupId(group.category)" class="type-section-title text-ink">{{ group.category }}</h2>
          <ul class="mt-4 grid gap-3" :class="!compact ? 'md:grid-cols-2' : ''">
            <li v-for="item in group.articles" :key="item.id">
              <button
                type="button"
                data-testid="help-topic-card"
                :data-category="group.category"
                class="h-full w-full rounded-panel border border-border-muted bg-surface-elevated p-5 text-left transition-colors hover:border-action-link focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action-link"
                @click="selectArticle(item.id)"
              >
                <span class="block text-lg font-semibold leading-6 text-ink">{{ item.title }}</span>
                <span class="mt-2 block text-sm leading-6 text-ink-secondary">{{ item.summary }}</span>
              </button>
            </li>
          </ul>
        </section>
      </div>
    </template>

    <aside class="mt-10 border-t border-border-muted pt-5 text-sm leading-6 text-ink-muted">
      <p>Still need help? <a href="mailto:hello@helio.works" class="font-medium text-action-link underline underline-offset-4">Email product support</a>. Describe the screen and the problem without including client information.</p>
      <a href="/support" target="_blank" rel="noopener noreferrer" class="mt-2 inline-flex min-h-touch items-center text-action-link hover:underline">Support and contact details (new tab)</a>
    </aside>
  </div>
</template>

<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { HELP_ARTICLES, HELP_CATEGORIES, HELP_REVIEW_DATE, getHelpArticle } from '../../content/help/articles.js'

const props = defineProps({ articleId: { type: String, default: null }, compact: Boolean })
const emit = defineEmits(['select'])
const selectedId = ref(props.articleId)
const articleTitle = ref(null)
const topicsStart = ref(null)
const prefix = computed(() => props.compact ? 'context-help' : 'help-page')
const article = computed(() => getHelpArticle(selectedId.value))
const missingArticle = computed(() => Boolean(selectedId.value && !article.value))
const groupedArticles = HELP_CATEGORIES
  .map(category => ({ category, articles: HELP_ARTICLES.filter(article => article.category === category) }))
  .filter(group => group.articles.length)
const relatedArticles = computed(() => (article.value?.related || []).map(getHelpArticle).filter(Boolean))
const reviewLabel = new Date(HELP_REVIEW_DATE + 'T12:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })

watch(() => props.articleId, value => { selectedId.value = value })

async function selectArticle(id) {
  selectedId.value = id
  emit('select', id)
  await nextTick()
  articleTitle.value?.focus({ preventScroll: true })
  articleTitle.value?.scrollIntoView?.({ block: 'start', behavior: 'instant' })
}

async function backToHelp() {
  selectedId.value = null
  emit('select', null)
  await nextTick()
  topicsStart.value?.focus({ preventScroll: true })
  topicsStart.value?.scrollIntoView?.({ block: 'start', behavior: 'instant' })
}

function groupId(category) {
  return prefix.value + '-group-' + category.toLowerCase().replace(/[^a-z0-9]+/g, '-')
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
