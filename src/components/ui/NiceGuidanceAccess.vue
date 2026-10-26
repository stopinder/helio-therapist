<template>
  <details class="shrink-0 border-b border-border-muted bg-surface-subtle px-4 py-2" data-nice-guidance-access>
    <summary class="cursor-pointer text-xs font-medium text-accent">NICE guidance - open the official source</summary>
    <div class="mt-2 space-y-2">
      <p id="ask-helios-nice-note" class="text-xs text-ink-secondary">
        Read guidance on NICE. Guideline content is not loaded into Ask Helios, and no AI credit is used.
      </p>
      <a :href="NICE_GUIDANCE_URL" target="_blank" rel="noopener noreferrer" referrerpolicy="no-referrer"
        class="inline-block text-xs font-medium text-accent underline">Open NICE guidance library (new tab)</a>
      <label for="ask-helios-nice-topic" class="block text-xs font-medium text-ink-secondary">Search NICE by topic</label>
      <input id="ask-helios-nice-topic" v-model="topic" type="search" :maxlength="NICE_TOPIC_MAX_LENGTH"
        autocomplete="off" aria-describedby="ask-helios-nice-privacy ask-helios-nice-note"
        placeholder="A topic or guideline number, not client details"
        class="w-full rounded-control border border-border-muted bg-surface px-3 py-2 text-sm text-ink" />
      <p id="ask-helios-nice-privacy" class="text-[11px] text-ink-muted">
        Only this search text is sent to NICE when you open the link. Do not enter names or identifying details.
        Your chat and client records are not included.
      </p>
      <a :href="searchUrl" target="_blank" rel="noopener noreferrer" referrerpolicy="no-referrer"
        class="inline-block rounded-control border border-border-muted px-3 py-2 text-xs font-medium text-accent"
        data-nice-search-link>Search NICE (new tab)</a>
      <p class="text-[11px] text-ink-muted">
        Check the date, current status, population and setting on the original guideline.
        Links do not imply NICE endorsement of Helios.
      </p>
    </div>
  </details>
</template>

<script setup>
import { computed, ref } from 'vue'
import { NICE_GUIDANCE_URL, NICE_TOPIC_MAX_LENGTH, buildNiceSearchUrl } from '../../lib/niceGuidance.js'

// Not prefilled from chat/client context and never persisted.
const topic = ref('')
const searchUrl = computed(() => buildNiceSearchUrl(topic.value))
</script>
