<template>
  <main class="min-h-screen bg-surface-canvas text-ink">
    <header class="mx-auto flex w-full max-w-5xl items-center justify-between px-5 py-5 sm:px-8">
      <router-link to="/" class="inline-flex items-center" aria-label="Helios home">
        <img src="/brand/helios-logo.png" alt="Helios" class="h-10 w-auto" />
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
      <div class="mt-10 space-y-9">
        <slot />
      </div>
    </article>

    <footer class="border-t border-border-muted">
      <div class="mx-auto flex w-full max-w-5xl flex-col gap-4 px-5 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <router-link to="/" class="inline-flex w-fit items-center" aria-label="Helios home">
          <img src="/brand/helios-logo.png" alt="Helios" class="h-8 w-auto" />
        </router-link>
        <nav class="flex flex-wrap gap-x-5 gap-y-2 text-sm text-ink-secondary" aria-label="Legal and support">
          <router-link to="/terms" class="hover:text-ink">Terms</router-link>
          <router-link to="/privacy" class="hover:text-ink">Privacy</router-link>
          <router-link to="/ai-data" class="hover:text-ink">AI & data</router-link>
          <router-link to="/cookies" class="hover:text-ink">Cookies</router-link>
          <router-link to="/support" class="hover:text-ink">Support</router-link>
        </nav>
      </div>
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
