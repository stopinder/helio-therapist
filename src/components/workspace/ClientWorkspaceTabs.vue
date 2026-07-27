<template>
  <div class="bg-surface border-b border-border-muted px-inline-lg overflow-x-auto no-scrollbar">
    <nav class="flex gap-inline-lg" aria-label="Workspace tabs">
      <button
        v-for="tab in tabs"
        :key="tab"
        @click="$emit('update:activeTab', tab)"
        class="relative py-stack-md text-body-sm font-medium transition-colors whitespace-nowrap"
        :class="activeTab === tab ? 'text-action-link' : 'text-ink-secondary hover:text-ink'"
      >
        {{ tab }}
        <div
          v-if="activeTab === tab"
          class="absolute bottom-0 left-0 right-0 h-0.5 bg-action-link rounded-t-pill"
        ></div>
      </button>
    </nav>
  </div>
</template>

<script setup>
defineProps({
  tabs: {
    type: Array,
    required: true
  },
  activeTab: {
    type: String,
    required: true
  }
});

defineEmits(['update:activeTab']);
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
