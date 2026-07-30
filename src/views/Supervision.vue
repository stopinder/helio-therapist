<template>
  <div class="p-6 md:p-8">
    <div class="max-w-6xl mx-auto space-y-8">
      <header class="max-w-3xl">
        <p class="text-caption font-semibold uppercase tracking-wide text-ink-muted">
          Private therapist workspace
        </p>
        <h1 class="mt-2 text-h1 font-semibold text-ink">Professional Development</h1>
        <p class="mt-3 text-body text-ink-muted leading-relaxed">
          A private space for reflection, learning and continuing professional development.
          Supervision and peer consultation are optional ways to use work you choose to share.
        </p>
      </header>

      <section aria-labelledby="development-areas-heading">
        <div class="flex items-end justify-between gap-4">
          <div>
            <h2 id="development-areas-heading" class="text-h2 font-semibold text-ink">
              Your development areas
            </h2>
            <p class="mt-1 text-body text-ink-muted">
              Each area will be introduced gradually as the underlying workflows are completed.
            </p>
          </div>
        </div>

        <div class="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <article
            v-for="area in developmentAreas"
            :key="area.title"
            class="rounded-card border border-border-muted bg-surface p-5 shadow-card"
          >
            <div class="flex items-start justify-between gap-4">
              <div
                class="h-10 w-10 rounded-control bg-surface-subtle flex items-center justify-center text-lg"
                aria-hidden="true"
              >
                {{ area.icon }}
              </div>
              <span
                class="rounded-pill border border-border-muted bg-surface-subtle px-2.5 py-1 text-caption font-medium text-ink-muted"
              >
                {{ area.status }}
              </span>
            </div>

            <h3 class="mt-4 text-h3 font-semibold text-ink">{{ area.title }}</h3>
            <p class="mt-2 text-body text-ink-muted leading-relaxed">{{ area.description }}</p>
          </article>
        </div>
      </section>

      <section
        class="rounded-card border border-border-muted bg-surface-subtle p-5 md:p-6"
        aria-labelledby="privacy-boundary-heading"
      >
        <div class="flex gap-4">
          <div
            class="h-10 w-10 shrink-0 rounded-control bg-surface flex items-center justify-center"
            aria-hidden="true"
          >
            🔒
          </div>
          <div>
            <h2 id="privacy-boundary-heading" class="text-h3 font-semibold text-ink">
              Your reflections remain private
            </h2>
            <p class="mt-2 text-body text-ink-muted leading-relaxed">
              Professional development material is separate from client notes and the clinical record.
              Nothing is prepared for supervision, consultation or export unless you explicitly choose it.
            </p>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
const developmentAreas = [
  {
    title: 'My Reflections',
    description: 'Review your private reflections in one chronological learning timeline.',
    icon: '🪞',
    status: 'Next step',
  },
  {
    title: 'Reflect with AI',
    description: 'Explore an interaction, ethical tension or possible pattern from different perspectives.',
    icon: '✨',
    status: 'Planned',
  },
  {
    title: 'Learning Themes',
    description: 'Notice recurring themes in your practice while keeping control of how they are described.',
    icon: '🧭',
    status: 'Planned',
  },
  {
    title: 'CPD',
    description: 'Turn useful reflection into concise continuing professional development evidence.',
    icon: '📚',
    status: 'Planned',
  },
  {
    title: 'Share & Export',
    description: 'Prepare selected material for supervision, peer consultation, printing or secure export.',
    icon: '↗️',
    status: 'Planned',
  },
]
</script>
