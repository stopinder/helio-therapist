<template>
  <div class="session-summary-document surface-panel !border-none !bg-surface-raised/50 p-6 sm:p-12 shadow-sm">
    <div class="max-w-[65ch] mx-auto">
      <!-- Title Area -->
      <header class="mb-12 border-b border-border-muted pb-8">
        <h1 class="font-serif text-h1 text-ink mb-2">Session Summary</h1>
        <div class="flex flex-wrap gap-x-6 gap-y-2 text-body-sm text-ink-muted">
          <div class="flex items-center gap-1.5">
            <User class="workspace-icon-sm" />
            <span>{{ clientName }}</span>
          </div>
          <div class="flex items-center gap-1.5">
            <Calendar class="workspace-icon-sm" />
            <span>{{ date }}</span>
          </div>
        </div>
      </header>

      <!-- Content -->
      <div class="document-body space-y-8 text-body-long text-ink-secondary leading-relaxed">
        <template v-for="(block, index) in parsedBlocks" :key="index">
          <h2 v-if="block.type === 'heading'" class="font-serif text-h2 text-ink mt-12 first:mt-0">
            {{ block.content }}
          </h2>
          <p v-else class="whitespace-pre-wrap">
            {{ block.content }}
          </p>
        </template>
      </div>

      <div v-if="!parsedBlocks.length" class="py-12 text-center text-ink-subtle italic">
        No content available for this summary.
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { User, Calendar } from '@lucide/vue';

const props = defineProps({
  body: {
    type: String,
    default: ''
  },
  clientName: {
    type: String,
    default: ''
  },
  date: {
    type: String,
    default: ''
  }
});

const parsedBlocks = computed(() => {
  if (!props.body) return [];

  // Split by newlines and try to identify headings
  // Headings are usually short lines that might be all caps or end with a colon, 
  // or just standalone short lines at the start of a section.
  // We'll look for common patterns or just lines that are likely to be headings.
  const lines = props.body.split(/\n+/);
  const blocks = [];
  
  lines.forEach(line => {
    const trimmed = line.trim();
    if (!trimmed) return;

    // Simple heuristic for headings: 
    // - Short (under 60 chars)
    // - Doesn't end with a period
    // - Or ends with a colon
    // - Or is in the list of known common clinical headings
    const isHeading = 
      (trimmed.length < 60 && !trimmed.endsWith('.') && !trimmed.endsWith(',')) ||
      trimmed.endsWith(':') ||
      /^(PRE-SESSION|OBSERVATIONS|THEMES|INTERVENTIONS|PLAN|REFLECTIONS|SUMMARY)$/i.test(trimmed);

    if (isHeading) {
      blocks.push({ type: 'heading', content: trimmed.replace(/:$/, '') });
    } else {
      // If the last block was a paragraph, we might want to append to it if we split by single newlines,
      // but here we split by \n+ so each line is a distinct paragraph or heading.
      blocks.push({ type: 'paragraph', content: trimmed });
    }
  });

  return blocks;
});
</script>

<style scoped>
.document-body {
  font-size: 1.05rem; /* ~16.8px */
  line-height: 1.75;
}

@media (prefers-reduced-motion: no-preference) {
  .session-summary-document {
    animation: fadeUp var(--motion-standard) var(--motion-ease);
  }
}
</style>
