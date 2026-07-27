<template>
  <div class="bg-surface border-b border-border-muted px-inline-lg overflow-x-auto no-scrollbar">
    <nav class="flex gap-inline-lg" aria-label="Workspace tabs">
      <button
        v-for="tab in tabs"
        :key="typeof tab === 'string' ? tab : tab.name"
        @click="$emit('update:activeTab', typeof tab === 'string' ? tab : tab.name)"
        class="group relative py-stack-md flex items-center gap-2 text-body-sm font-medium transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-state-selected rounded-t-control"
        :class="isActive(tab) ? 'text-action-link' : 'text-ink-secondary hover:text-ink'"
      >
        <!-- Icon slot or prop -->
        <span v-if="getTabProp(tab, 'icon')" class="text-lg leading-none">{{ getTabProp(tab, 'icon') }}</span>
        
        <span>{{ typeof tab === 'string' ? tab : tab.name }}</span>

        <!-- Count Badge -->
        <span 
          v-if="getTabProp(tab, 'count')" 
          class="px-1.5 py-0.5 text-caption font-bold rounded-pill bg-surface-muted border border-border-muted text-ink-muted group-hover:text-ink transition-colors"
          :class="{ 'bg-action-link/10 border-action-link/20 text-action-link': isActive(tab) }"
        >
          {{ getTabProp(tab, 'count') }}
        </span>

        <!-- Notification Dot -->
        <span 
          v-if="getTabProp(tab, 'hasNotification')" 
          class="h-1.5 w-1.5 rounded-pill bg-state-danger"
          aria-hidden="true"
        ></span>

        <!-- Unsaved Draft Indicator -->
        <span 
          v-if="getTabProp(tab, 'isDraft')" 
          class="text-caption text-state-warning italic"
        >
          (Draft)
        </span>

        <div
          v-if="isActive(tab)"
          class="absolute bottom-0 left-0 right-0 h-0.5 bg-action-link rounded-t-pill"
        ></div>
      </button>
    </nav>
  </div>
</template>

<script setup>
const props = defineProps({
  tabs: {
    type: Array, // Array of strings or objects { name, icon, count, hasNotification, isDraft }
    required: true
  },
  activeTab: {
    type: String,
    required: true
  }
});

defineEmits(['update:activeTab']);

const isActive = (tab) => {
  const name = typeof tab === 'string' ? tab : tab.name;
  return props.activeTab === name;
};

const getTabProp = (tab, prop) => {
  if (typeof tab === 'string') return null;
  return tab[prop];
};
</script>

<style scoped>
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
