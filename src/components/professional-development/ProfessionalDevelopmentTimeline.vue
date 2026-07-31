<template>
  <div>
    <div v-if="reflections.length === 0" class="py-stack-xl text-center bg-surface-elevated border border-border-muted rounded-panel shadow-sm">
      <p class="text-body text-ink-subtle italic">My private reflections will appear here.</p>
      <p class="text-caption text-ink-muted mt-2">Reflections you save in the Session Workspace will appear here.</p>
    </div>

    <div v-else>
      <div v-if="reflections.length === 0" class="py-stack-xl text-center bg-surface-elevated border border-border-muted rounded-panel shadow-sm">
        <p class="text-body text-ink-subtle italic">No reflections match this filter.</p>
        <button 
          @click="$emit('clear-filters')" 
          class="mt-4 text-body-sm text-state-selected font-medium hover:underline"
        >
          Clear filters
        </button>
      </div>

      <div v-else class="space-y-12">
        <div v-for="group in groupedReflections" :key="group.monthYear" class="space-y-4">
          <h3 class="text-h3 font-bold text-ink border-b border-border-muted pb-2 sticky top-0 bg-surface-canvas z-10 py-2">
            {{ group.monthYear }}
          </h3>
          
          <div class="space-y-3">
            <div
              v-for="reflection in group.items"
              :key="reflection.id"
              class="group flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-surface-elevated border border-border-muted rounded-panel shadow-sm hover:border-state-selected/50 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-state-selected/20 focus:border-state-selected"
              @click="$emit('open-reflection', reflection)"
              @keydown.enter.prevent="$emit('open-reflection', reflection)"
              @keydown.space.prevent="$emit('open-reflection', reflection)"
              tabindex="0"
              data-testid="pd-timeline-row"
            >
              <div class="flex-1 min-w-0">
                <div class="flex flex-wrap items-center gap-2 mb-2">
                  <span class="text-caption font-bold text-ink-secondary uppercase tracking-wider">
                    {{ formatDate(reflection.created_at) }}
                  </span>
                  <span class="px-2 py-0.5 bg-surface-subtle text-caption font-bold text-ink-muted uppercase rounded border border-border">
                    Private Reflection
                  </span>
                  <span v-if="reflection.included_in_supervision" class="inline-flex items-center px-2 py-0.5 bg-state-success-surface text-caption font-bold text-state-success uppercase rounded border border-state-success/20">
                    Supervision Pack
                  </span>
                </div>

                <div class="flex items-center gap-4 mb-2">
                  <div v-if="reflection.clients?.display_name" class="flex items-center gap-1.5 text-body-sm text-ink font-semibold">
                    <span class="text-xs">👤</span>
                    {{ reflection.clients.display_name }}
                  </div>
                  <div v-if="reflection.session_ref" class="flex items-center gap-1.5 text-caption text-ink-muted">
                    <span class="text-xs">📅</span>
                    <button 
                      @click.stop="$emit('go-to-session', reflection)"
                      class="text-state-selected hover:underline font-medium"
                    >
                      View session
                    </button>
                  </div>
                </div>

                <p class="text-body-sm text-ink-secondary line-clamp-2 italic leading-relaxed">
                  "{{ reflection.body || 'No content' }}"
                </p>
              </div>

              <div class="flex items-center gap-3 shrink-0">
                <span v-if="reflection.theme" class="px-2 py-1 bg-surface-subtle text-caption font-bold text-ink-secondary uppercase rounded-full border border-border truncate max-w-[120px]">
                  {{ reflection.theme }}
                </span>
                <span v-else class="px-2 py-1 bg-surface-subtle text-caption font-bold text-ink-subtle uppercase rounded-full border border-border">
                  No theme
                </span>

                <div class="relative">
                  <button
                    @click.stop="$emit('toggle-menu', reflection.id, $event)"
                    class="p-2 hover:bg-surface-subtle rounded-control transition-colors text-ink-muted"
                    :aria-expanded="menuOpenFor === reflection.id"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                      <circle cx="12" cy="5" r="1.5" />
                      <circle cx="12" cy="12" r="1.5" />
                      <circle cx="12" cy="19" r="1.5" />
                    </svg>
                  </button>

                  <div 
                    v-if="menuOpenFor === reflection.id" 
                    class="absolute right-0 top-full mt-1 w-56 bg-surface-elevated border border-border rounded-panel shadow-overlay z-20 py-2 animate-in fade-in zoom-in-95 duration-100"
                    v-click-outside="() => $emit('close-menu')"
                  >
                    <button 
                      @click.stop="$emit('toggle-supervision', reflection)"
                      class="w-full text-left px-4 py-2 text-body-sm hover:bg-surface-subtle transition-colors flex items-center gap-2"
                      :class="reflection.included_in_supervision ? 'text-state-danger' : 'text-state-selected'"
                    >
                      <span>{{ reflection.included_in_supervision ? '✖' : '➕' }}</span>
                      {{ reflection.included_in_supervision ? 'Remove from Pack' : 'Include in Pack' }}
                    </button>
                    <button 
                      v-if="reflection.client_id && reflection.session_ref"
                      @click.stop="$emit('go-to-session', reflection)"
                      class="w-full text-left px-4 py-2 text-body-sm text-ink hover:bg-surface-subtle transition-colors flex items-center gap-2"
                    >
                      <span>📅</span>
                      Open session
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div v-if="hasMore" class="pt-8 flex justify-center">
          <button 
            @click="$emit('load-more')" 
            :disabled="loadingMore"
            class="px-8 py-3 bg-surface border border-border rounded-pill text-body-sm font-bold text-ink hover:bg-surface-subtle hover:border-ink/20 transition-all flex items-center gap-3 disabled:opacity-50 shadow-sm"
          >
            <span v-if="loadingMore" class="w-4 h-4 border-2 border-ink-muted border-t-transparent rounded-full animate-spin"></span>
            Load more reflections
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  reflections: {
    type: Array,
    required: true
  },
  menuOpenFor: {
    type: [String, Number, null],
    default: null
  },
  hasMore: {
    type: Boolean,
    default: false
  },
  loadingMore: {
    type: Boolean,
    default: false
  }
});

defineEmits([
  'open-reflection',
  'go-to-session',
  'toggle-menu',
  'close-menu',
  'toggle-supervision',
  'load-more',
  'clear-filters'
]);

const groupedReflections = computed(() => {
  const groups = {};
  props.reflections.forEach(reflection => {
    const date = new Date(reflection.created_at);
    const monthYear = date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
    if (!groups[monthYear]) {
      groups[monthYear] = [];
    }
    groups[monthYear].push(reflection);
  });
  
  return Object.entries(groups).map(([monthYear, items]) => ({
    monthYear,
    items: items.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  })).sort((a, b) => {
    const dateA = new Date(a.items[0].created_at);
    const dateB = new Date(b.items[0].created_at);
    return dateB - dateA;
  });
});

function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

const vClickOutside = {
  mounted(el, binding) {
    el._clickOutside = (event) => {
      if (!(el === event.target || el.contains(event.target))) {
        binding.value(event);
      }
    };
    document.addEventListener('click', el._clickOutside);
  },
  unmounted(el) {
    document.removeEventListener('click', el._clickOutside);
  }
};
</script>
