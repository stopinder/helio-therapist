<template>
  <div class="mx-auto max-w-6xl space-y-10 p-4 pb-20 md:p-10">
    <header class="max-w-4xl space-y-4">
      <p class="type-eyebrow text-action-link">Professional development</p>
      <h1 class="text-3xl font-semibold tracking-[-0.03em] text-ink md:text-4xl">Growth</h1>
      <p class="max-w-3xl text-base leading-7 text-ink-secondary">
        See what is recurring, what has appeared recently, and where your own reflections suggest a useful learning edge.
      </p>
    </header>

    <section v-if="loading && reflections.length === 0" class="rounded-panel border border-border p-10 text-center">
      <span class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-state-selected border-t-transparent"></span>
      <p class="mt-4 text-sm text-ink-muted">Reading your reflection history…</p>
    </section>

    <template v-else>
      <section class="rounded-panel border border-border bg-surface-raised p-6 md:p-8">
        <div class="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div class="max-w-3xl">
            <p class="type-eyebrow text-action-link">AI longitudinal reflection</p>
            <h2 class="mt-2 text-2xl font-semibold text-ink">What seems to be changing across your reflections?</h2>
            <p class="mt-3 text-sm leading-6 text-ink-secondary">
              Helios can read your saved reflection history together and produce a cautious summary of repeated material, observable changes over time, possible emerging capacities, and questions for supervision. It cites the dated reflections supporting each observation.
            </p>
            <p class="mt-2 text-xs leading-5 text-ink-muted">
              AI-generated reflection support is not a judgement of competence or a clinical assessment. Your saved reflections are sent to the configured AI service only when you ask for this summary.
            </p>
          </div>
          <AppButton
            variant="primary"
            @click="generateLongitudinalSummary"
            :disabled="aiSummaryLoading || reflections.length < 3"
            class="shrink-0 px-5 py-3"
          >
            <span v-if="aiSummaryLoading" class="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></span>
            <span v-else>✨</span>
            {{ aiSummary ? 'Regenerate summary' : 'Generate summary' }}
          </AppButton>
        </div>

        <p v-if="reflections.length < 3" class="mt-5 rounded-control border border-dashed border-border px-4 py-3 text-sm text-ink-muted">
          At least three saved reflections are needed before Helios can compare material over time.
        </p>

        <p v-if="aiSummaryError" role="alert" class="mt-5 rounded-control border border-state-danger/20 bg-state-danger-surface px-4 py-3 text-sm text-state-danger">
          {{ aiSummaryError }}
        </p>

        <div v-if="aiSummary" class="mt-7 space-y-7 border-t border-border-muted pt-7">
          <div>
            <div class="flex flex-wrap items-center justify-between gap-3">
              <p class="type-eyebrow text-ink-muted">Longitudinal overview</p>
              <span class="text-xs text-ink-muted">AI-generated — review critically</span>
            </div>
            <p class="mt-3 text-base leading-7 text-ink-secondary">{{ aiSummary.overview }}</p>
          </div>

          <div v-if="aiSummary.repeated_patterns?.length" class="space-y-3">
            <h3 class="text-lg font-semibold text-ink">Repeated material</h3>
            <article v-for="item in aiSummary.repeated_patterns" :key="`repeat-${item.title}`" class="rounded-panel border border-border bg-surface-muted p-5">
              <h4 class="text-sm font-semibold text-ink">{{ item.title }}</h4>
              <p class="mt-2 text-sm leading-6 text-ink-secondary">{{ item.observation }}</p>
              <p v-if="formatEvidence(item.evidence_refs)" class="mt-3 text-xs text-ink-muted">Evidence: {{ formatEvidence(item.evidence_refs) }}</p>
            </article>
          </div>

          <div v-if="aiSummary.changes_over_time?.length" class="space-y-3">
            <h3 class="text-lg font-semibold text-ink">Observable changes over time</h3>
            <article v-for="item in aiSummary.changes_over_time" :key="`change-${item.title}`" class="rounded-panel border border-border bg-surface-muted p-5">
              <h4 class="text-sm font-semibold text-ink">{{ item.title }}</h4>
              <p class="mt-2 text-sm leading-6 text-ink-secondary">{{ item.observation }}</p>
              <p v-if="formatEvidence(item.evidence_refs)" class="mt-3 text-xs text-ink-muted">Evidence: {{ formatEvidence(item.evidence_refs) }}</p>
            </article>
          </div>

          <div v-if="aiSummary.emerging_capacities?.length" class="space-y-3">
            <h3 class="text-lg font-semibold text-ink">Possible emerging capacities</h3>
            <p class="text-xs leading-5 text-ink-muted">Included only where later reflections contain directly observable differences in the therapist's own wording or described response.</p>
            <article v-for="item in aiSummary.emerging_capacities" :key="`capacity-${item.title}`" class="rounded-panel border border-border bg-surface-muted p-5">
              <h4 class="text-sm font-semibold text-ink">{{ item.title }}</h4>
              <p class="mt-2 text-sm leading-6 text-ink-secondary">{{ item.observation }}</p>
              <p v-if="formatEvidence(item.evidence_refs)" class="mt-3 text-xs text-ink-muted">Evidence: {{ formatEvidence(item.evidence_refs) }}</p>
            </article>
          </div>

          <div v-if="aiSummary.supervision_questions?.length">
            <h3 class="text-lg font-semibold text-ink">Questions to take to supervision</h3>
            <div class="mt-3 space-y-2">
              <p v-for="question in aiSummary.supervision_questions" :key="question" class="rounded-control border border-border bg-surface-muted px-4 py-3 text-sm leading-6 text-ink-secondary">
                {{ question }}
              </p>
            </div>
          </div>

          <div class="rounded-control border border-border-muted bg-surface-subtle px-4 py-3 text-xs leading-5 text-ink-muted">
            <strong>Limits:</strong> {{ aiSummary.limitations }}
          </div>
        </div>
      </section>

      <section class="grid gap-4 md:grid-cols-3">
        <article class="rounded-panel border border-border bg-surface-raised p-6">
          <p class="type-eyebrow text-ink-muted">Reflection history</p>
          <p class="mt-3 text-3xl font-semibold text-ink">{{ reflections.length }}</p>
          <p class="mt-1 text-sm text-ink-secondary">{{ historyLabel }}</p>
        </article>
        <article class="rounded-panel border border-border bg-surface-raised p-6">
          <p class="type-eyebrow text-ink-muted">Mapped reflections</p>
          <p class="mt-3 text-3xl font-semibold text-ink">{{ mappedReflections.length }}</p>
          <p class="mt-1 text-sm text-ink-secondary">{{ mappedCoverageLabel }}</p>
        </article>
        <article class="rounded-panel border border-border bg-surface-raised p-6">
          <p class="type-eyebrow text-ink-muted">Recurring threads</p>
          <p class="mt-3 text-3xl font-semibold text-ink">{{ recurringThreads.length }}</p>
          <p class="mt-1 text-sm text-ink-secondary">Themes or inner positions appearing more than once.</p>
        </article>
      </section>

      <section class="grid gap-8 lg:grid-cols-[1fr_.9fr]">
        <div>
          <p class="type-eyebrow text-ink-muted">Evidence from your reflections</p>
          <h2 class="mt-2 text-2xl font-semibold text-ink">What keeps returning?</h2>
          <p class="mt-2 text-sm leading-6 text-ink-secondary">
            These are counts from your saved reflections, not interpretations of what they mean.
          </p>

          <div v-if="recurringThreads.length" class="mt-5 space-y-3">
            <article
              v-for="thread in recurringThreads"
              :key="`${thread.kind}-${thread.key}`"
              class="rounded-panel border border-border bg-surface-raised p-5"
            >
              <div class="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p class="type-eyebrow text-ink-muted">{{ thread.kind }}</p>
                  <h3 class="mt-1 text-base font-semibold text-ink">{{ thread.label }}</h3>
                </div>
                <span class="rounded-pill bg-surface-muted px-3 py-1 text-xs font-semibold text-ink-secondary">{{ thread.count }}×</span>
              </div>
              <p class="mt-3 text-sm leading-6 text-ink-secondary">{{ thread.summary }}</p>
              <p v-if="thread.latestDate" class="mt-3 text-xs text-ink-muted">Most recently recorded {{ formatDate(thread.latestDate) }}</p>
            </article>
          </div>

          <p v-else class="mt-5 rounded-panel border border-dashed border-border p-6 text-sm leading-6 text-ink-muted">
            There is not enough repeated material yet to identify a recurring thread. Keep reflecting and this view will build from your own record.
          </p>
        </div>

        <aside class="rounded-panel border border-border bg-surface-muted p-6">
          <p class="type-eyebrow text-ink-muted">Recent movement</p>
          <h2 class="mt-2 text-xl font-semibold text-ink">{{ recentMovement.title }}</h2>
          <p class="mt-3 text-sm leading-6 text-ink-secondary">{{ recentMovement.body }}</p>

          <div v-if="recentMovement.items.length" class="mt-5 space-y-3">
            <div v-for="item in recentMovement.items" :key="item.label" class="rounded-control border border-border bg-surface-raised px-4 py-3">
              <div class="flex items-center justify-between gap-3">
                <span class="text-sm font-semibold text-ink">{{ item.label }}</span>
                <span class="text-xs text-ink-muted">{{ item.recent }} recent / {{ item.earlier }} earlier</span>
              </div>
            </div>
          </div>
        </aside>
      </section>

      <section class="border-y border-border-muted py-8">
        <div class="grid gap-6 lg:grid-cols-[.75fr_1.25fr]">
          <div>
            <p class="type-eyebrow text-ink-muted">Learning edge</p>
            <h2 class="mt-2 text-2xl font-semibold text-ink">Questions grounded in your own record.</h2>
            <p class="mt-2 text-sm leading-6 text-ink-secondary">
              Helios uses recurrence and recency to suggest where to look next. It does not decide whether a pattern is a problem, a strength, or a feature of your caseload.
            </p>
          </div>

          <div v-if="learningEdges.length" class="space-y-3">
            <article v-for="edge in learningEdges" :key="edge.key" class="rounded-panel border border-border bg-surface-raised p-5">
              <p class="type-eyebrow text-ink-muted">{{ edge.kind }}</p>
              <h3 class="mt-2 text-base font-semibold text-ink">{{ edge.title }}</h3>
              <p class="mt-2 text-sm leading-6 text-ink-secondary">{{ edge.question }}</p>
              <router-link to="/supervision/workspace" class="mt-4 inline-flex text-sm font-semibold text-action-link">Take this to supervision →</router-link>
            </article>
          </div>

          <p v-else class="rounded-panel border border-dashed border-border p-6 text-sm leading-6 text-ink-muted">
            Once a theme or mapped inner position recurs, Helios will turn that evidence into a specific supervision or learning question here.
          </p>
        </div>
      </section>

      <section>
        <div class="mb-5 max-w-3xl">
          <p class="type-eyebrow text-ink-muted">Next useful step</p>
          <h2 class="mt-2 text-2xl font-semibold text-ink">Follow the evidence, not a generic CPD menu.</h2>
          <p class="mt-2 text-sm leading-6 text-ink-secondary">
            The options below are generated from the kind of material that is actually recurring in your reflections.
          </p>
        </div>

        <div v-if="nextSteps.length" class="grid overflow-hidden rounded-panel border border-border bg-border md:grid-cols-2">
          <article v-for="step in nextSteps" :key="step.title" class="bg-surface-raised p-6">
            <p class="type-eyebrow text-ink-muted">{{ step.source }}</p>
            <h3 class="mt-2 text-base font-semibold text-ink">{{ step.title }}</h3>
            <p class="mt-2 text-sm leading-6 text-ink-secondary">{{ step.description }}</p>
          </article>
        </div>

        <p v-else class="rounded-panel border border-dashed border-border p-6 text-sm leading-6 text-ink-muted">
          No development route is being suggested yet because there is not enough repeated evidence in the reflection history.
        </p>
      </section>
    </template>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { authenticatedFetch } from '../../lib/api.js'
