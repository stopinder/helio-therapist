<template>
  <div>
    <div v-if="reflections.length === 0" class="py-24 text-center bg-surface-reflection border border-border-reflection rounded-panel shadow-sm">
      <div class="max-w-md mx-auto px-8">
        <div class="text-5xl mb-8 opacity-80">✍️</div>
        <h3 class="editorial-heading text-h1 text-ink mb-4">Your Reflective Space</h3>
        <p class="type-body-long text-ink-secondary leading-relaxed italic">
          This is a quiet place for your professional growth. As you record reflections and insights after your sessions, a meaningful timeline of your journey will emerge here.
        </p>
        <div class="mt-10 p-4 bg-white/40 rounded-panel border border-border-reflection/30 inline-block">
          <p class="text-caption text-ink-muted uppercase tracking-widest font-bold">
            Reflections are private to you
          </p>
        </div>
      </div>
    </div>

    <div v-else>
      <div v-if="reflections.length === 0" class="py-16 text-center bg-surface-reflection border border-border-reflection rounded-panel">
        <p class="editorial-heading text-h3 text-ink italic">No reflections found for this search.</p>
        <p class="text-body-sm text-ink-muted mt-2">Try adjusting your filters or search term.</p>
        <button 
          @click="$emit('clear-filters')" 
          class="mt-6 button-secondary"
        >
          View all reflections
        </button>
      </div>

      <div v-else class="space-y-6 sm:space-y-12 mb-20 px-4 sm:px-0">
        <div v-for="group in groupedReflections" :key="group.monthYear" class="group-container transition-opacity duration-slow" :class="{ 'opacity-35': expandedId && !group.items.some(r => r.id === expandedId) }">
          <h3 class="editorial-heading text-h2 text-ink border-b border-border-muted pb-4 sticky top-0 bg-surface-canvas/90 backdrop-blur-sm z-20 py-6 transition-all duration-slow">
            {{ group.monthYear }}
          </h3>
          
          <div class="mt-8 space-y-4 sm:space-y-6">
            <div
              v-for="reflection in group.items"
              :key="reflection.id"
              class="reflection-row relative flex flex-col p-0 bg-surface-elevated border border-border-muted rounded-panel shadow-sm transition-all duration-slow overflow-hidden"
              :class="[
                expandedId === reflection.id ? 'ring-2 ring-state-reflection-focus shadow-elevated scale-105 z-30' : 'hover:border-border-strong z-10',
                expandedId && expandedId !== reflection.id ? 'opacity-35 grayscale-[0.2]' : 'opacity-100'
              ]"
              data-testid="pd-timeline-row"
            >
              <!-- Row Header / Summary View -->
              <div 
                class="p-4 sm:p-6 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4"
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
                        @click.stop="$emit('open-ai-reflection', reflection)"
                        class="w-full text-left px-4 py-2.5 text-body-sm text-ink hover:bg-surface-subtle transition-colors flex items-center gap-3"
                      >
                        <span class="text-base">✨</span>
                        Reflect with AI
                      </button>
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
                enter-from-class="max-h-0 opacity-0 transform translate-y-4"
                enter-to-class="max-h-[2000px] opacity-100 transform translate-y-0"
                leave-from-class="max-h-[2000px] opacity-100 transform translate-y-0"
                leave-to-class="max-h-0 opacity-0 transform translate-y-4"
              >
                <div v-if="expandedId === reflection.id" class="bg-surface-reflection border-t border-border-reflection">
                  <div class="p-8 md:p-14 max-w-4xl mx-auto">
                    <div class="mb-12 flex flex-wrap gap-10 items-start opacity-80">
                      <div class="flex flex-col gap-1.5">
                        <span class="type-overline text-ink-muted">Date</span>
                        <span class="text-body font-medium text-ink-secondary">{{ formatDate(reflection.created_at) }}</span>
                      </div>
                      <div v-if="reflection.theme" class="flex flex-col gap-1.5">
                        <span class="type-overline text-ink-muted">Theme</span>
                        <span class="px-2.5 py-1 bg-white/60 text-caption font-bold text-ink-secondary uppercase rounded-full border border-border-reflection-tag inline-block">
                          {{ reflection.theme }}
                        </span>
                      </div>
                      <div v-if="reflection.clients?.display_name" class="flex flex-col gap-1.5">
                        <span class="type-overline text-ink-muted">Client</span>
                        <span class="text-body font-medium text-ink-secondary flex items-center gap-2">
                          <span class="opacity-60 text-base">👤</span>
                          {{ reflection.clients.display_name }}
                        </span>
                      </div>
                      <div v-if="reflection.session_ref" class="flex flex-col gap-1.5">
                        <span class="type-overline text-ink-muted">Session</span>
                        <button 
                          @click="$emit('go-to-session', reflection)"
                          class="text-body font-medium text-action-link hover:underline text-left flex items-center gap-2"
                        >
                          <span class="opacity-60 text-base">📅</span>
                          View context
                        </button>
                      </div>
                    </div>

                    <div class="editorial-heading text-display text-ink italic leading-relaxed whitespace-pre-wrap max-w-3xl animate-expandIn">
                      {{ reflection.body || 'No content provided for this reflection.' }}
                    </div>

                    <div class="mt-14 pt-10 border-t border-border-reflection/40 flex items-center justify-between">
                      <div class="flex gap-4">
                        <button 
                          @click="$emit('open-reflection', reflection)"
                          class="button-secondary bg-white/60 border-border-reflection hover:bg-white hover:border-border-strong"
                        >
                          Open Details
                        </button>
                      </div>
                      <button 
                        @click="toggleExpand(reflection.id)"
                        class="group/btn flex items-center gap-2 px-6 py-2.5 text-body-sm font-semibold text-ink-muted hover:text-ink transition-all"
                      >
                        <span class="transition-transform group-hover/btn:-translate-y-0.5">↑</span>
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
  'open-ai-reflection',
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
