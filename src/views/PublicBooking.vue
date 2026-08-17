<template>
  <main class="min-h-screen bg-surface-canvas text-ink flex items-center justify-center px-4 py-10 sm:px-6">
    <section class="w-full max-w-lg rounded-panel border border-border-muted bg-surface-elevated p-6 sm:p-8" data-testid="public-booking-page">
      <header class="border-b border-border-muted pb-5"><p class="type-overline text-ink-muted">Helios</p><h1 class="type-h1 mt-1">Book your appointment</h1></header>
      <div v-if="loading" class="py-8" role="status"><p class="type-body text-ink-secondary">Checking your secure booking link…</p></div>
      <div v-else-if="state === 'available'" class="pt-6">
        <p class="type-body text-ink-secondary">Your therapist has sent you a secure link to arrange your next appointment.</p>
        <div v-if="therapistLabel" class="mt-6 rounded-xl border border-border bg-surface-subtle p-4"><p class="type-body-sm text-ink-muted">Appointment with</p><p class="type-h3 mt-1">{{ therapistLabel }}</p><p v-if="therapist.professionalTitle" class="type-body-sm text-ink-secondary mt-1">{{ therapist.professionalTitle }}</p></div>
        <a :href="bookingUrl" class="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-control bg-action-primary px-5 py-3 type-body font-semibold text-on-action hover:bg-action-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-state-focus-ring" rel="noopener">Choose a time</a>
        <p class="type-caption text-ink-muted mt-4 text-center">This secure link expires {{ expiryLabel }}.</p>
      </div>
      <div v-else class="pt-6" role="status"><h2 class="type-h3">This booking link is no longer available</h2><p class="type-body text-ink-secondary mt-2">{{ unavailableMessage }}</p></div>
      <footer class="mt-8 border-t border-border-muted pt-4 text-center"><p class="type-caption text-ink-muted">Secure booking powered by Helios</p></footer>
    </section>
  </main>
</template>
<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
const route = useRoute(); const loading = ref(true); const state = ref('invalid'); const bookingUrl = ref(''); const expiresAt = ref(''); const therapist = ref({ name: '', practiceName: '', professionalTitle: '' })
const therapistLabel = computed(() => therapist.value.practiceName || therapist.value.name)
const expiryLabel = computed(() => expiresAt.value ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(expiresAt.value)) : 'soon')
const unavailableMessage = computed(() => state.value === 'expired' ? 'It has expired. Please contact your therapist for a new booking link.' : state.value === 'used' ? 'It has already been used. Please contact your therapist if you need to arrange another appointment.' : 'Please contact your therapist for a new booking link.')
onMounted(async () => { try { const response = await fetch(`/api/booking/${encodeURIComponent(String(route.params.token || ''))}`); const payload = await response.json().catch(() => ({})); state.value = payload.state || 'invalid'; if (response.ok && state.value === 'available') { bookingUrl.value = payload.bookingUrl || ''; expiresAt.value = payload.expiresAt || ''; therapist.value = payload.therapist || therapist.value } } catch { state.value = 'unavailable' } finally { loading.value = false } })
</script>
