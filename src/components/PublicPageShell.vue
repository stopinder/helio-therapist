<template>
  <main class="min-h-screen bg-surface-canvas text-ink">
    <header class="mx-auto flex w-full max-w-5xl items-center justify-between px-5 py-5 sm:px-8">
      <router-link to="/" class="flex items-center gap-2.5" aria-label="Helios home">
        <span class="flex h-9 w-9 items-center justify-center rounded-pill border border-brand-amber/40 brand-accent-surface brand-mark text-xl" aria-hidden="true">☼</span>
        <span class="font-serif text-2xl font-semibold tracking-tight">Helios</span>
      </router-link>
      <nav class="flex items-center gap-2" aria-label="Account access">
        <router-link to="/sign-in" class="button-secondary">Sign in</router-link>
        <router-link to="/get-started" class="button-primary">Get started</router-link>
      </nav>
    </header>

    <article class="mx-auto w-full max-w-3xl px-5 pb-16 pt-10 sm:px-8 sm:pt-16">
      <p v-if="eyebrow" class="type-eyebrow text-action-link">{{ eyebrow }}</p>
      <h1 class="mt-3 font-serif text-4xl font-semibold tracking-tight sm:text-5xl">{{ title }}</h1>
      <p v-if="summary" class="mt-5 text-lg leading-8 text-ink-secondary">{{ summary }}</p>
      <div class="mt-8 rounded-xl border border-brand-amber/30 bg-brand-amber/10 p-4 text-sm leading-6 text-ink-secondary">
        Testing / beta — this information applies to current Helios use. Helios is still evolving, so these terms and notices may be updated as the service changes.
      </div>
      <div class="mt-10 space-y-9">
        <slot />
      </div>
    </article>

    <footer class="border-t border-border-muted">
      <nav class="mx-auto flex w-full max-w-5xl flex-wrap gap-x-5 gap-y-2 px-5 py-6 text-sm text-ink-secondary sm:px-8" aria-label="Legal and support">
        <router-link to="/terms" class="hover:text-ink">Terms</router-link>
        <router-link to="/privacy" class="hover:text-ink">Privacy</router-link>
        <router-link to="/ai-data" class="hover:text-ink">AI & data</router-link>
        <router-link to="/cookies" class="hover:text-ink">Cookies</router-link>
        <router-link to="/support" class="hover:text-ink">Support</router-link>
      </nav>
    </footer>
  </main>
</template>

<script setup>
defineProps({
  title: { type: String, required: true },
  eyebrow: { type: String, default: '' },
  summary: { type: String, default: '' }
})
</script>
