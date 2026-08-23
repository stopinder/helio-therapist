<template>
  <div class="mx-auto max-w-6xl space-y-10 p-4 pb-20 md:p-10">
    <header class="max-w-4xl space-y-4">
      <p class="type-eyebrow text-action-link">Map</p>
      <h1 class="text-3xl font-semibold tracking-[-0.03em] text-ink md:text-4xl">Practice Map</h1>
      <p class="max-w-3xl text-base leading-7 text-ink-secondary">A changing picture of recurrence, sequence and change across what you have chosen to record.</p>
      <p class="max-w-3xl text-sm leading-6 text-ink-muted">The map stays close to your own words. Helios can organise recurrence and sequence; it does not decide what either means, assess your competence, or turn reflective material into a client Clinical Record.</p>
    </header>

    <section v-if="sequenceThreads.length" aria-labelledby="sequence-heading">
      <div class="mb-5 max-w-3xl">
        <p class="type-eyebrow text-action-link">Sequence</p>
        <h2 id="sequence-heading" class="mt-2 text-2xl font-semibold text-ink">What tends to happen next?</h2>
        <p class="mt-2 text-sm leading-6 text-ink-secondary">These sequences use only elements you recorded in your reflective maps. Repetition can make a process easier to see without explaining why it happens.</p>
      </div>
      <div class="grid gap-4 lg:grid-cols-2">
        <article v-for="sequence in sequenceThreads" :key="sequence.key" class="rounded-panel border border-border bg-surface-raised p-6 md:p-7">
          <div class="flex items-start justify-between gap-5">
            <p class="type-eyebrow text-ink-muted">Seen {{ sequence.count }}×</p>
            <span class="text-xs text-ink-muted">{{ formatDate(sequence.latestAt) }}</span>
          </div>
          <div class="mt-5 flex flex-wrap items-center gap-2 text-sm font-medium text-ink">
            <template v-for="(step, index) in sequence.steps" :key="`${sequence.key}-${index}`">
              <span class="rounded-control border border-border-muted bg-surface-muted px-3 py-2">{{ step }}</span>
              <span v-if="index < sequence.steps.length - 1" class="text-ink-muted" aria-hidden="true">→</span>
            </template>
          </div>
          <p v-if="sequence.latestSpace" class="mt-5 border-t border-border-muted pt-4 text-sm leading-6 text-ink-secondary"><strong class="text-ink">Most recently, something created more room:</strong> {{ sequence.latestSpace }}</p>
        </article>
      </div>
    </section>

    <section v-if="changeSignals.length" aria-labelledby="change-heading" class="rounded-panel border border-border bg-surface-muted p-7 md:p-9">
      <p class="type-eyebrow text-ink-muted">Change</p>
      <h2 id="change-heading" class="mt-2 text-2xl font-semibold text-ink">Where the sequence did not simply continue.</h2>
      <div class="mt-6 divide-y divide-border-muted border-y border-border-muted">
        <div v-for="signal in changeSignals" :key="signal.id" class="py-4">
          <p class="text-sm leading-6 text-ink-secondary">{{ signal.text }}</p>
          <p class="mt-1 text-xs text-ink-muted">{{ formatDate(signal.createdAt) }}</p>
        </div>
      </div>
    </section>

    <section aria-labelledby="responses-heading">
      <div class="mb-5 max-w-3xl">
        <p class="type-eyebrow text-ink-muted">Recurring responses</p>
        <h2 id="responses-heading" class="mt-2 text-2xl font-semibold text-ink">What has shown up in you.</h2>
        <p class="mt-2 text-sm leading-6 text-ink-secondary">Only language you have used yourself appears here. Similar-sounding descriptions are not automatically merged or categorised.</p>
      </div>
      <div v-if="positionCounts.length" class="grid overflow-hidden rounded-panel border border-border bg-border md:grid-cols-2 lg:grid-cols-3">
        <article v-for="position in positionCounts" :key="position.key" class="bg-surface-raised p-6">
          <div class="flex items-start justify-between gap-4"><h3 class="text-base font-semibold text-ink">{{ position.label }}</h3><span class="rounded-pill border border-border px-2 py-0.5 text-xs font-semibold text-ink-muted">{{ position.count }}</span></div>
          <p class="mt-2 text-xs leading-5 text-ink-muted">Noted across {{ position.count }} mapped {{ position.count === 1 ? 'reflection' : 'reflections' }}.</p>
          <p v-if="position.latestProtectiveIntention" class="mt-4 border-t border-border-muted pt-4 text-sm leading-6 text-ink-secondary"><strong class="text-ink">Most recently:</strong> {{ position.latestProtectiveIntention }}</p>
        </article>
      </div>
      <div v-else class="rounded-panel border border-dashed border-border p-8 text-sm leading-6 text-ink-muted">Nothing has repeated enough to form this part of the map yet.</div>
    </section>

    <section class="grid gap-8 lg:grid-cols-[1.15fr_.85fr]" aria-labelledby="theme-map-heading">
      <div>
        <div class="mb-5">
          <p class="type-eyebrow text-ink-muted">Observed over time</p>
          <h2 id="theme-map-heading" class="mt-2 text-2xl font-semibold text-ink">Theme movement</h2>
          <p class="mt-2 text-sm leading-6 text-ink-secondary">A simple comparison of frequency in the last 30 days and the 30 days before that. More or less does not mean better or worse.</p>
        </div>
        <div v-if="themeTrends.length" class="overflow-hidden rounded-panel border border-border">
          <div v-for="trend in themeTrends" :key="trend.name" class="grid grid-cols-[minmax(0,1fr)_72px_72px_90px] items-center gap-3 border-b border-border-muted bg-surface-raised px-4 py-3 last:border-b-0 sm:px-5">
            <span class="text-sm font-semibold text-ink">{{ trend.name }}</span><span class="text-center text-xs text-ink-muted">{{ trend.recent }} recent</span><span class="text-center text-xs text-ink-muted">{{ trend.previous }} prior</span><span class="text-right text-xs font-semibold" :class="trendClass(trend.direction)">{{ trend.label }}</span>
          </div>
        </div>
        <div v-else class="rounded-panel border border-dashed border-border p-8 text-sm leading-6 text-ink-muted">As themes recur, their movement over time can appear here.</div>
      </div>

      <aside class="rounded-panel border border-border bg-surface-raised p-6">
        <p class="type-eyebrow text-ink-muted">Reading the map</p>
        <h2 class="mt-2 text-xl font-semibold text-ink">Sequence before explanation.</h2>
        <p class="mt-3 text-sm leading-6 text-ink-secondary">A useful map can begin with something very ordinary: what happened, what you noticed in yourself, what followed, and whether anything altered the next step.</p>
        <p class="mt-5 border-t border-border-muted pt-5 text-sm leading-6 text-ink-muted">Over time, repeated sequences may reveal loops. Helios should make those loops visible without deciding whether they are helpful, unhelpful or what caused them.</p>
      </aside>
    </section>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({ reflections: { type: Array, default: () => [] }, loading: Boolean, themes: { type: Array, default: () => [] } })
