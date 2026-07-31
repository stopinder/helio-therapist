<template>
  <div class="p-10 max-w-6xl mx-auto space-y-10">
    <div class="bg-surface-elevated rounded-[2rem] border border-border-muted shadow-sm overflow-hidden p-10">
      <div class="space-y-12">
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div class="bg-surface-subtle p-8 rounded-[1.5rem] border border-border-muted shadow-sm">
            <div class="text-overline font-bold text-ink-muted uppercase tracking-wider mb-2">Total Reflections</div>
            <div class="text-5xl font-semibold text-ink">{{ insights.total }}</div>
          </div>
          <div class="bg-surface-subtle p-8 rounded-[1.5rem] border border-border-muted shadow-sm">
            <div class="text-overline font-bold text-ink-muted uppercase tracking-wider mb-2">Supervision Pack</div>
            <div class="text-5xl font-semibold text-action-primary">{{ insights.inSupervision }}</div>
          </div>
          <div class="bg-surface-subtle p-8 rounded-[1.5rem] border border-border-muted shadow-sm">
            <div class="text-overline font-bold text-ink-muted uppercase tracking-wider mb-2">Unthemed</div>
            <div class="text-5xl font-semibold text-ink-subtle">{{ insights.noTheme }}</div>
          </div>
          <div class="bg-surface-subtle p-8 rounded-[1.5rem] border border-border-muted shadow-sm">
            <div class="text-overline font-bold text-ink-muted uppercase tracking-wider mb-2">Top Theme</div>
            <div class="text-h2 font-semibold text-action-link truncate" :title="insights.topTheme">
              {{ insights.topTheme }}
            </div>
          </div>
        </div>

        <div class="text-caption text-ink-muted italic bg-surface-subtle px-6 py-3 rounded-pill border border-border-muted inline-block">
          Based on loaded reflections
        </div>

        <div class="bg-surface border border-border-muted rounded-[1.5rem] overflow-hidden shadow-sm">
          <div class="p-8 border-b border-border-muted bg-surface-subtle">
            <h3 class="text-h3 font-semibold text-ink uppercase tracking-wider">Theme Distribution</h3>
          </div>
          <div class="p-8">
            <div v-if="insights.themeCounts.length === 0" class="text-center py-12 text-ink-subtle italic">
              No themes identified yet.
            </div>
            <div v-else class="space-y-6">
              <div v-for="theme in insights.themeCounts" :key="theme.name" class="space-y-3">
                <div class="flex justify-between text-body font-medium">
                  <span class="text-ink">{{ theme.name }}</span>
                  <span class="text-ink-muted">{{ theme.count }} ({{ Math.round(theme.count / insights.total * 100) }}%)</span>
                </div>
                <div class="w-full bg-surface-subtle h-3 rounded-full overflow-hidden">
                  <div 
                    class="bg-state-selected h-full rounded-full transition-all duration-1000" 
                    :style="{ width: (theme.count / insights.total * 100) + '%' }"
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  reflections: { type: Array, default: () => [] },
  loading: Boolean
});

const insights = computed(() => {
  const total = props.reflections.length;
  if (total === 0) {
    return {
      total: 0,
      inSupervision: 0,
      noTheme: 0,
      topTheme: 'None',
      themeCounts: []
    };
  }

  const inSupervision = props.reflections.filter(r => r.included_in_supervision).length;
  const noTheme = props.reflections.filter(r => !r.theme).length;
  
  const themeCountsMap = {};
  props.reflections.forEach(r => {
    const t = r.theme || 'No theme';
    themeCountsMap[t] = (themeCountsMap[t] || 0) + 1;
  });

  const themeCounts = Object.entries(themeCountsMap)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  const topTheme = themeCounts.find(t => t.name !== 'No theme')?.name || 'No theme';

  return {
    total,
    inSupervision,
    noTheme,
    topTheme,
    themeCounts
  };
});
</script>

<style scoped>
.text-sage-600 { color: #4a6e4a; }
.bg-sage-500 { background-color: #6a8e6a; }
</style>
