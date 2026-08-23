<template>
  <div class="mx-auto max-w-7xl p-4 pb-20 md:p-10">
    <header class="border-b border-border-muted pb-7">
      <div class="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p class="type-eyebrow text-action-link">Your practice</p>
          <h1 class="mt-3 text-3xl font-semibold tracking-[-0.035em] text-ink md:text-4xl">Practice</h1>
        </div>
        <blockquote class="max-w-xl text-sm leading-6 text-ink-muted">“{{ dailyPause.quote }}” <span class="whitespace-nowrap">— {{ dailyPause.attribution }}</span></blockquote>
      </div>
    </header>

    <main class="space-y-12 pt-7">
      <nav aria-label="Practice spaces" class="grid gap-3 md:grid-cols-3">
        <router-link v-for="item in navigation" :key="item.path" :to="item.path" class="group flex min-h-[150px] flex-col justify-between rounded-panel border border-border bg-surface-raised p-6 transition-colors hover:border-border-strong hover:bg-surface-muted md:p-7">
          <div class="flex items-start justify-between gap-5">
            <span class="flex h-10 w-10 items-center justify-center rounded-control border border-border-muted bg-surface-muted text-action-link"><component :is="item.icon" class="h-5 w-5" aria-hidden="true" /></span>
            <span class="text-lg text-action-link transition-transform group-hover:translate-x-1" aria-hidden="true">→</span>
          </div>
          <div class="mt-7">
            <h2 class="text-lg font-semibold tracking-[-0.015em] text-ink">{{ item.label }}</h2>
            <p class="mt-2 max-w-sm text-sm leading-6 text-ink-secondary">{{ item.description }}</p>
          </div>
        </router-link>
      </nav>

      <section aria-labelledby="discovery-heading">
        <article v-if="discovery" class="grid overflow-hidden rounded-panel border border-border bg-surface-raised lg:grid-cols-[minmax(0,1fr)_240px]">
          <div class="p-7 md:p-10">
            <p class="type-eyebrow text-action-link">Something worth noticing</p>
            <h2 id="discovery-heading" class="mt-4 max-w-3xl text-2xl font-semibold tracking-[-0.025em] text-ink md:text-3xl">{{ discovery.title }}</h2>
            <p class="mt-5 max-w-3xl text-base leading-7 text-ink-secondary">{{ discovery.body }}</p>
            <router-link to="/supervision/insights" class="mt-7 inline-flex text-sm font-semibold text-action-link">Open map →</router-link>
          </div>
          <div class="flex items-end border-t border-border-muted bg-surface-muted p-7 lg:border-l lg:border-t-0">
            <div>
              <p class="text-5xl font-semibold tracking-[-0.05em] text-ink">{{ discovery.count }}</p>
              <p class="mt-2 text-sm leading-6 text-ink-muted">{{ discovery.countLabel }}</p>
            </div>
          </div>
        </article>

        <div v-else class="rounded-panel border border-border bg-surface-raised px-7 py-9 md:px-10">
          <p class="type-eyebrow text-ink-muted">Map</p>
          <h2 id="discovery-heading" class="mt-3 text-2xl font-semibold text-ink">Your map will take shape as you work.</h2>
          <p class="mt-3 max-w-3xl text-sm leading-6 text-ink-secondary">Over time, reflections can reveal recurring responses, sequences and moments where something begins to change.</p>
        </div>
      </section>

      <section v-if="practiceThreads.length" aria-labelledby="map-heading">
        <div class="mb-5 flex items-end justify-between gap-4">
          <div>
            <p class="type-eyebrow text-ink-muted">Map</p>
            <h2 id="map-heading" class="mt-2 text-2xl font-semibold text-ink">Threads taking shape</h2>
          </div>
          <router-link to="/supervision/insights" class="text-sm font-semibold text-action-link">Full map →</router-link>
        </div>

        <div class="grid overflow-hidden rounded-panel border border-border bg-border md:grid-cols-2 lg:grid-cols-4">
          <router-link v-for="thread in practiceThreads" :key="`${thread.kind}-${thread.label}`" to="/supervision/insights" class="group min-h-[190px] bg-surface-raised p-6 hover:bg-surface-muted">
            <div class="flex items-start justify-between gap-4">
              <span class="type-eyebrow text-ink-muted">{{ thread.kind }}</span>
              <span class="text-xs font-semibold text-ink-muted">{{ thread.count }}×</span>
            </div>
            <h3 class="mt-8 text-lg font-semibold text-ink">{{ thread.label }}</h3>
            <p v-if="thread.context" class="mt-3 text-sm leading-6 text-ink-secondary">{{ thread.context }}</p>
          </router-link>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { BookOpenText, Map, Sprout } from '@lucide/vue'

