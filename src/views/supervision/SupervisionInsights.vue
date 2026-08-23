<template>
  <div class="mx-auto max-w-6xl space-y-10 p-4 pb-20 md:p-10">
    <header class="max-w-4xl space-y-4">
      <p class="type-eyebrow text-action-link">Reflective mapping</p>
      <h1 class="text-3xl font-semibold tracking-[-0.03em] text-ink md:text-4xl">Practice Map</h1>
      <p class="max-w-3xl text-base leading-7 text-ink-secondary">
        A changing picture of what you have noticed in yourself across the work — alongside recurring themes in your reflections.
      </p>
      <p class="max-w-3xl text-sm leading-6 text-ink-muted">
        Mapping is based on what you have written into your own reflective maps. Helios does not infer an inner position from free text, decide what a pattern means, assess your competence or turn reflective material into a client Clinical Record.
      </p>
    </header>

    <section class="grid overflow-hidden rounded-panel border border-border bg-border sm:grid-cols-4" aria-label="Measured reflection activity">
      <div class="bg-surface-raised p-6">
        <p class="type-eyebrow text-ink-muted">Last 30 days</p>
        <p class="mt-3 text-4xl font-semibold text-ink">{{ activity.recentCount }}</p>
        <p class="mt-1 text-sm text-ink-secondary">reflections recorded</p>
      </div>
      <div class="bg-surface-raised p-6">
        <p class="type-eyebrow text-ink-muted">Previous 30 days</p>
        <p class="mt-3 text-4xl font-semibold text-ink">{{ activity.previousCount }}</p>
        <p class="mt-1 text-sm text-ink-secondary">reflections recorded</p>
      </div>
      <div class="bg-surface-raised p-6">
        <p class="type-eyebrow text-ink-muted">Mapped reflections</p>
        <p class="mt-3 text-4xl font-semibold text-ink">{{ mappedReflections.length }}</p>
        <p class="mt-1 text-sm text-ink-secondary">with therapist-authored mapping</p>
      </div>
      <div class="bg-surface-raised p-6">
        <p class="type-eyebrow text-ink-muted">Recorded themes</p>
        <p class="mt-3 text-4xl font-semibold text-ink">{{ themeTrends.length }}</p>
        <p class="mt-1 text-sm text-ink-secondary">distinct themes in your history</p>
      </div>
    </section>

    <section aria-labelledby="inner-map-heading">
      <div class="mb-5 max-w-3xl">
        <p class="type-eyebrow text-action-link">Therapist-authored map</p>
        <h2 id="inner-map-heading" class="mt-2 text-2xl font-semibold text-ink">What has shown up in you.</h2>
        <p class="mt-2 text-sm leading-6 text-ink-secondary">Only positions you have named yourself appear here. Exact wording is grouped case-insensitively; Helios does not merge different descriptions or assign categories.</p>
      </div>

      <div v-if="positionCounts.length" class="grid overflow-hidden rounded-panel border border-border bg-border md:grid-cols-2 lg:grid-cols-3">
        <article v-for="position in positionCounts" :key="position.key" class="bg-surface-raised p-6">
          <div class="flex items-start justify-between gap-4">
            <h3 class="text-base font-semibold text-ink">{{ position.label }}</h3>
            <span class="rounded-pill border border-border px-2 py-0.5 text-xs font-semibold text-ink-muted">{{ position.count }}</span>
          </div>
          <p class="mt-2 text-xs leading-5 text-ink-muted">Noted across {{ position.count }} mapped {{ position.count === 1 ? 'reflection' : 'reflections' }}.</p>
          <p v-if="position.latestProtectiveIntention" class="mt-4 border-t border-border-muted pt-4 text-sm leading-6 text-ink-secondary"><strong class="text-ink">Most recently:</strong> {{ position.latestProtectiveIntention }}</p>
        </article>
      </div>
      <div v-else class="rounded-panel border border-dashed border-border p-8 text-sm leading-6 text-ink-muted">
        No inner positions have been mapped yet. Mapping is optional; when you name what seemed present in you, those observations can accumulate here over time.
      </div>
    </section>

    <section v-if="mappedReflections.length" class="grid gap-8 lg:grid-cols-2">
      <div>
        <div class="mb-5">
          <p class="type-eyebrow text-ink-muted">What seemed to bring it forward</p>
          <h2 class="mt-2 text-2xl font-semibold text-ink">Recent triggers you recorded</h2>
        </div>
        <div class="divide-y divide-border-muted border-y border-border-muted">
          <div v-for="item in recentMappingField('trigger')" :key="item.id" class="py-4">
            <p class="text-sm leading-6 text-ink-secondary">{{ item.text }}</p>
            <p class="mt-1 text-xs text-ink-muted">{{ formatDate(item.createdAt) }}</p>
          </div>
          <p v-if="recentMappingField('trigger').length === 0" class="py-5 text-sm text-ink-muted">No triggers have been recorded yet.</p>
        </div>
      </div>

      <div>
        <div class="mb-5">
          <p class="type-eyebrow text-ink-muted">What helped create space</p>
          <h2 class="mt-2 text-2xl font-semibold text-ink">What you noticed helped</h2>
        </div>
        <div class="divide-y divide-border-muted border-y border-border-muted">
          <div v-for="item in recentMappingField('spaceCreated')" :key="item.id" class="py-4">
            <p class="text-sm leading-6 text-ink-secondary">{{ item.text }}</p>
            <p class="mt-1 text-xs text-ink-muted">{{ formatDate(item.createdAt) }}</p>
          </div>
          <p v-if="recentMappingField('spaceCreated').length === 0" class="py-5 text-sm text-ink-muted">No observations about creating space have been recorded yet.</p>
        </div>
      </div>
    </section>

    <section class="grid gap-8 lg:grid-cols-[1.15fr_.85fr]" aria-labelledby="theme-map-heading">
      <div>
        <div class="mb-5">
          <p class="type-eyebrow text-ink-muted">Observed over time</p>
          <h2 id="theme-map-heading" class="mt-2 text-2xl font-semibold text-ink">Theme movement</h2>
          <p class="mt-2 text-sm leading-6 text-ink-secondary">Counts compare the last 30 days with the preceding 30 days. “More” and “less” describe frequency only.</p>
        </div>

        <div v-if="themeTrends.length" class="overflow-hidden rounded-panel border border-border">
          <div v-for="trend in themeTrends" :key="trend.name" class="grid grid-cols-[minmax(0,1fr)_72px_72px_90px] items-center gap-3 border-b border-border-muted bg-surface-raised px-4 py-3 last:border-b-0 sm:px-5">
            <span class="text-sm font-semibold text-ink">{{ trend.name }}</span>
            <span class="text-center text-xs text-ink-muted">{{ trend.recent }} recent</span>
            <span class="text-center text-xs text-ink-muted">{{ trend.previous }} prior</span>
            <span class="text-right text-xs font-semibold" :class="trendClass(trend.direction)">{{ trend.label }}</span>
          </div>
        </div>
        <div v-else class="rounded-panel border border-dashed border-border p-8 text-sm leading-6 text-ink-muted">
          Add themes to reflections as they become useful. The map will show recurrence without inventing meaning where none has been recorded.
        </div>
      </div>

      <aside class="rounded-panel border border-border bg-surface-muted p-6">
        <p class="type-eyebrow text-ink-muted">A map, not a verdict</p>
        <h2 class="mt-2 text-xl font-semibold text-ink">Hold patterns lightly.</h2>
        <p class="mt-3 text-sm leading-6 text-ink-secondary">The same inner response can be useful in one situation and constraining in another. The point is to recognise it early enough to have choice.</p>
        <div class="mt-6 space-y-4 border-t border-border-muted pt-5 text-sm">
          <p><strong class="text-ink">Notice:</strong> What part of you seemed most present?</p>
          <p><strong class="text-ink">Protect:</strong> What might it have been trying to prevent, manage or hold together?</p>
          <p><strong class="text-ink">Trigger:</strong> What in the situation seemed to bring it forward?</p>
          <p><strong class="text-ink">Space:</strong> What helped you regain curiosity, steadiness or choice?</p>
        </div>
      </aside>
    </section>

    <section class="grid gap-5 lg:grid-cols-[.8fr_1.2fr] lg:items-start">
      <div>
        <p class="type-eyebrow text-ink-muted">Questions worth carrying</p>
        <h2 class="mt-2 text-2xl font-semibold text-ink">Curiosity before conclusion.</h2>
      </div>
      <div class="divide-y divide-border-muted border-y border-border-muted">
        <p v-for="question in reflectiveQuestions" :key="question" class="py-4 text-base leading-7 text-ink-secondary">{{ question }}</p>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  reflections: { type: Array, default: () => [] },
  loading: Boolean,
  themes: { type: Array, default: () => [] }
})

