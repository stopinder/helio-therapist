<template>
  <div class="p-4 md:p-10 max-w-6xl mx-auto space-y-12 md:space-y-16 pb-24">
    <header class="animate-fadeUp">
      <div class="flex items-center gap-3">
        <h1 class="text-h2 font-semibold text-ink">Insights</h1>
        <span class="px-2 py-0.5 bg-surface-subtle text-ink-secondary text-overline font-bold uppercase tracking-wider rounded-pill border border-border-muted">
          Workspace
        </span>
      </div>
    </header>

    <!-- Editorial Prompt -->
    <section class="max-w-3xl animate-fadeUp" style="animation-delay: 0.1s">
      <h2 class="text-3xl md:text-h1 font-fraunces italic text-ink leading-tight mb-4">
        What feels most consistent across your recent reflections?
      </h2>
      <p class="text-body text-ink-muted">
        Notice recurring patterns across your reflective practice.
      </p>
    </section>

    <!-- Reflection Activity & Recurring Themes -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-12">
      <!-- Reflection Activity -->
      <section class="space-y-6 animate-fadeUp" style="animation-delay: 0.2s">
        <h3 class="text-overline font-bold text-ink-muted uppercase tracking-widest">Reflection Activity</h3>
        <div class="bg-surface-elevated p-8 rounded-[2rem] border border-border-muted shadow-sm space-y-8">
          <div class="grid grid-cols-2 gap-8">
            <div>
              <div class="text-caption text-ink-subtle mb-1">Recent reflections</div>
              <div class="text-4xl font-semibold text-ink">{{ activity.recentCount }}</div>
            </div>
            <div>
              <div class="text-caption text-ink-subtle mb-1">Reflection frequency</div>
              <div class="text-4xl font-semibold text-ink">{{ activity.frequency }}</div>
            </div>
          </div>
          
          <div class="pt-6 border-t border-border-muted/50">
            <div class="text-caption text-ink-subtle mb-3">Most active themes</div>
            <div class="flex flex-wrap gap-2">
              <span 
                v-for="theme in activity.activeThemes" 
                :key="theme"
                class="px-3 py-1 bg-surface-subtle text-ink-secondary text-xs font-medium rounded-full border border-border-muted"
              >
                {{ theme }}
              </span>
              <span v-if="activity.activeThemes.length === 0" class="text-caption italic text-ink-subtle">
                No themes identified yet.
              </span>
            </div>
          </div>
          
          <p class="text-caption text-ink-muted italic leading-relaxed">
            Your reflective rhythm appears {{ activity.rhythm }}.
          </p>
        </div>
      </section>

      <!-- Recurring Themes -->
      <section class="space-y-6 animate-fadeUp" style="animation-delay: 0.3s">
        <h3 class="text-overline font-bold text-ink-muted uppercase tracking-widest">Recurring Themes</h3>
        <div class="space-y-4">
          <div 
            v-for="group in themeGroups" 
            :key="group.title"
            class="bg-surface-elevated p-6 rounded-2xl border border-border-muted shadow-sm"
          >
            <h4 class="text-caption font-bold text-ink mb-2">{{ group.title }}</h4>
            <div class="flex flex-wrap gap-2">
              <span 
                v-for="theme in group.themes" 
                :key="theme.name"
                class="text-xs bg-surface-subtle px-2 py-0.5 rounded-full text-ink-muted font-medium border border-border-muted"
              >
                {{ theme.name }}
              </span>
            </div>
            <p class="text-xs text-ink-subtle mt-3 italic">
              {{ group.description }}
            </p>
          </div>
          
          <div v-if="themeGroups.length === 0" class="bg-surface-subtle/50 p-10 rounded-3xl border border-dashed border-border-muted flex flex-col items-center text-center">
            <p class="text-body-sm text-ink-muted font-fraunces italic">
              Themes will appear here as you develop your practice.
            </p>
          </div>
        </div>
      </section>
    </div>

    <!-- Questions Worth Exploring -->
    <section class="space-y-6 animate-fadeUp" style="animation-delay: 0.4s">
      <h3 class="text-overline font-bold text-ink-muted uppercase tracking-widest">Questions Worth Exploring</h3>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div 
          v-for="question in reflectiveQuestions" 
          :key="question"
          class="bg-surface-elevated p-8 rounded-[2rem] border border-border-muted shadow-sm flex flex-col justify-center min-h-[160px]"
        >
          <p class="text-body font-fraunces italic text-ink text-center leading-relaxed">
            "{{ question }}"
          </p>
        </div>
      </div>
    </section>

    <!-- Reflective Balance -->
    <section class="space-y-6 animate-fadeUp" style="animation-delay: 0.5s">
      <h3 class="text-overline font-bold text-ink-muted uppercase tracking-widest">Reflective Balance</h3>
      <div class="bg-surface-subtle p-10 rounded-[2.5rem] border border-border-muted">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
          <div v-for="item in balancePrompts" :key="item.label" class="space-y-3">
            <div class="text-caption font-bold text-ink uppercase tracking-tighter">{{ item.label }}</div>
            <p class="text-xs text-ink-muted leading-relaxed">
              {{ item.prompt }}
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- Suggested Next Reflection -->
    <section class="space-y-6 animate-fadeUp" style="animation-delay: 0.6s">
      <h3 class="text-overline font-bold text-ink-muted uppercase tracking-widest">Suggested Next Reflection</h3>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div 
          v-for="suggestion in nextReflections" 
          :key="suggestion.title"
          class="bg-surface-elevated p-6 rounded-2xl border border-border shadow-sm hover:border-ink-muted transition-colors cursor-default"
        >
          <div class="text-2xl mb-3">{{ suggestion.icon }}</div>
          <h4 class="text-caption font-bold text-ink mb-1">{{ suggestion.title }}</h4>
          <p class="text-xs text-ink-muted leading-snug">
            {{ suggestion.description }}
          </p>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  reflections: { type: Array, default: () => [] },
  loading: Boolean,
  themes: { type: Array, default: () => [] }
});