import AppButton from '../../components/ui/AppButton.vue'

const props = defineProps({
  reflections: { type: Array, default: () => [] },
  loading: Boolean,
  themes: { type: Array, default: () => [] }
})

const aiSummaryLoading = ref(false)
const aiSummary = ref(null)
const aiSummaryError = ref('')

async function generateLongitudinalSummary() {
  if (aiSummaryLoading.value || props.reflections.length < 3) return
  aiSummaryLoading.value = true
  aiSummaryError.value = ''

  try {
    const response = await authenticatedFetch('/api/ai/growth-summary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    })
    const result = await response.json()
    if (!response.ok || !result.success) throw new Error(result.error?.message || 'Could not generate longitudinal summary')
    aiSummary.value = result.data
  } catch (error) {
    console.error('[Growth Summary] Error:', error)
    aiSummaryError.value = error.message || 'The longitudinal summary is temporarily unavailable.'
  } finally {
    aiSummaryLoading.value = false
  }
}

function formatEvidence(refs) {
  if (!Array.isArray(refs) || !refs.length || !aiSummary.value?.source_dates) return ''
  const dateMap = new Map(aiSummary.value.source_dates.map(item => [item.ref, item.date]))
  return refs
    .map(ref => {
      const date = dateMap.get(ref)
      return date ? `${ref} · ${formatDate(date)}` : ref
    })
    .join(', ')
}

function clean(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function reflectionDate(reflection) {
  return reflection?.created_at || reflection?.updated_at || null
}

function reflectiveMapFor(reflection) {
  const map = reflection?.workspace_content?.reflectiveMap
  return map && typeof map === 'object' && !Array.isArray(map) ? map : null
}

function formatDate(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(date)
}

const datedReflections = computed(() => [...props.reflections]
  .filter(reflection => reflectionDate(reflection))
  .sort((a, b) => new Date(reflectionDate(a)) - new Date(reflectionDate(b))))

const mappedReflections = computed(() => props.reflections
  .map(reflection => ({ reflection, map: reflectiveMapFor(reflection) }))
  .filter(({ map }) => map && Object.values(map).some(value => clean(value))))

const historyLabel = computed(() => {
  if (datedReflections.value.length < 2) return datedReflections.value.length ? 'One dated reflection recorded.' : 'No dated reflections recorded yet.'
  const first = new Date(reflectionDate(datedReflections.value[0]))
  const last = new Date(reflectionDate(datedReflections.value[datedReflections.value.length - 1]))
  const days = Math.max(1, Math.round((last - first) / 86400000))
  return days < 45 ? `Across ${days} days of recorded reflection.` : `Across about ${Math.max(1, Math.round(days / 30))} months of recorded reflection.`
})

const mappedCoverageLabel = computed(() => {
  if (!props.reflections.length) return 'No reflection map data yet.'
  return `${Math.round((mappedReflections.value.length / props.reflections.length) * 100)}% of saved reflections include mapped material.`
})

function buildCounts(items) {
  const counts = new Map()
  for (const item of items) {
    const label = clean(item.label)
    if (!label) continue
    const key = label.toLocaleLowerCase()
    const current = counts.get(key) || { key, label, count: 0, dates: [], contexts: [] }
    current.count += 1
    if (item.date) current.dates.push(item.date)
    if (clean(item.context)) current.contexts.push(clean(item.context))
    counts.set(key, current)
  }
  return [...counts.values()].sort((a, b) => b.count - a.count)
}

const themeThreads = computed(() => buildCounts(props.reflections.map(reflection => ({
  label: reflection.theme,
  date: reflectionDate(reflection)
}))).filter(item => item.count > 1))

const positionThreads = computed(() => buildCounts(mappedReflections.value.map(({ reflection, map }) => ({
  label: map.innerPosition,
  context: map.protectiveIntention,
  date: reflectionDate(reflection)
}))).filter(item => item.count > 1))

const recurringThreads = computed(() => {
  const positions = positionThreads.value.map(item => ({
    ...item,
    kind: 'Inner position',
    latestDate: [...item.dates].sort().at(-1),
    summary: item.contexts.length
      ? `This language appears in ${item.count} mapped reflections. The most recent protective intention you recorded was “${item.contexts.at(-1)}”.`
      : `This language appears in ${item.count} mapped reflections.`
  }))

  const themes = themeThreads.value.map(item => ({
    ...item,
    kind: 'Recurring theme',
    latestDate: [...item.dates].sort().at(-1),
    summary: `This theme appears in ${item.count} saved reflections.`
  }))

  return [...positions, ...themes]
    .sort((a, b) => b.count - a.count)
    .slice(0, 6)
})

const splitHistory = computed(() => {
  const items = datedReflections.value
  if (items.length < 4) return { earlier: [], recent: items }
  const split = Math.ceil(items.length / 2)
  return { earlier: items.slice(0, split), recent: items.slice(split) }
})

function countLabels(reflections) {
  const map = new Map()
  for (const reflection of reflections) {
    const labels = [
      clean(reflection.theme),
      clean(reflectiveMapFor(reflection)?.innerPosition)
    ].filter(Boolean)

    for (const label of labels) {
      const key = label.toLocaleLowerCase()
      const current = map.get(key) || { label, count: 0 }
      current.count += 1
      map.set(key, current)
    }
  }
  return map
}

const recentMovement = computed(() => {
  if (datedReflections.value.length < 4) {
    return {
      title: 'More history is needed for comparison.',
      body: 'Once there are at least four dated reflections, Helios will compare the earlier and more recent halves of your record without treating frequency as improvement or deterioration.',
      items: []
    }
  }

  const earlier = countLabels(splitHistory.value.earlier)
  const recent = countLabels(splitHistory.value.recent)
  const keys = new Set([...earlier.keys(), ...recent.keys()])
  const items = [...keys]
    .map(key => ({
      label: recent.get(key)?.label || earlier.get(key)?.label || key,
      earlier: earlier.get(key)?.count || 0,
      recent: recent.get(key)?.count || 0
    }))
    .filter(item => item.earlier + item.recent > 1 && item.earlier !== item.recent)
    .sort((a, b) => Math.abs(b.recent - b.earlier) - Math.abs(a.recent - a.earlier))
    .slice(0, 4)

  return {
    title: items.length ? 'The balance of attention has shifted.' : 'The main threads are relatively stable.',
    body: items.length
      ? 'These counts compare the earlier and more recent halves of your saved reflection history. They show where your attention has changed, not whether your practice has improved or worsened.'
      : 'Repeated themes and mapped positions are appearing at broadly similar rates across the two halves of your recorded history.',
    items
  }
})

const learningEdges = computed(() => recurringThreads.value.slice(0, 4).map(thread => {
  if (thread.kind === 'Inner position') {
    return {
      key: `position-${thread.key}`,
      kind: thread.kind,
      title: `Stay curious about “${thread.label}”.`,
      question: thread.contexts.length
        ? `You have named this response ${thread.count} times. When it appears, what helps you notice it earlier, and does the protective intention you recorded still fit what is happening in the room?`
        : `You have named this response ${thread.count} times. What tends to precede it, and what becomes possible when you notice it earlier?`
    }
  }

  return {
    key: `theme-${thread.key}`,
    kind: thread.kind,
    title: `Look more closely at “${thread.label}”.`,
    question: `This theme appears in ${thread.count} reflections. Is it recurring because of your caseload, your clinical stance, an unresolved question, or something else worth testing in supervision?`
  }
}))

const nextSteps = computed(() => learningEdges.value.slice(0, 4).map(edge => {
  if (edge.kind === 'Inner position') {
    return {
      source: edge.kind,
      title: 'Bring the sequence into supervision',
      description: `Use “${edge.title.replace(/^Stay curious about |[.“”]/g, '')}” as a marker: what preceded it, when you noticed it, and what happened next.`
    }
  }

  return {
    source: edge.kind,
    title: 'Compare the reflections carrying this theme',
    description: `Re-read the entries linked to ${edge.title.replace(/^Look more closely at |[.“”]/g, '')} and look for what is repeated, what differs, and what question remains open.`
  }
}))
</script>
