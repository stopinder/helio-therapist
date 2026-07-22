<template>
  <transition-colors duration-standard ease-out name="fade">
    <div
        v-if="show"
        class="fixed inset-0 z-50 flex items-center justify-center bg-backdrop"
    >
      <div class="bg-ink border border-border-strong rounded-panel p-6 w-80 shadow-overlay">
        <h2 class="text-h3 font-semibold text-on-action mb-2">{{ title }}</h2>
        <p class="text-body text-ink-muted mb-4">{{ message }}</p>
        <div class="flex justify-end gap-3">
          <button
              class="px-3 py-1.5 text-body text-ink-muted hover:text-on-action"
              @click="$emit('cancel')"
          >
            Cancel
          </button>
          <button
              class="px-3 py-1.5 text-body text-state-danger hover:text-on-action border border-state-danger hover:border-border-strong rounded transition-colors duration-standard ease-out"
              @click="$emit('confirm')"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  </transition-colors duration-standard ease-out>
</template>

<script setup>
defineProps({
  show: Boolean,
  title: String,
  message: String
})
</script>

<style scoped>
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.25s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>