const activity = computed(() => {
  const count = props.reflections.length;
  const recentCount = props.reflections.filter(r => {
    const date = new Date(r.created_at);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return date > thirtyDaysAgo;
  }).length;

  const themeCounts = {};
  props.reflections.forEach(r => {
    if (r.theme) themeCounts[r.theme] = (themeCounts[r.theme] || 0) + 1;
  });

  const activeThemes = Object.entries(themeCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name]) => name);

  let frequency = 'Occasional';
  let rhythm = 'steady and deliberate';
  
  if (recentCount > 8) {
    frequency = 'High';
    rhythm = 'vibrant and frequent';
  } else if (recentCount > 4) {
    frequency = 'Regular';
    rhythm = 'consistent and balanced';
  } else if (recentCount === 0) {
    frequency = 'None';
    rhythm = 'ready for a new entry';
  }

  return {
    recentCount,
    frequency,
    activeThemes,
    rhythm
  };
});

const themeGroups = computed(() => {
  const filtered = props.themes.filter(t => t.name !== 'All' && t.name !== 'No theme');
  if (filtered.length === 0) return [];

  const sorted = [...filtered].sort((a, b) => b.count - a.count);
  const groups = [];

  if (sorted.length > 0) {
    groups.push({
      title: 'Appearing consistently',
      themes: sorted.slice(0, 2),
      description: 'These themes continue to anchor your reflective practice.'
    });
  }

  if (sorted.length > 2) {
    groups.push({
      title: 'Newly emerging',
      themes: sorted.slice(2, 4),
      description: 'New patterns are beginning to surface in recent work.'
    });
  }

  if (sorted.length > 4) {
    groups.push({
      title: 'Appearing less frequently',
      themes: sorted.slice(4, 7),
      description: 'Themes that may be moving to the background of your attention.'
    });
  }

  return groups;
});

const reflectiveQuestions = computed(() => {
  const base = [
    'What continues to draw your attention across different sessions?',
    'Which situations seem to repeat in your recent reflections?',
    'What might deserve further curiosity in your next piece of work?'
  ];
  
  // Could customise based on top themes if available
  return base;
});

const balancePrompts = [
  { label: 'Clinical Work', prompt: 'How are you noticing the specific technical and relational aspects of your cases?' },
  { label: 'Self-awareness', prompt: 'Where is your own internal world appearing within your reflections?' },
  { label: 'Boundaries', prompt: 'Are you finding space to reflect on the edges and limits of your practice?' },
  { label: 'Development', prompt: 'How is your learning journey being captured in your recent writing?' },
  { label: 'Supervision', prompt: 'Which of these patterns feel ready for a collaborative conversation?' }
];

const nextReflections = computed(() => {
  return [
    { title: 'A meaningful moment', icon: '✨', description: 'Explore a specific moment of connection or insight.' },
    { title: 'An ethical question', icon: '⚖️', description: 'Revisit a boundary or ethical nuance from this week.' },
    { title: 'A therapeutic relationship', icon: '🤝', description: 'Reflect on the quality of a specific relational dynamic.' },
    { title: 'A personal learning point', icon: '🌱', description: 'What did a recent session teach you about yourself?' }
  ];
});
</script>

<style scoped>
.font-fraunces {
  font-family: 'Fraunces', serif;
}
</style>
