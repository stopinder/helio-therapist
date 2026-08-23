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

    <main class="space-y-12 pt-9">
      <nav class="grid border-y border-border-muted md:grid-cols-3" aria-label="Practice destinations">
        <router-link
          v-for="item in navigation"
          :key="item.path"
          :to="item.path"
          class="group flex min-h-[132px] items-start justify-between gap-5 border-b border-border-muted px-5 py-6 transition-colors last:border-b-0 hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-state-selected md:border-b-0 md:border-r md:last:border-r-0"
        >
          <div>
            <h2 class="text-lg font-semibold text-ink">{{ item.label }}</h2>
            <p class="mt-2 max-w-xs text-sm leading-6 text-ink-secondary">{{ item.description }}</p>
          </div>
          <span class="mt-0.5 text-action-link transition-transform group-hover:translate-x-1" aria-hidden="true">→</span>
        </router-link>
      </nav>

      <section aria-labelledby="discovery-heading">
        <article v-if="discovery" class="grid overflow-hidden rounded-panel border border-border bg-surface-raised lg:grid-cols-[minmax(0,1fr)_240px]">
          <div class="p-7 md:p-10">
            <p class="type-eyebrow text-action-link">Discovery</p>
            <h2 id="discovery-heading" class="mt-4 max-w-3xl text-2xl font-semibold tracking-[-0.025em] text-ink md:text-3xl">{{ discovery.title }}</h2>
            <p class="mt-5 max-w-3xl text-base leading-7 text-ink-secondary">{{ discovery.body }}</p>
            <router-link to="/supervision/insights" class="mt-7 inline-flex text-sm font-semibold text-action-link">Open this →</router-link>
          </div>
          <div class="flex items-end border-t border-border-muted bg-surface-muted p-7 lg:border-l lg:border-t-0">
            <div>
              <p class="text-5xl font-semibold tracking-[-0.05em] text-ink">{{ discovery.count }}</p>
              <p class="mt-2 text-sm leading-6 text-ink-muted">{{ discovery.countLabel }}</p>
            </div>
          </div>
        </article>

        <div v-else class="rounded-panel border border-border bg-surface-raised px-7 py-10 md:px-10">
          <p class="type-eyebrow text-ink-muted">Practice map</p>
          <h2 id="discovery-heading" class="mt-3 text-2xl font-semibold text-ink">Your map will take shape as you work.</h2>
          <p class="mt-3 max-w-2xl text-sm leading-6 text-ink-secondary">Reflections and things you choose to map will begin to reveal recurrence and change here.</p>
        </div>
      </section>

      <section v-if="practiceThreads.length" aria-labelledby="map-heading">
        <div class="mb-5 flex items-end justify-between gap-4">
          <div>
            <p class="type-eyebrow text-ink-muted">Practice map</p>
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

const practiceThreads = computed(() => {
  const positions = positionCounts.value.filter(item => item.count > 1).slice(0, 2).map(item => ({ ...item, kind: 'Inner position' }))
  const themes = themeCounts.value.filter(item => item.count > 1).slice(0, 2).map(item => ({ ...item, kind: 'Recurring theme', context: '' }))
  return [...positions, ...themes].slice(0, 4)
})

const discovery = computed(() => {
  const position = positionCounts.value.find(item => item.count > 1)
  if (position) {
    return {
      title: `“${position.label}” has appeared more than once.`,
      body: position.context
        ? `Across ${position.count} mapped reflections, you used the same language for this response. Most recently you described it as trying to ${lowercaseFirst(position.context)}.`
        : `Across ${position.count} mapped reflections, you used the same language for this response.`,
      count: position.count,
      countLabel: 'mapped reflections carry this thread'
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
  { label: 'Reflections', description: 'What has stayed with you.', path: '/supervision/reflections' },
  { label: 'Map', description: 'What is recurring or beginning to take shape.', path: '/supervision/insights' },
  { label: 'Growth', description: 'Your learning edge.', path: '/supervision/growth' }
]
</script>
