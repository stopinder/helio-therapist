<template>
  <div class="mx-auto max-w-7xl space-y-12 p-4 pb-20 md:p-10">
    <header class="grid gap-8 border-b border-border-muted pb-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,.85fr)] lg:items-end">
      <div class="max-w-4xl">
        <p class="type-eyebrow text-action-link">Your practice</p>
        <h1 class="mt-4 max-w-3xl text-4xl font-semibold tracking-[-0.04em] text-ink md:text-5xl">A place to become the therapist you want to be.</h1>
        <p class="mt-5 max-w-2xl text-base leading-7 text-ink-secondary">Step out of the administrative flow. Reflect on what the work is bringing up, notice what changes over time, and follow the threads that make you more curious, more spacious and more effective.</p>
      </div>

      <div class="border-l-2 border-brand-amber px-6 py-2">
        <p class="type-eyebrow text-ink-muted">Daily pause</p>
        <blockquote class="mt-3 text-xl leading-8 text-ink">“{{ dailyPause.quote }}”</blockquote>
        <p class="mt-3 text-sm font-semibold text-ink-secondary">{{ dailyPause.attribution }}</p>
        <router-link to="/supervision/reflections" class="mt-5 inline-flex text-sm font-semibold text-action-link">{{ dailyPause.prompt }} →</router-link>
      </div>
    </header>

    <section class="grid gap-5 lg:grid-cols-[1.25fr_.75fr]" aria-labelledby="mirror-heading">
      <article class="relative overflow-hidden rounded-panel border border-border bg-surface-raised p-7 md:p-9">
        <div class="absolute right-0 top-0 h-full w-1 bg-brand-amber" aria-hidden="true"></div>
        <p class="type-eyebrow text-action-link">Something worth noticing</p>
        <h2 id="mirror-heading" class="mt-3 max-w-2xl text-2xl font-semibold tracking-[-0.02em] text-ink md:text-3xl">{{ mirror.title }}</h2>
        <p class="mt-4 max-w-3xl text-base leading-7 text-ink-secondary">{{ mirror.body }}</p>
        <p class="mt-4 max-w-3xl text-sm leading-6 text-ink-muted">{{ mirror.boundary }}</p>
        <div class="mt-7 flex flex-wrap gap-3">
          <router-link :to="mirror.primaryPath" class="rounded-button bg-action px-4 py-2.5 text-sm font-semibold text-white hover:bg-action-hover">{{ mirror.primaryLabel }}</router-link>
          <router-link to="/supervision/insights" class="rounded-button border border-border bg-surface-raised px-4 py-2.5 text-sm font-semibold text-ink hover:bg-surface-muted">Open my Practice Map</router-link>
        </div>
      </article>

      <aside class="rounded-panel border border-border bg-surface-muted p-7">
        <p class="type-eyebrow text-ink-muted">Your reflective picture</p>
        <div class="mt-6 grid grid-cols-2 gap-x-6 gap-y-7">
          <div>
            <p class="text-4xl font-semibold tracking-[-0.04em] text-ink">{{ mappedReflectionCount }}</p>
            <p class="mt-1 text-sm leading-5 text-ink-muted">mapped reflections</p>
          </div>
          <div>
            <p class="text-4xl font-semibold tracking-[-0.04em] text-ink">{{ recurringThemeCount }}</p>
            <p class="mt-1 text-sm leading-5 text-ink-muted">recurring themes</p>
          </div>
          <div class="col-span-2 border-t border-border-muted pt-5">
            <p class="text-sm leading-6 text-ink-secondary">This picture grows from what you record and confirm. Helios can suggest connections, but you decide what belongs in your map.</p>
          </div>
        </div>
      </aside>
    </section>

    <section aria-labelledby="threads-heading">
      <div class="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p class="type-eyebrow text-ink-muted">Your practice map</p>
          <h2 id="threads-heading" class="mt-2 text-2xl font-semibold text-ink">Threads you may want to stay curious about.</h2>
        </div>
        <router-link to="/supervision/insights" class="text-sm font-semibold text-action-link">Explore the full map →</router-link>
      </div>

      <div v-if="practiceThreads.length" class="grid overflow-hidden rounded-panel border border-border bg-border md:grid-cols-2 lg:grid-cols-4">
        <router-link v-for="thread in practiceThreads" :key="thread.label" to="/supervision/insights" class="group min-h-[220px] bg-surface-raised p-6 transition-colors hover:bg-surface-muted">
          <div class="flex items-start justify-between gap-4">
            <span class="type-eyebrow text-ink-muted">{{ thread.kind }}</span>
            <span class="text-xs font-semibold text-ink-muted">{{ thread.count }}×</span>
          </div>
          <h3 class="mt-8 text-lg font-semibold text-ink">{{ thread.label }}</h3>
          <p class="mt-3 text-sm leading-6 text-ink-secondary">{{ thread.context }}</p>
          <p class="mt-6 text-sm font-semibold text-action-link opacity-80 group-hover:opacity-100">Stay with this →</p>
        </router-link>
      </div>
      <div v-else class="grid overflow-hidden rounded-panel border border-border bg-border md:grid-cols-3">
        <article v-for="seed in emptyThreads" :key="seed.title" class="min-h-[210px] bg-surface-raised p-6">
          <p class="type-eyebrow text-ink-muted">{{ seed.eyebrow }}</p>
          <h3 class="mt-7 text-lg font-semibold text-ink">{{ seed.title }}</h3>
          <p class="mt-3 text-sm leading-6 text-ink-secondary">{{ seed.body }}</p>
        </article>
      </div>
    </section>

    <section class="grid gap-6 lg:grid-cols-[.85fr_1.15fr] lg:items-start" aria-labelledby="continue-heading">
      <div class="max-w-xl">
        <p class="type-eyebrow text-action-link">Follow your curiosity</p>
        <h2 id="continue-heading" class="mt-3 text-3xl font-semibold tracking-[-0.03em] text-ink">What would help today?</h2>
        <p class="mt-4 text-base leading-7 text-ink-secondary">There is no required route through this space. Reflect, explore something Helios has noticed, deepen a learning thread, or simply return to something that stayed with you.</p>
      </div>

      <div class="divide-y divide-border-muted border-y border-border-muted">
        <router-link v-for="action in primaryActions" :key="action.title" :to="action.path" class="group grid gap-2 py-5 sm:grid-cols-[180px_1fr_auto] sm:items-center sm:gap-5">
          <h3 class="font-semibold text-ink">{{ action.title }}</h3>
          <p class="text-sm leading-6 text-ink-secondary">{{ action.description }}</p>
          <span class="text-action-link transition-transform group-hover:translate-x-1">→</span>
        </router-link>
      </div>
    </section>

    <section class="grid gap-4 border-t border-border-muted pt-8 md:grid-cols-2" aria-label="Professional development utilities">
      <router-link to="/supervision/growth" class="rounded-panel border border-border bg-surface-raised p-6 hover:bg-surface-muted">
        <p class="type-eyebrow text-ink-muted">Development</p>
        <h2 class="mt-3 text-lg font-semibold text-ink">Turn curiosity into deliberate learning.</h2>
        <p class="mt-2 text-sm leading-6 text-ink-secondary">Carry a thread into reading, practice, formal CPD or a learning priority and come back to see what changed.</p>
      </router-link>
      <router-link to="/supervision/workspace" class="rounded-panel border border-border bg-surface-raised p-6 hover:bg-surface-muted">
        <p class="type-eyebrow text-ink-muted">Supervision & consultation</p>
        <h2 class="mt-3 text-lg font-semibold text-ink">Take something further when you need another perspective.</h2>
        <p class="mt-2 text-sm leading-6 text-ink-secondary">Prepare selected material for supervision or consultation. This is one route through the space, not the destination for every reflection.</p>
      </router-link>
    </section>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  reflections: { type: Array, default: () => [] },
  loading: Boolean
})