const now = () => new Date()
const daysAgo = days => {
  const date = now()
  date.setDate(date.getDate() - days)
  return date
}

function reflectiveMapFor(reflection) {
  const map = reflection?.workspace_content?.reflectiveMap
  return map && typeof map === 'object' && !Array.isArray(map) ? map : null
}

const mappedReflections = computed(() => props.reflections
  .map(reflection => ({ reflection, map: reflectiveMapFor(reflection) }))
  .filter(({ map }) => map && Object.values(map).some(value => typeof value === 'string' && value.trim())))

const positionCounts = computed(() => {
  const counts = new Map()
  for (const { reflection, map } of mappedReflections.value) {
    const label = String(map.innerPosition || '').trim()
    if (!label) continue
    const key = label.toLocaleLowerCase()
    const existing = counts.get(key) || { key, label, count: 0, latestAt: '', latestProtectiveIntention: '' }
    existing.count += 1
    if (!existing.latestAt || new Date(reflection.created_at) > new Date(existing.latestAt)) {
      existing.latestAt = reflection.created_at
      existing.label = label
      existing.latestProtectiveIntention = String(map.protectiveIntention || '').trim()
    }
    counts.set(key, existing)
  }
  return [...counts.values()].sort((a, b) => b.count - a.count || new Date(b.latestAt) - new Date(a.latestAt)).slice(0, 9)
})

