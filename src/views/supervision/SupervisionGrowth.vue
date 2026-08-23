<template>
  <div class="mx-auto max-w-6xl space-y-10 p-4 pb-20 md:p-10">
    <header class="max-w-4xl space-y-4">
      <p class="type-eyebrow text-action-link">Your learning edge</p>
      <h1 class="text-3xl font-semibold tracking-[-0.03em] text-ink md:text-4xl">Growth</h1>
      <p class="max-w-3xl text-base leading-7 text-ink-secondary">A place to stay close to what is changing in your practice — without turning reflection into another task list.</p>
    </header>

    <section v-if="topThemes.length" class="grid gap-8 lg:grid-cols-[1.1fr_.9fr]">
      <div>
        <p class="type-eyebrow text-ink-muted">From your reflections</p>
        <h2 class="mt-2 text-2xl font-semibold text-ink">What keeps drawing your attention?</h2>
        <p class="mt-2 max-w-2xl text-sm leading-6 text-ink-secondary">These are simply recurring themes in material you recorded. Frequency is not a judgement about importance, competence or meaning.</p>
        <div class="mt-5 overflow-hidden rounded-panel border border-border">
          <div v-for="theme in topThemes" :key="theme.name" class="flex items-center justify-between border-b border-border-muted bg-surface-raised px-5 py-4 last:border-b-0">
            <span class="text-sm font-semibold text-ink">{{ theme.name }}</span>
            <span class="text-sm text-ink-muted">{{ theme.count }} {{ theme.count === 1 ? 'reflection' : 'reflections' }}</span>
          </div>
        </div>
      </div>

      <aside class="rounded-panel border border-border bg-surface-muted p-6 md:p-7">
        <p class="type-eyebrow text-ink-muted">Learning edge</p>
        <h2 class="mt-2 text-xl font-semibold text-ink">Stay with what is becoming visible.</h2>
        <p class="mt-3 text-sm leading-6 text-ink-secondary">Growth does not have to begin with a goal. Sometimes the useful movement is simply noticing something earlier, recognising a familiar sequence, or finding a little more choice in how you respond.</p>
        <router-link to="/supervision/insights" class="mt-6 inline-flex text-sm font-semibold text-action-link">Open your map →</router-link>
      </aside>
    </section>

    <section v-else class="rounded-panel border border-border bg-surface-raised p-8 md:p-10">
      <p class="type-eyebrow text-ink-muted">Learning edge</p>
      <h2 class="mt-2 text-2xl font-semibold text-ink">Nothing needs to be decided yet.</h2>
      <p class="mt-3 max-w-2xl text-sm leading-6 text-ink-secondary">As reflections accumulate, Helios can bring back recurring themes and changes that may be worth another look.</p>
    </section>

    <section class="border-t border-border-muted pt-9">
      <div class="max-w-3xl">
        <p class="type-eyebrow text-ink-muted">Ways growth can show up</p>
        <h2 class="mt-2 text-2xl font-semibold text-ink">Small changes in the work matter.</h2>
      </div>
      <div class="mt-6 grid overflow-hidden rounded-panel border border-border bg-border md:grid-cols-3">
        <article v-for="item in growthSignals" :key="item.title" class="bg-surface-raised p-6">
          <h3 class="text-base font-semibold text-ink">{{ item.title }}</h3>
          <p class="mt-2 text-sm leading-6 text-ink-secondary">{{ item.description }}</p>
        </article>
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

const topThemes = computed(() => props.themes
  .filter(theme => theme.name !== 'All' && theme.name !== 'No theme')
  .sort((a, b) => b.count - a.count)
  .slice(0, 6))

const growthSignals = [
  { title: 'Earlier recognition', description: 'You notice activation or a familiar response sooner than you used to.' },
  { title: 'More room to respond', description: 'A familiar sequence still appears, but there is more space before the next move.' },
  { title: 'A different outcome', description: 'The same kind of situation begins to unfold differently when your response changes.' }
]
</script>