defineEmits(['open-reflection'])

const dailyPauses = [
  { quote: 'The work changes when we can notice what is happening in us without having to act from it.', attribution: 'Helios reflection', prompt: 'What are you carrying from the work today?' },
  { quote: 'Curiosity creates a little more room between what we feel and what we do next.', attribution: 'Helios reflection', prompt: 'Where could a little more room help today?' },
  { quote: 'A repeated response is not a verdict about us. It is an invitation to become interested.', attribution: 'Helios reflection', prompt: 'What has been repeating lately?' },
  { quote: 'Sometimes development begins by noticing the moment we most want the session to be different.', attribution: 'Helios reflection', prompt: 'Which moment has stayed with you?' },
  { quote: 'What protects us in difficult work can also teach us where we need more choice.', attribution: 'Helios reflection', prompt: 'What in you has been working particularly hard?' },
  { quote: 'The aim is not to become unaffected by the work, but to know ourselves well enough to stay available within it.', attribution: 'Helios reflection', prompt: 'What helps you stay available?' },
  { quote: 'The therapist is part of the therapeutic field. Our responses are information when held with care.', attribution: 'Helios reflection', prompt: 'What did you notice in yourself this week?' },
  { quote: 'Learning becomes part of us when we can recognise it later in the room.', attribution: 'Helios reflection', prompt: 'What are you beginning to do differently?' }
]

const dayNumber = Math.floor(new Date().setHours(0, 0, 0, 0) / 86400000)
const dailyPause = computed(() => dailyPauses[Math.abs(dayNumber) % dailyPauses.length])

