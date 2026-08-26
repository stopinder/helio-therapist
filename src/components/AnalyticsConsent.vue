<template>
  <aside v-if="showBanner" class="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-2xl rounded-panel border border-border bg-surface-elevated p-4 shadow-lg sm:p-5" aria-label="Analytics choice">
    <div class="sm:flex sm:items-center sm:justify-between sm:gap-5">
      <div>
        <h2 class="type-subsection text-ink">Help improve Helios?</h2>
        <p class="mt-1 text-body text-ink-muted">With your permission, Helios uses privacy-conscious analytics on public pages to understand what is useful. Clinical workspace activity is never tracked.</p>
        <router-link to="/cookies" class="mt-2 inline-block text-caption font-medium text-action-link underline underline-offset-2">Cookie information</router-link>
      </div>
      <div class="mt-4 flex shrink-0 gap-2 sm:mt-0">
        <button type="button" class="min-h-11 rounded-control border border-border px-4 text-body font-medium text-ink-secondary" @click="choose(false)">No thanks</button>
        <button type="button" class="min-h-11 rounded-control bg-action-link px-4 text-body font-medium text-on-action" @click="choose(true)">Allow analytics</button>
      </div>
    </div>
  </aside>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { capturePublicPageView, getAnalyticsConsent, isAnalyticsPathAllowed, setAnalyticsConsent } from '../lib/analytics.js'

const route = useRoute()
const consent = ref(null)
const showBanner = computed(() => consent.value === null && isAnalyticsPathAllowed(route.path))

const syncConsent = () => {
  consent.value = getAnalyticsConsent()
}

const choose = (granted) => {
  setAnalyticsConsent(granted)
  consent.value = granted
  if (granted) capturePublicPageView(route)
}

onMounted(() => {
  syncConsent()
  window.addEventListener('helios-analytics-consent', syncConsent)
})

onUnmounted(() => window.removeEventListener('helios-analytics-consent', syncConsent))
</script>
