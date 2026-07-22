<template>
  <div
      class="fixed inset-0 bg-backdrop backdrop-blur-sm flex items-center justify-center z-50"
      @click.self="emit('close')"
  >
    <div class="w-full max-w-sm bg-surface-elevated rounded-panel p-6 shadow-overlay">
      <h2 class="text-body-long font-semibold text-ink mb-3">
        Archive Client
      </h2>

      <p class="text-body text-ink-secondary leading-relaxed">
        This will remove the client from your active list, but all notes and
        history will be preserved. You can restore them anytime.
      </p>

      <div class="flex justify-end gap-3 mt-6">
        <button
            class="px-3 py-1.5 text-body-sm rounded-control border border-border"
            @click="emit('close')"
        >
          Cancel
        </button>

        <button
            class="px-4 py-1.5 text-body-sm rounded-control bg-state-danger text-on-action font-medium"
            @click="emit('confirm')"
        >
          Archive
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
const emit = defineEmits(["close", "confirm"]);
</script>
