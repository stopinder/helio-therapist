<template>
  <div class="p-4 md:p-10 max-w-6xl mx-auto space-y-8 md:space-y-12 animate-fadeUp">
    <header class="animate-fadeUp">
      <h1 class="type-section-title text-ink">Professional Development</h1>
    </header>

    <!-- Greeting -->
    <GreetingHeader :phrase="phrase" :display-name="therapistDisplayName" supporting="Welcome to your reflective practice hub." />

    <!-- Destination Cards -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <router-link 
        v-for="card in destinationCards" 
        :key="card.title"
        :to="card.path"
        class="group bg-surface-elevated p-8 rounded-[2rem] border border-border-muted shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-standard flex flex-col justify-between min-h-[220px]"
      >
        <div class="text-4xl mb-4">{{ card.icon }}</div>
        <div>
          <h3 class="text-h4 font-semibold text-ink group-hover:text-ink-secondary transition-colors">{{ card.title }}</h3>
          <p class="text-caption text-ink-muted mt-2">{{ card.description }}</p>
        </div>
      </router-link>
    </div>

    <!-- Continue Section -->
    <section class="space-y-6">
      <h2 class="text-overline font-bold text-ink-muted uppercase tracking-[0.2em]">Continue</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
        <!-- Last Reflection -->
        <div class="bg-surface-elevated p-8 rounded-[2rem] border border-border-muted shadow-sm flex flex-col justify-between">
          <div>
            <div class="text-overline text-ink-secondary font-bold mb-4 uppercase tracking-wider">Last Reflection</div>
            <p v-if="lastReflection" class="text-body font-medium text-ink line-clamp-3 italic font-fraunces">
              "{{ lastReflection.body }}"
            </p>
            <p v-else class="text-body text-ink-muted italic">No reflections yet.</p>
          </div>
          <div class="mt-6 pt-4 border-t border-border-muted flex justify-between items-center">
            <span class="text-overline text-ink-muted">{{ lastReflectionDate }}</span>
            <button v-if="lastReflection" @click="$emit('open-reflection', lastReflection)" class="text-caption font-semibold text-ink hover:text-ink-secondary transition-colors">View details</button>
          </div>
        </div>

        <!-- Supervision Progress -->
        <div class="bg-surface-elevated p-8 rounded-[2rem] border border-border-muted shadow-sm">
          <div class="text-overline text-ink-secondary font-bold mb-4 uppercase tracking-wider">Supervision Progress</div>
          <div class="flex items-end gap-2 mb-2">
            <span class="text-5xl font-semibold text-ink">{{ packCount }}</span>
            <span class="text-h3 text-ink-muted pb-1">items</span>
          </div>
          <p class="text-caption text-ink-muted">Selected for your next supervision pack.</p>
          <div class="mt-8 h-2 w-full bg-surface-subtle rounded-full overflow-hidden border border-border-muted">
            <div 
              class="h-full bg-ink-muted transition-all duration-1000" 
              :style="{ width: Math.min(100, (packCount / 5) * 100) + '%' }"
            ></div>
          </div>
        </div>

        <!-- Latest Theme -->
        <div class="bg-surface-elevated p-8 rounded-[2rem] border border-border-muted shadow-sm">
          <div class="text-overline text-ink-secondary font-bold mb-4 uppercase tracking-wider">Latest Theme</div>
          <div v-if="latestTheme" class="space-y-4">
            <div class="inline-block px-4 py-2 bg-surface-subtle text-ink font-semibold rounded-pill border border-border-muted">
              {{ latestTheme }}
            </div>
            <p class="text-caption text-ink-muted">This theme has appeared in {{ latestThemeCount }} recent reflections.</p>
          </div>
          <p v-else class="text-body text-ink-muted italic">No themes identified yet.</p>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue';
import GreetingHeader from '../../components/ui/GreetingHeader.vue';
import { useGreeting } from '../../composables/useGreeting.js';
import { useTherapistIdentity } from '../../composables/useTherapistIdentity.js';

const props = defineProps({
  reflections: { type: Array, default: () => [] },
  loading: Boolean
});

defineEmits(['open-reflection']);

const { displayName, loadTherapistIdentity } = useTherapistIdentity();
const { phrase, therapistDisplayName } = useGreeting({ displayName });

const destinationCards = [
  { 
    title: 'Review Reflections', 
    path: '/supervision/reflections', 
    icon: '📓',
    description: 'Browse your reflective journal and revisit previous thinking.'
  },
  { 
    title: 'Supervision Workspace', 
    path: '/supervision/workspace', 
    icon: '💼',
    description: 'Curate reflections for your next supervision session.'
  },
  { 
    title: 'Growth & Learning', 
    path: '/supervision/growth', 
    icon: '📈',
    description: 'Identify patterns, strengths and opportunities.'
  },
  { 
    title: 'Insights', 
    path: '/supervision/insights', 
    icon: '✨',
    description: 'Understand trends across your practice.'
  }
];

const lastReflection = computed(() => props.reflections[0]);
const lastReflectionDate = computed(() => {
  if (!lastReflection.value) return '';
  return new Date(lastReflection.value.created_at).toLocaleDateString('en-GB', { 
    day: 'numeric', month: 'long', year: 'numeric' 
  });
});

const packCount = computed(() => props.reflections.filter(r => r.included_in_supervision).length);

const latestTheme = computed(() => props.reflections.find(r => r.theme)?.theme);
const latestThemeCount = computed(() => {
  if (!latestTheme.value) return 0;
  return props.reflections.filter(r => r.theme === latestTheme.value).length;
});

onMounted(loadTherapistIdentity);
</script>

<style scoped>
.font-fraunces {
  font-family: 'Fraunces', serif;
}
</style>
