<template>
  <div class="mx-auto max-w-6xl space-y-10 p-4 pb-20 md:p-10">
    <header class="max-w-4xl space-y-4">
      <p class="type-eyebrow text-action-link">Professional development</p>
      <h1 class="text-3xl font-semibold tracking-[-0.03em] text-ink md:text-4xl">Development</h1>
      <p class="max-w-3xl text-base leading-7 text-ink-secondary">Turn repeated observations into deliberate learning without asking Helios to decide what kind of therapist you are.</p>
    </header>

    <section class="grid gap-8 lg:grid-cols-[1fr_.9fr]">
      <div>
        <p class="type-eyebrow text-ink-muted">Evidence from your reflections</p>
        <h2 class="mt-2 text-2xl font-semibold text-ink">What has your attention?</h2>
        <p class="mt-2 text-sm leading-6 text-ink-secondary">These are counts, not interpretations. A frequent theme may be a strength, a challenge, a feature of your caseload, or something else entirely.</p>
        <div v-if="topThemes.length" class="mt-5 overflow-hidden rounded-panel border border-border">
          <div v-for="theme in topThemes" :key="theme.name" class="flex items-center justify-between border-b border-border-muted bg-surface-raised px-5 py-4 last:border-b-0">
            <span class="text-sm font-semibold text-ink">{{ theme.name }}</span>
            <span class="text-sm text-ink-muted">{{ theme.count }} {{ theme.count === 1 ? 'reflection' : 'reflections' }}</span>
          </div>
        </div>
        <p v-else class="mt-5 rounded-panel border border-dashed border-border p-6 text-sm text-ink-muted">No reflection themes have been recorded yet.</p>
      </div>

      <aside class="rounded-panel border border-border bg-surface-muted p-6">
        <p class="type-eyebrow text-ink-muted">From pattern to learning</p>
        <div class="mt-5 space-y-5 text-sm leading-6 text-ink-secondary">
          <p><strong class="text-ink">1. Notice.</strong> What keeps appearing in the work or in you?</p>
          <p><strong class="text-ink">2. Map.</strong> What tends to activate it, and what might the response be trying to protect?</p>
          <p><strong class="text-ink">3. Supervise.</strong> Test your understanding with another human rather than treating a private inference as truth.</p>
          <p><strong class="text-ink">4. Develop.</strong> Choose a small learning priority and notice what changes in practice.</p>
        </div>
        <router-link to="/supervision/workspace" class="mt-6 inline-flex text-sm font-semibold text-action-link">Prepare for supervision →</router-link>
      </aside>
    </section>

    <section class="border-y border-border-muted py-8">
      <div class="grid gap-6 lg:grid-cols-[.75fr_1.25fr]">
        <div>
          <p class="type-eyebrow text-ink-muted">Learning priorities</p>
          <h2 class="mt-2 text-2xl font-semibold text-ink">Make the next step explicit.</h2>
          <p class="mt-2 text-sm leading-6 text-ink-secondary">Persistent goals will be introduced as a proper therapist-owned record. Until that model is implemented, Helios will not pretend temporary browser text is saved CPD.</p>
        </div>
        <div class="space-y-3">
          <div v-for="prompt in learningPrompts" :key="prompt" class="rounded-control border border-border bg-surface-raised px-5 py-4 text-sm leading-6 text-ink-secondary">{{ prompt }}</div>
        </div>
      </div>
    </section>

    <section>
      <div class="mb-5 max-w-3xl">
        <p class="type-eyebrow text-ink-muted">Ways to follow through</p>
        <h2 class="mt-2 text-2xl font-semibold text-ink">Choose the activity after the question.</h2>
        <p class="mt-2 text-sm leading-6 text-ink-secondary">CPD activity should follow a learning need, not be generated as generic personalised advice.</p>
      </div>
      <div class="grid overflow-hidden rounded-panel border border-border bg-border md:grid-cols-2 lg:grid-cols-4">
        <article v-for="route in developmentRoutes" :key="route.title" class="bg-surface-raised p-6">
          <h3 class="text-base font-semibold text-ink">{{ route.title }}</h3>
          <p class="mt-2 text-sm leading-6 text-ink-secondary">{{ route.description }}</p>
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

const learningPrompts = [
  'What would I like to be able to notice earlier in the room?',
  'What inner response would I like to understand rather than suppress?',
  'What do I want to take to supervision before drawing a conclusion?',
  'What small change in my practice would give me useful evidence over the next few sessions?'
]

const developmentRoutes = [
  { title: 'Human supervision', description: 'Bring a pattern, uncertainty or inner response into collaborative scrutiny.' },
  { title: 'Focused reading', description: 'Choose theory or research because it addresses a learning question you have already identified.' },
  { title: 'Skills practice', description: 'Experiment deliberately with a clinical stance or intervention and reflect on what happens.' },
  { title: 'Further reflection', description: 'Stay curious when the pattern is not yet clear enough to turn into a learning objective.' }
]
</script>
