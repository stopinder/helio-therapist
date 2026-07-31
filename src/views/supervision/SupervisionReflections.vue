<template>
  <div class="p-4 md:p-10 max-w-6xl mx-auto animate-fadeUp">
    <header class="mb-10">
      <div class="flex items-center gap-3">
        <h1 class="text-h2 font-semibold text-ink">Review Reflections</h1>
        <span class="px-2 py-0.5 bg-surface-subtle text-ink-secondary text-overline font-bold uppercase tracking-wider rounded-pill border border-border-muted">
          Workspace
        </span>
      </div>
      <p class="text-body-sm text-ink-muted font-fraunces italic mt-1">
        Browse your reflective journal and revisit previous thinking.
      </p>
    </header>

    <div class="bg-surface-elevated rounded-[2rem] border border-border-muted shadow-sm overflow-hidden min-h-[600px] flex flex-col transition-all duration-slow" :class="{ 'bg-surface-canvas shadow-none border-transparent': isTimelineFocused }">
      <div class="p-6 md:p-8 border-b border-border-muted flex flex-col md:flex-row md:justify-between md:items-center gap-6 bg-surface">
        <div class="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
          <div class="relative w-full md:w-64">
            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted text-sm">🔍</span>
            <input 
              type="text" 
              v-model="searchQuery" 
              placeholder="Search reflections..."
              class="w-full pl-9 pr-4 py-2 bg-surface-subtle border border-border rounded-control text-body-sm focus:ring-2 focus:ring-state-selected/20 focus:border-state-selected outline-none transition-all"
            />
          </div>
          
          <div class="relative w-full md:w-48">
            <select 
              v-model="selectedTheme"
              class="w-full px-3 py-2 bg-surface-subtle border border-border rounded-control text-body-sm focus:ring-2 focus:ring-state-selected/20 focus:border-state-selected outline-none appearance-none cursor-pointer"
            >
              <option v-for="theme in themes" :key="theme.name" :value="theme.name">
                {{ theme.name }} ({{ theme.count }})
              </option>
            </select>
            <span class="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-ink-muted text-xs">▼</span>
          </div>
        </div>

        <button 
          v-if="searchQuery || selectedTheme !== 'All'"
          @click="clearFilters"
          class="text-caption font-semibold text-action-link hover:underline"
        >
          Clear filters
        </button>
      </div>

      <div class="flex-1 p-0 sm:p-4 md:p-8">
        <div v-if="loading && reflections.length === 0" class="py-20 text-center">
          <span class="inline-block w-8 h-8 border-4 border-state-selected border-t-transparent rounded-full animate-spin"></span>
          <p class="mt-4 text-ink-muted italic">Gathering your thoughts…</p>
        </div>

        <div v-else class="max-w-5xl mx-auto px-4 py-8">
          <ProfessionalDevelopmentTimeline
            :reflections="filteredReflections"
            :menu-open-for="menuOpenFor"
            :has-more="false"
            @open-reflection="r => $emit('open-reflection', r)"
            @go-to-session="r => $emit('go-to-session', r)"
            @toggle-menu="toggleMenu"
            @close-menu="menuOpenFor = null"
            @toggle-supervision="r => $emit('toggle-supervision', r)"
            @load-more="() => {}"
            @focus-change="v => isTimelineFocused = v"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import ProfessionalDevelopmentTimeline from '../../components/professional-development/ProfessionalDevelopmentTimeline.vue';

const props = defineProps({
  reflections: { type: Array, default: () => [] },
  loading: Boolean,
  actionLoading: [String, Number],
  themes: { type: Array, default: () => [] }
});

defineEmits(['open-reflection', 'go-to-session', 'toggle-supervision']);

const searchQuery = ref('');
const selectedTheme = ref('All');
const menuOpenFor = ref(null);
const isTimelineFocused = ref(false);

const filteredReflections = computed(() => {
  return props.reflections.filter(r => {
    const matchesTheme = selectedTheme.value === 'All' || 
                         (selectedTheme.value === 'No theme' ? !r.theme : r.theme === selectedTheme.value);
    
    const query = searchQuery.value.toLowerCase().trim();
    const matchesSearch = !query || 
                          (r.body && r.body.toLowerCase().includes(query)) ||
                          (r.theme && r.theme.toLowerCase().includes(query)) ||
                          (r.clients?.display_name && r.clients.display_name.toLowerCase().includes(query)) ||
                          (r.session_ref && r.session_ref.toLowerCase().includes(query));
                          
    return matchesTheme && matchesSearch;
  });
});

function toggleMenu(id, event) {
  if (event) event.stopPropagation();
  menuOpenFor.value = menuOpenFor.value === id ? null : id;
}

function clearFilters() {
  searchQuery.value = '';
  selectedTheme.value = 'All';
}
</script>
