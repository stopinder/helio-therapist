<template>
  <div class="mx-auto max-w-6xl space-y-10 p-4 md:p-10">
    <header class="space-y-5">
      <p class="type-eyebrow text-action-link">Professional development</p>
      <GreetingHeader
        :phrase="phrase"
        :display-name="therapistDisplayName"
        supporting="A private place to reflect, notice recurring patterns in your work, prepare for supervision and carry learning forward."
      />
      <div class="max-w-3xl border-l-2 border-border px-5 py-1 text-sm leading-6 text-ink-secondary">
        <p><strong class="text-ink">Reflective mapping</strong> is an invitation to notice recurring inner positions: what becomes activated, what it may be trying to protect, what it fears, and what helps you return to a steadier clinical stance.</p>
        <p class="mt-2 text-ink-muted">These are observations for your own consideration, not assessments of competence and not part of a client Clinical Record.</p>
      </div>
    </header>

    <section aria-labelledby="pd-flow-heading">
      <div class="mb-5 flex items-end justify-between gap-4">
        <div>
          <p class="type-eyebrow text-ink-muted">The development loop</p>
          <h2 id="pd-flow-heading" class="mt-2 text-2xl font-semibold tracking-[-0.02em] text-ink">Reflect → notice → supervise → develop</h2>
        </div>
      </div>

      <div class="grid overflow-hidden rounded-panel border border-border bg-border md:grid-cols-2 lg:grid-cols-4">
        <router-link
          v-for="(card, index) in destinationCards"
          :key="card.title"
          :to="card.path"
          class="group bg-surface-raised p-6 transition-colors hover:bg-surface-muted"
        >
          <div class="flex items-center justify-between gap-4">
            <span class="text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">0{{ index + 1 }}</span>
            <span class="text-sm text-ink-muted transition-transform group-hover:translate-x-0.5">→</span>
          </div>
          <h3 class="mt-8 text-lg font-semibold text-ink">{{ card.title }}</h3>
          <p class="mt-2 text-sm leading-6 text-ink-secondary">{{ card.description }}</p>
        </router-link>
      </div>
    </section>

    <section class="grid gap-4 lg:grid-cols-3" aria-labelledby="continue-heading">
      <h2 id="continue-heading" class="sr-only">Continue your professional development</h2>

      <article class="surface-card flex min-h-[210px] flex-col justify-between p-6">
        <div>
          <p class="type-eyebrow text-ink-muted">Latest reflection</p>
          <p v-if="lastReflection" class="mt-4 line-clamp-4 text-base leading-7 text-ink">“{{ lastReflection.body }}”</p>
          <p v-else class="mt-4 text-sm text-ink-muted">No reflections yet. Begin with something from your work that feels worth holding onto.</p>
        </div>
        <div class="mt-6 flex items-center justify-between border-t border-border-muted pt-4">
          <span class="text-xs text-ink-muted">{{ lastReflectionDate }}</span>
          <button v-if="lastReflection" type="button" class="text-sm font-semibold text-action-link" @click="$emit('open-reflection', lastReflection)">Open reflection</button>
        </div>
      </article>

      <router-link to="/supervision/insights" class="surface-card flex min-h-[210px] flex-col justify-between p-6 hover:bg-surface-muted">
        <div>
          <p class="type-eyebrow text-ink-muted">Practice map</p>
          <p class="mt-4 text-4xl font-semibold text-ink">{{ mappedReflectionCount }}</p>
          <p class="mt-1 text-sm text-ink-muted">reflections contributing to your current picture</p>
        </div>
        <p class="mt-6 border-t border-border-muted pt-4 text-sm text-ink-secondary">Notice recurring themes and inner positions without turning them into fixed labels.</p>
      </router-link>

      <router-link to="/supervision/workspace" class="surface-card flex min-h-[210px] flex-col justify-between p-6 hover:bg-surface-muted">
        <div>
          <p class="type-eyebrow text-ink-muted">Supervision</p>
          <p class="mt-4 text-4xl font-semibold text-ink">{{ packCount }}</p>
          <p class="mt-1 text-sm text-ink-muted">items selected for your next pack</p>
        </div>
        <p class="mt-6 border-t border-border-muted pt-4 text-sm text-ink-secondary">Move observations into a human supervision conversation before deciding what they mean.</p>
      </router-link>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import GreetingHeader from '../../components/ui/GreetingHeader.vue'
import { useGreeting } from '../../composables/useGreeting.js'
import { useTherapistIdentity } from '../../composables/useTherapistIdentity.js'

const props = defineProps({
  reflections: { type: Array, default: () => [] },
  loading: Boolean
})

defineEmits(['open-reflection'])

const { displayName, loadTherapistIdentity } = useTherapistIdentity()
const { phrase, therapistDisplayName } = useGreeting({ displayName })

const destinationCards = [
  {
    title: 'Reflections',
    path: '/supervision/reflections',
    description: 'Return to the therapist-owned reflections that sit outside the client Clinical Record.'
  },
  {
    title: 'Practice Map',
    path: '/supervision/insights',
    description: 'Notice recurring themes, inner positions, triggers and protective intentions across time.'
  },
  {
    title: 'Supervision',
    path: '/supervision/workspace',
    description: 'Curate what deserves a collaborative conversation and prepare it without exposing unnecessary client identity.'
  },
  {
    title: 'Development',
    path: '/supervision/growth',
    description: 'Turn what you are noticing into questions, learning priorities and deliberate follow-through.'
  }
]

const lastReflection = computed(() => props.reflections[0])
const lastReflectionDate = computed(() => {
  if (!lastReflection.value) return ''
  return new Date(lastReflection.value.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
})
const packCount = computed(() => props.reflections.filter(reflection => reflection.included_in_supervision).length)
const mappedReflectionCount = computed(() => props.reflections.filter(reflection => reflection.body || reflection.theme || reflection.workspace_content).length)

onMounted(loadTherapistIdentity)
</script>
