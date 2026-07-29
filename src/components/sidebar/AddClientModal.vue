<template>
  <div
      class="fixed inset-0 bg-backdrop backdrop-blur-sm flex items-center justify-center z-50"
      @click.self="emit('close')"
  >
    <div class="w-full max-w-sm bg-surface-elevated rounded-panel p-6 shadow-overlay">
      <h2 class="text-body-long font-semibold text-ink mb-4">Add Client</h2>

      <div class="space-y-4">
        <div v-if="error" class="p-2 text-caption-sm bg-state-danger/10 text-state-danger rounded-control border border-state-danger/20">
          {{ error }}
        </div>

        <input
            v-model="name"
            type="text"
            placeholder="Client name"
            :disabled="submitting"
            class="w-full border border-border rounded-control px-3 py-2 text-body focus:ring-2 focus:ring-state-selected focus:border-transparent outline-none disabled:opacity-50"
            @keyup.enter="submit"
        />

        <input
            v-model="email"
            type="email"
            placeholder="Email (optional)"
            :disabled="submitting"
            class="w-full border border-border rounded-control px-3 py-2 text-body focus:ring-2 focus:ring-state-selected focus:border-transparent outline-none disabled:opacity-50"
            @keyup.enter="submit"
        />

        <textarea
            v-model="note"
            placeholder="Quick note (optional)"
            :disabled="submitting"
            class="w-full border border-border rounded-control px-3 py-2 text-body focus:ring-2 focus:ring-state-selected focus:border-transparent outline-none disabled:opacity-50 min-h-[80px]"
        ></textarea>
      </div>

      <div class="flex justify-end gap-3 mt-6">
        <button
            class="px-3 py-1.5 text-body-sm rounded-control border border-border hover:bg-surface-subtle transition-colors disabled:opacity-50"
            :disabled="submitting"
            @click="emit('close')"
        >
          Cancel
        </button>

        <button
            class="px-4 py-1.5 text-body-sm rounded-control bg-action-primary text-on-action font-medium hover:bg-action-primary-hover transition-colors disabled:opacity-50 flex items-center gap-2"
            :disabled="submitting || !name.trim()"
            @click="submit"
        >
          <span v-if="submitting" class="w-3 h-3 border-2 border-on-action/30 border-t-on-action rounded-full animate-spin"></span>
          {{ submitting ? 'Adding...' : 'Add' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";

defineProps({
  submitting: {
    type: Boolean,
    default: false
  },
  error: {
    type: String,
    default: ""
  }
});

const emit = defineEmits(["close", "submit"]);

const name = ref("");
const email = ref("");
const note = ref("");

const submit = () => {
  if (!name.value.trim()) return;
  emit("submit", {
    name: name.value.trim(),
    email: email.value.trim(),
    note: note.value.trim(),
  });
};
</script>