const daysAgo = days => { const date = new Date(); date.setDate(date.getDate() - days); return date }

function reflectiveMapFor(reflection) {
  const map = reflection?.workspace_content?.reflectiveMap
  return map && typeof map === 'object' && !Array.isArray(map) ? map : null
}

const mappedReflections = computed(() => props.reflections.map(reflection => ({ reflection, map: reflectiveMapFor(reflection) })).filter(({ map }) => map && Object.values(map).some(value => typeof value === 'string' && value.trim())))

const sequenceThreads = computed(() => {
  const counts = new Map()
  for (const { reflection, map } of mappedReflections.value) {
    const steps = [map.trigger, map.innerPosition, map.protectiveIntention, map.impact].map(value => String(value || '').trim()).filter(Boolean)
    if (steps.length < 2) continue
    const key = steps.slice(0, 3).join('|').toLocaleLowerCase()
    const existing = counts.get(key) || { key, steps: steps.slice(0, 3), count: 0, latestAt: '', latestSpace: '' }
    existing.count += 1
    if (!existing.latestAt || new Date(reflection.created_at) > new Date(existing.latestAt)) {
      existing.latestAt = reflection.created_at
      existing.steps = steps.slice(0, 3)
      existing.latestSpace = String(map.spaceCreated || '').trim()
    }
    counts.set(key, existing)
  }
  return [...counts.values()].filter(item => item.count > 1).sort((a, b) => b.count - a.count || new Date(b.latestAt) - new Date(a.latestAt)).slice(0, 4)
})

const changeSignals = computed(() => mappedReflections.value.map(({ reflection, map }) => ({ id: reflection.id, text: String(map.spaceCreated || '').trim(), createdAt: reflection.created_at })).filter(item => item.text).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5))

const positionCounts = computed(() => {
  const counts = new Map()
  for (const { reflection, map } of mappedReflections.value) {
    const label = String(map.innerPosition || '').trim(); if (!label) continue
    const key = label.toLocaleLowerCase(); const existing = counts.get(key) || { key, label, count: 0, latestAt: '', latestProtectiveIntention: '' }
    existing.count += 1
    if (!existing.latestAt || new Date(reflection.created_at) > new Date(existing.latestAt)) { existing.latestAt = reflection.created_at; existing.label = label; existing.latestProtectiveIntention = String(map.protectiveIntention || '').trim() }
    counts.set(key, existing)
  }
  return [...counts.values()].filter(item => item.count > 1).sort((a, b) => b.count - a.count || new Date(b.latestAt) - new Date(a.latestAt)).slice(0, 9)
})

const themeTrends = computed(() => {
  const recentBoundary = daysAgo(30); const previousBoundary = daysAgo(60); const counts = new Map()
  for (const reflection of props.reflections) {
    if (!reflection.theme) continue
    if (!counts.has(reflection.theme)) counts.set(reflection.theme, { name: reflection.theme, total: 0, recent: 0, previous: 0 })
    const entry = counts.get(reflection.theme); entry.total += 1; const date = new Date(reflection.created_at)
    if (date >= recentBoundary) entry.recent += 1; else if (date >= previousBoundary) entry.previous += 1
  }
  return [...counts.values()].map(entry => { let direction = 'steady'; if (entry.recent > entry.previous) direction = 'more'; if (entry.recent < entry.previous) direction = 'less'; return { ...entry, direction, label: direction === 'more' ? 'More frequent' : direction === 'less' ? 'Less frequent' : 'No change' } }).sort((a, b) => b.total - a.total).slice(0, 8)
})

function trendClass(direction) { if (direction === 'more') return 'text-action-link'; if (direction === 'less') return 'text-ink-muted'; return 'text-ink-secondary' }
function formatDate(value) { return new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) }
</script>
