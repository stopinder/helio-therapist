<template>
  <div class="mx-auto max-w-6xl space-y-10 p-4 pb-20 md:p-10">
    <header class="max-w-4xl space-y-4">
      <p class="type-eyebrow text-action-link">Reflective mapping</p>
      <h1 class="text-3xl font-semibold tracking-[-0.03em] text-ink md:text-4xl">Practice Map</h1>
      <p class="max-w-3xl text-base leading-7 text-ink-secondary">
        A changing picture of what repeatedly catches your attention in the work — including themes, situations and inner positions that may become activated.
      </p>
      <p class="max-w-3xl text-sm leading-6 text-ink-muted">
        Helios reports what is present in your reflections and invites curiosity about it. It does not decide what a pattern means, assess your competence or turn reflective material into a client Clinical Record.
      </p>
    </header>

    <section class="grid overflow-hidden rounded-panel border border-border bg-border sm:grid-cols-3" aria-label="Measured reflection activity">
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
        <p class="type-eyebrow text-ink-muted">Recorded themes</p>
        <p class="mt-3 text-4xl font-semibold text-ink">{{ themeTrends.length }}</p>
        <p class="mt-1 text-sm text-ink-secondary">distinct themes in your history</p>
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
          <p><strong class="text-ink">Need:</strong> What helped you regain space, curiosity or steadiness?</p>
        </div>
      </aside>
    </section>

    <section aria-labelledby="inner-map-heading">
      <div class="mb-5 max-w-3xl">
        <p class="type-eyebrow text-action-link">Inner positions</p>
        <h2 id="inner-map-heading" class="mt-2 text-2xl font-semibold text-ink">A language for what shows up in you.</h2>
        <p class="mt-2 text-sm leading-6 text-ink-secondary">These are prompts, not categories Helios assigns to you. Use the language that fits your own experience.</p>
      </div>

      <div class="grid overflow-hidden rounded-panel border border-border bg-border md:grid-cols-2 lg:grid-cols-4">
        <article v-for="position in mappingPositions" :key="position.title" class="bg-surface-raised p-6">
          <h3 class="text-base font-semibold text-ink">{{ position.title }}</h3>
          <p class="mt-2 text-sm leading-6 text-ink-secondary">{{ position.description }}</p>
          <p class="mt-4 border-t border-border-muted pt-4 text-xs leading-5 text-ink-muted">{{ position.question }}</p>
        </article>
      </div>
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

const mappingPositions = [
  {
    title: 'The organiser',
    description: 'The part that tries to stay ahead, anticipate needs and keep the work contained.',
    question: 'What feels at risk if you stop managing for a moment?'
  },
  {
    title: 'The rescuer',
    description: 'The part that wants relief quickly when a client is distressed, stuck or disappointed.',
    question: 'What happens inside you when the client remains uncomfortable?'
  },
  {
    title: 'The vigilant one',
    description: 'The part that scans for risk, mistakes, rupture or something important being missed.',
    question: 'What is it working hard to make sure never happens?'
  },
  {
    title: 'The withdrawing one',
    description: 'The part that may become quieter, more distant or procedural when the work feels intense.',
    question: 'What might distance be helping you not feel or not have to do?'
  }
]

const reflectiveQuestions = [
  'Which inner position seems to appear across very different clients or situations?',
  'When does a normally helpful professional strength become rigid or urgent?',
  'What does that response seem to be protecting in you, in the client, or in the therapeutic relationship?',
  'What changes when you can notice the response without immediately acting from it?',
  'Which of these observations deserves a human supervision conversation rather than a private conclusion?'
]
</script>
