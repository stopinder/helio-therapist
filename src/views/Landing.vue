<template>
  <main class="min-h-screen bg-surface-canvas text-ink">
    <header class="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
      <router-link to="/" class="flex items-center gap-2.5" aria-label="Helios home">
        <span class="flex h-9 w-9 items-center justify-center rounded-pill border border-brand-amber/40 brand-accent-surface brand-mark text-xl" aria-hidden="true">☼</span>
        <span class="font-serif text-2xl font-semibold tracking-tight">Helios</span>
      </router-link>
      <nav class="flex items-center gap-2" aria-label="Account access">
        <router-link to="/sign-in" class="button-secondary">Sign in</router-link>
        <router-link to="/get-started" class="button-primary">Get started</router-link>
      </nav>
    </header>

    <section class="mx-auto grid w-full max-w-6xl gap-10 px-5 pb-16 pt-16 sm:px-8 sm:pt-24 lg:grid-cols-[1.15fr_.85fr] lg:items-center lg:gap-16">
      <div class="max-w-2xl">
        <p class="type-eyebrow text-action-link">Therapist workspace</p>
        <h1 class="mt-4 font-serif text-5xl font-semibold leading-[1.04] tracking-[-0.035em] text-ink sm:text-6xl">A calmer place for the work around therapy.</h1>
        <p class="mt-6 max-w-xl text-lg leading-8 text-ink-secondary">Helios brings scheduling, session preparation, therapist notes, clinical records and professional reflection into one focused workspace.</p>
        <div class="mt-8 flex flex-wrap gap-3">
          <router-link to="/get-started" class="button-primary">Get started</router-link>
          <router-link to="/sign-in" class="button-secondary">Sign in</router-link>
        </div>
      </div>

      <aside class="surface-card p-6 sm:p-8" aria-label="How Helios supports clinical work">
        <p class="type-eyebrow text-ink-muted">Designed around therapist control</p>
        <div class="mt-5 space-y-5">
          <section>
            <h2 class="type-subsection text-ink">Clinical records stay deliberate</h2>
            <p class="mt-1 type-body text-ink-secondary">Draft notes remain editable until you explicitly approve a Clinical Record.</p>
          </section>
          <section class="border-t border-border-muted pt-5">
            <h2 class="type-subsection text-ink">AI remains assistive</h2>
            <p class="mt-1 type-body text-ink-secondary">AI and transcript output are suggestions for therapist review, not automatic clinical records.</p>
          </section>
          <section class="border-t border-border-muted pt-5">
            <h2 class="type-subsection text-ink">Your practice stays connected</h2>
            <p class="mt-1 type-body text-ink-secondary">Keep appointments, clients, session work and professional development close without adding clinical complexity.</p>
          </section>
        </div>
      </aside>
    </section>
  </main>
</template>
