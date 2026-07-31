<template>
  <div class="p-10 max-w-6xl mx-auto space-y-12">
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      <div 
        v-for="i in 6" 
        :key="i"
        class="bg-surface-elevated p-8 rounded-[2rem] border border-border-muted shadow-sm hover:shadow-md transition-all group"
      >
        <div class="h-12 w-12 bg-surface-subtle rounded-xl mb-6 flex items-center justify-center text-2xl border border-border-muted">
          {{ ['🌱', '🧠', '📚', '🤝', '🎯', '✨'][i-1] }}
        </div>
        <h3 class="text-h3 font-semibold text-ink mb-2 group-hover:text-ink-secondary transition-colors">
          {{ ['Clinical Patterns', 'Self-Care Focus', 'Learning Goals', 'Peer Feedback', 'Skill Development', 'Identity & Values'][i-1] }}
        </h3>
        <p class="text-caption text-ink-muted leading-relaxed">
          {{ [
            'Explore recurring themes and clinical orientations across your practice history.',
            'Track your professional well-being and identify areas for personal support.',
            'Set and monitor progress towards your annual professional development targets.',
            'Synthesize notes and reflections from peer supervision and group workshops.',
            'Identify specific therapeutic techniques you are refining in your current work.',
            'Reflect on how your personal values align with your evolving clinical identity.'
          ][i-1] }}
        </p>
        <div class="mt-8 pt-6 border-t border-border-muted/50 flex items-center text-caption font-semibold text-ink-subtle">
          Coming soon
          <span class="ml-2">→</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
</style>