function reflectiveMapFor(reflection) {
  const map = reflection?.workspace_content?.reflectiveMap
  return map && typeof map === 'object' && !Array.isArray(map) ? map : null
}

const mappedReflections = computed(() => props.reflections
  .map(reflection => ({ reflection, map: reflectiveMapFor(reflection) }))
  .filter(({ map }) => map && Object.values(map).some(value => typeof value === 'string' && value.trim())))

const mappedReflectionCount = computed(() => mappedReflections.value.length)

const themeCounts = computed(() => {
  const counts = new Map()
  for (const reflection of props.reflections) {
    const theme = String(reflection.theme || '').trim()
    if (!theme) continue
    const key = theme.toLocaleLowerCase()
    const entry = counts.get(key) || { label: theme, count: 0 }
    entry.count += 1
    counts.set(key, entry)
  }
  return [...counts.values()].sort((a, b) => b.count - a.count)
})

const recurringThemeCount = computed(() => themeCounts.value.filter(theme => theme.count > 1).length)

const positionCounts = computed(() => {
  const counts = new Map()
  for (const { map } of mappedReflections.value) {
    const label = String(map.innerPosition || '').trim()
    if (!label) continue
    const key = label.toLocaleLowerCase()
    const entry = counts.get(key) || { label, count: 0, context: '' }
    entry.count += 1
    if (map.protectiveIntention) entry.context = String(map.protectiveIntention).trim()
    counts.set(key, entry)
  }
  return [...counts.values()].sort((a, b) => b.count - a.count)
})

const practiceThreads = computed(() => {
  const positions = positionCounts.value.slice(0, 2).map(item => ({ ...item, kind: 'Inner position', context: item.context || 'A response you have chosen to notice across your work.' }))
  const themes = themeCounts.value.filter(item => item.count > 1).slice(0, 2).map(item => ({ ...item, kind: 'Recurring theme', context: 'This theme has appeared in more than one of your private reflections.' }))
  return [...positions, ...themes].slice(0, 4)
})

const mirror = computed(() => {
  const repeatedPosition = positionCounts.value.find(item => item.count > 1)
  if (repeatedPosition) return {
    title: `You have named “${repeatedPosition.label}” more than once.`,
    body: repeatedPosition.context ? `Most recently, you described it as trying to ${lowercaseFirst(repeatedPosition.context)}. That does not tell us what it means, but the recurrence may be worth staying curious about.` : 'You have chosen similar language for this inner response across more than one reflection. The recurrence may be worth staying curious about.',
    boundary: 'This comes only from mapping you authored. Helios has not inferred it from a client transcript or assigned you a type.',
    primaryLabel: 'Explore this thread',
    primaryPath: '/supervision/insights'
  }

  const repeatedTheme = themeCounts.value.find(item => item.count > 1)
  if (repeatedTheme) return {
    title: `“${repeatedTheme.label}” keeps returning in your reflections.`,
    body: `You have used this theme ${repeatedTheme.count} times. Frequency alone does not explain why it matters, but it gives you something concrete to explore rather than a conclusion to accept.`,
    boundary: 'Helios is reporting what you recorded, not interpreting the client or assessing your practice.',
    primaryLabel: 'Look at the pattern',
    primaryPath: '/supervision/insights'
  }

  return {
    title: 'What from the work is still with you?',
    body: 'A moment of urgency, warmth, irritation, helplessness, relief or uncertainty can be useful material. You do not need to understand it before you record it.',
    boundary: 'Private reflection belongs to your professional development space and remains separate from the client Clinical Record.',
    primaryLabel: 'Start a reflection',
    primaryPath: '/supervision/reflections'
  }
})

function lowercaseFirst(value) {
  return value ? value.charAt(0).toLocaleLowerCase() + value.slice(1) : value
}

const emptyThreads = [
  { eyebrow: 'Notice', title: 'What shows up in you?', body: 'Capture an inner response in your own words when something in the work catches your attention.' },
  { eyebrow: 'Stay curious', title: 'What might it be trying to do?', body: 'Explore protective intentions without forcing the response into a fixed category or explanation.' },
  { eyebrow: 'Across time', title: 'What changes?', body: 'As reflections accumulate, Helios can help you revisit recurring threads and see whether your relationship to them shifts.' }
]

const primaryActions = [
  { title: 'Reflect', path: '/supervision/reflections', description: 'Return to something from your work without needing to make it a formal record.' },
  { title: 'Explore my map', path: '/supervision/insights', description: 'Follow recurring inner positions, themes and things you have chosen to keep noticing.' },
  { title: 'Learn & develop', path: '/supervision/growth', description: 'Turn a live question into reading, practice, CPD or a deliberate learning thread.' }
]
</script>
