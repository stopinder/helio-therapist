<template>
  <div>
    <div v-if="reflections.length === 0" class="py-20 text-center bg-surface-subtle border border-border-muted rounded-[2rem] shadow-sm">
      <div class="max-w-md mx-auto px-6">
        <div class="text-4xl mb-6">✍️</div>
        <h3 class="editorial-heading text-h2 text-ink mb-3">Your Reflective Space</h3>
        <p class="text-body text-ink-muted leading-relaxed italic">
          Every session is an opportunity for growth. When you're ready, your private reflections and clinical insights will gather here, creating a timeline of your professional journey.
        </p>
        <p class="text-caption text-ink-subtle mt-6 uppercase tracking-widest font-bold">
          Start by adding a reflection to any active session.
        </p>
      </div>
    </div>

    <div v-else>
      <div v-if="reflections.length === 0" class="py-16 text-center bg-surface-subtle border border-border-muted rounded-[2rem]">
        <p class="editorial-heading text-h3 text-ink italic">No reflections found for this search.</p>
        <button 
          @click="$emit('clear-filters')" 
          class="mt-4 text-body-sm text-action-link font-semibold hover:underline"
        >
          View all reflections
        </button>
      </div>

      <div v-else class="space-y-16">
        <div v-for="group in groupedReflections" :key="group.monthYear" class="space-y-8">
          <h3 class="editorial-heading text-h2 text-ink border-b border-border-muted pb-4 sticky top-0 bg-surface-canvas/90 backdrop-blur-sm z-10 py-4 transition-opacity duration-standard" :class="{ 'opacity-40': expandedId && !group.items.some(r => r.id === expandedId) }">
            {{ group.monthYear }}
          </h3>
          
          <div class="space-y-6">
            <div
              v-for="reflection in group.items"
              :key="reflection.id"
              class="group relative flex flex-col p-0 bg-surface-elevated border border-border-muted rounded-[1.5rem] shadow-sm transition-all duration-slow overflow-hidden"
              :class="[
                expandedId === reflection.id ? 'ring-2 ring-state-selected shadow-elevated scale-[1.01] z-20' : 'hover:border-border-strong z-10',
                expandedId && expandedId !== reflection.id ? 'opacity-35 grayscale-[0.2]' : 'opacity-100'
              ]"
              data-testid="pd-timeline-row"
            >
              <!-- Row Header / Summary View -->
              <div 
                class="p-6 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                @click="toggleExpand(reflection.id)"
                @keydown.enter.prevent="toggleExpand(reflection.id)"
                @keydown.space.prevent="toggleExpand(reflection.id)"
                tabindex="0"
              >
                <div class="flex-1 min-w-0">
                  <div class="flex flex-wrap items-center gap-3 mb-3">
                    <span class="type-overline text-ink-subtle">
                      {{ formatDate(reflection.created_at) }}
                    </span>
                    <span class="px-2 py-0.5 bg-surface-subtle text-caption font-bold text-ink-muted uppercase rounded border border-border">
                      Reflection
                    </span>
                    <span v-if="reflection.included_in_supervision" class="inline-flex items-center px-2 py-0.5 bg-state-success-surface text-caption font-bold text-state-success uppercase rounded border border-state-success/20">
                      Supervision Pack
                    </span>
                  </div>

                  <div class="flex items-center gap-6">
                    <div v-if="reflection.clients?.display_name" class="flex items-center gap-2 text-body font-semibold text-ink">
                      <span class="text-lg">👤</span>
                      {{ reflection.clients.display_name }}
                    </div>
                    <div v-if="reflection.theme" class="flex items-center gap-2">
                      <span class="px-2 py-0.5 bg-surface-subtle text-caption font-bold text-ink-secondary uppercase rounded-full border border-border">
                        {{ reflection.theme }}
                      </span>
                    </div>
                  </div>
                </div>

                <div class="flex items-center gap-4 shrink-0">
                  <div class="relative">
                    <button
                      @click.stop="$emit('toggle-menu', reflection.id, $event)"
                      class="p-2 hover:bg-surface-subtle rounded-control transition-colors text-ink-muted"
                      :aria-expanded="menuOpenFor === reflection.id"
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="5" r="1" />
                        <circle cx="12" cy="12" r="1" />
                        <circle cx="12" cy="19" r="1" />
                      </svg>
                    </button>

                    <div 
                      v-if="menuOpenFor === reflection.id" 
                      class="absolute right-0 top-full mt-2 w-64 bg-surface-overlay border border-border rounded-panel shadow-overlay z-30 py-2 animate-in fade-in zoom-in-95 duration-standard"
                      v-click-outside="() => $emit('close-menu')"
                    >
                      <button 
                        @click.stop="$emit('toggle-supervision', reflection)"
                        class="w-full text-left px-4 py-2.5 text-body-sm hover:bg-surface-subtle transition-colors flex items-center gap-3"
                        :class="reflection.included_in_supervision ? 'text-state-danger' : 'text-action-link'"
                      >
                        <span class="text-base">{{ reflection.included_in_supervision ? '✖' : '➕' }}</span>
                        {{ reflection.included_in_supervision ? 'Remove from Pack' : 'Include in Pack' }}
                      </button>
                      <button 
                        v-if="reflection.client_id && reflection.session_ref"
                        @click.stop="$emit('go-to-session', reflection)"
                        class="w-full text-left px-4 py-2.5 text-body-sm text-ink hover:bg-surface-subtle transition-colors flex items-center gap-3"
                      >
                        <span class="text-base">📅</span>
                        Open session
                      </button>
                      <div class="border-t border-border-muted my-1"></div>
                      <button 
                        @click.stop="$emit('open-reflection', reflection)"
                        class="w-full text-left px-4 py-2.5 text-body-sm text-ink hover:bg-surface-subtle transition-colors flex items-center gap-3"
                      >
                        <span class="text-base">📑</span>
                        View Full Detail
                      </button>
                    </div>
                  </div>
                  
                  <div class="text-ink-subtle transition-transform duration-standard" :class="{ 'rotate-180': expandedId === reflection.id }">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </div>
                </div>
              </div>

              <!-- Expanded Content -->
              <transition
                enter-active-class="transition-all duration-slow ease-out"
                leave-active-class="transition-all duration-standard ease-in"
                enter-from-class="max-h-0 opacity-0"
                enter-to-class="max-h-[2000px] opacity-100"
                leave-from-class="max-h-[2000px] opacity-100"
                leave-to-class="max-h-0 opacity-0"
              >
                <div v-if="expandedId === reflection.id" class="bg-surface-subtle border-t border-border-muted">
                  <div class="p-8 md:p-12 max-w-4xl">
                    <div class="mb-10 flex flex-wrap gap-8 items-start">
                      <div class="flex flex-col gap-1">
                        <span class="type-overline text-ink-subtle">Date</span>
                        <span class="text-body font-medium text-ink">{{ formatDate(reflection.created_at) }}</span>
                      </div>
                      <div v-if="reflection.theme" class="flex flex-col gap-1">
                        <span class="type-overline text-ink-subtle">Theme</span>
                        <span class="text-body font-medium text-ink">{{ reflection.theme }}</span>
                      </div>
                      <div v-if="reflection.clients?.display_name" class="flex flex-col gap-1">
                        <span class="type-overline text-ink-subtle">Client</span>
                        <span class="text-body font-medium text-ink">{{ reflection.clients.display_name }}</span>
                      </div>
                      <div v-if="reflection.session_ref" class="flex flex-col gap-1">
                        <span class="type-overline text-ink-subtle">Session</span>
                        <button 
                          @click="$emit('go-to-session', reflection)"
                          class="text-body font-medium text-action-link hover:underline text-left"
                        >
                          View context
                        </button>
                      </div>
                    </div>

                    <div class="editorial-heading text-h2 text-ink italic leading-relaxed whitespace-pre-wrap max-w-3xl">
                      "{{ reflection.body || 'No content provided for this reflection.' }}"
                    </div>

                    <div class="mt-12 pt-8 border-t border-border-muted flex gap-4">
                      <button 
                        @click="$emit('open-reflection', reflection)"
                        class="button-secondary"
                      >
                        Open Details
                      </button>
                      <button 
                        @click="toggleExpand(reflection.id)"
                        class="px-6 py-2 text-body-sm font-semibold text-ink-muted hover:text-ink transition-colors"
                      >
                        Collapse
                      </button>
                    </div>
                  </div>
                </div>
              </transition>
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
import { ref, computed } from 'vue';

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

const emit = defineEmits([
  'open-reflection',
  'go-to-session',
  'toggle-menu',
  'close-menu',
  'toggle-supervision',
  'load-more',
  'clear-filters',
  'focus-change'
]);

const expandedId = ref(null);

function toggleExpand(id) {
  expandedId.value = expandedId.value === id ? null : id;
  emit('focus-change', !!expandedId.value);
}

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
