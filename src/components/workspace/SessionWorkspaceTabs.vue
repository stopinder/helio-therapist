<template>
  <div class="flex border-b border-border-muted bg-surface px-inline-lg overflow-x-auto no-scrollbar">
    <div class="flex min-w-max">
      <button
        v-for="tab in tabs"
        :key="tab"
        @click="$emit('update:activeTab', tab)"
        class="px-inline-md py-stack-md text-body-sm font-medium border-b-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-state-selected"
        :class="activeTab === tab 
          ? 'border-action-link text-action-link' 
          : 'border-transparent text-ink-muted hover:text-ink hover:border-border'"
        :aria-selected="activeTab === tab"
        role="tab"
      >
        {{ tab }}
      </button>
    </div>
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