function recentMappingField(field) {
  return mappedReflections.value
    .map(({ reflection, map }) => ({ id: `${reflection.id}-${field}`, text: String(map[field] || '').trim(), createdAt: reflection.created_at }))
    .filter(item => item.text)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5)
}

function formatDate(value) {
  return new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

const activity = computed(() => {
  const recentBoundary = daysAgo(30)
  const previousBoundary = daysAgo(60)
  const recentCount = props.reflections.filter(reflection => new Date(reflection.created_at) >= recentBoundary).length
  const previousCount = props.reflections.filter(reflection => {
    const date = new Date(reflection.created_at)
    return date >= previousBoundary && date < recentBoundary
  }).length
  return { recentCount, previousCount }
})

const themeTrends = computed(() => {
  const recentBoundary = daysAgo(30)
  const previousBoundary = daysAgo(60)
  const counts = new Map()
  for (const reflection of props.reflections) {
    if (!reflection.theme) continue
    if (!counts.has(reflection.theme)) counts.set(reflection.theme, { name: reflection.theme, total: 0, recent: 0, previous: 0 })
    const entry = counts.get(reflection.theme)
    entry.total += 1
    const date = new Date(reflection.created_at)
    if (date >= recentBoundary) entry.recent += 1
    else if (date >= previousBoundary) entry.previous += 1
  }
  return [...counts.values()]
    .map(entry => {
      let direction = 'steady'
      if (entry.recent > entry.previous) direction = 'more'
      if (entry.recent < entry.previous) direction = 'less'
      const label = direction === 'more' ? 'More frequent' : direction === 'less' ? 'Less frequent' : 'No change'
      return { ...entry, direction, label }
    })
    .sort((a, b) => b.total - a.total)
    .slice(0, 8)
})

function trendClass(direction) {
  if (direction === 'more') return 'text-action-link'
  if (direction === 'less') return 'text-ink-muted'
  return 'text-ink-secondary'
}

const reflectiveQuestions = [
  'Which inner position seems to appear across very different clients or situations?',
  'When does a normally helpful professional strength become rigid or urgent?',
  'What does that response seem to be protecting in you, in the client, or in the therapeutic relationship?',
  'What changes when you can notice the response without immediately acting from it?',
  'Which of these observations deserves a human supervision conversation rather than a private conclusion?'
]
</script>
