<template>
  <div class="space-y-stack-lg max-w-4xl mx-auto">
    <div class="bg-surface-elevated border border-border-muted rounded-panel p-6 shadow-sm">
      <div class="flex items-center justify-between mb-8">
        <h3 class="text-h3 font-semibold text-ink">Professional Development</h3>
        <button class="px-inline-md py-stack-xs bg-surface border border-border text-body-sm font-medium text-ink rounded-control hover:bg-surface-subtle transition-colors">
          Add to Supervision Agenda
        </button>
      </div>

      <div class="space-y-8">
        <div v-for="section in placeholderSections" :key="section.title" class="p-6 border border-border rounded-panel bg-surface-subtle">
          <h4 class="text-body-sm font-bold text-ink uppercase tracking-wider mb-3">{{ section.title }}</h4>
          <p class="text-body-sm text-ink-muted italic leading-relaxed">
            {{ section.description }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
const placeholderSections = [
  { 
    title: 'Supervision Questions', 
    description: 'Key questions or dilemmas identified for clinical supervision will appear here.' 
  },
  { 
    title: 'Anonymised Case Themes', 
    description: 'Core clinical themes extracted from session content and therapist reflection.' 
  },
  { 
    title: 'Therapist Reflection Summary', 
    description: 'A curated summary of the therapist\'s internal experience and learning points.' 
  },
  { 
    title: 'Ethical Considerations', 
    description: 'Identification of any ethical or boundary considerations requiring supervision input.' 
  },
  { 
    title: 'Action Points', 
    description: 'Planned follow-up actions and clinical development goals.' 
  }
];
</script>