const props = defineProps({
  reflections: { type: Array, default: () => [] },
  loading: Boolean
})

const dailyPauses = [
  { quote: 'Curiosity creates a little more room between what we feel and what we do next.', attribution: 'Helios' },
  { quote: 'A repeated response is not a verdict. It is something we can become interested in.', attribution: 'Helios' },
  { quote: 'Sometimes development begins with noticing the moment we most want the session to be different.', attribution: 'Helios' },
  { quote: 'The aim is not to become unaffected by the work, but to remain available within it.', attribution: 'Helios' },
  { quote: 'Our responses to the work can become information when we have enough room to notice them.', attribution: 'Helios' },
  { quote: 'Learning becomes part of practice when we begin to recognise it in the room.', attribution: 'Helios' },
  { quote: 'What repeats can become familiar enough to notice before it takes over.', attribution: 'Helios' },
  { quote: 'A little more awareness can create a little more choice.', attribution: 'Helios' }
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

const sequenceCounts = computed(() => {
  const counts = new Map()
  for (const { map } of mappedReflections.value) {
    const sequence = [map.trigger, map.innerPosition, map.protectiveIntention, map.impact]
      .map(value => String(value || '').trim())
      .filter(Boolean)
    if (sequence.length < 2) continue
    const label = sequence.slice(0, 3).join(' → ')
    const key = label.toLocaleLowerCase()
    const entry = counts.get(key) || { label, count: 0, context: '' }
    entry.count += 1
    if (map.spaceCreated) entry.context = `Most recently, you noticed: ${String(map.spaceCreated).trim()}`
    counts.set(key, entry)
  }
  return [...counts.values()].sort((a, b) => b.count - a.count)
})

const practiceThreads = computed(() => {
  const sequences = sequenceCounts.value.filter(item => item.count > 1).slice(0, 1).map(item => ({ ...item, kind: 'Recurring sequence' }))
  const positions = positionCounts.value.filter(item => item.count > 1).slice(0, 2).map(item => ({ ...item, kind: 'Recurring response' }))
  const themes = themeCounts.value.filter(item => item.count > 1).slice(0, 2).map(item => ({ ...item, kind: 'Recurring theme', context: '' }))
  return [...sequences, ...positions, ...themes].slice(0, 4)
})

const discovery = computed(() => {
  const sequence = sequenceCounts.value.find(item => item.count > 1)
  if (sequence) {
    return {
      title: 'A familiar sequence may be taking shape.',
      body: `Across ${sequence.count} mapped reflections, a similar order appears: ${sequence.label}. This is a recurrence in your own recorded material, not an interpretation of what it means.`,
      count: sequence.count,
      countLabel: 'mapped reflections carry this sequence'
    }
  }

  const position = positionCounts.value.find(item => item.count > 1)
  if (position) {
    return {
      title: `“${position.label}” has appeared more than once.`,
      body: position.context
        ? `Across ${position.count} mapped reflections, you used the same language for this response. Most recently you described it as trying to ${lowercaseFirst(position.context)}.`
        : `Across ${position.count} mapped reflections, you used the same language for this response.`,
      count: position.count,
      countLabel: 'mapped reflections carry this response'
    }
  }

  const theme = themeCounts.value.find(item => item.count > 1)
  if (theme) {
    return {
      title: `“${theme.label}” is recurring.`,
      body: `It appears in ${theme.count} of your recorded reflections.`,
      count: theme.count,
      countLabel: 'reflections carry this theme'
    }
  }

  return null
})

function lowercaseFirst(value) {
  return value ? value.charAt(0).toLocaleLowerCase() + value.slice(1) : value
}

const navigation = [
  { label: 'Reflections', path: '/supervision/reflections', icon: BookOpenText, description: 'Return to what has stayed with you.' },
  { label: 'Map', path: '/supervision/insights', icon: Map, description: 'See recurrence, sequence and change taking shape over time.' },
  { label: 'Growth', path: '/supervision/growth', icon: Sprout, description: 'Stay close to your learning edge and what you want to deepen.' }
]
</script>
