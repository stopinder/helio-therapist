<template>
  <div
      class="fixed inset-0 bg-backdrop backdrop-blur-sm flex items-center justify-center z-50"
      @click.self="emit('close')"
  >
    <div class="w-full max-w-sm bg-surface-elevated rounded-panel p-6 shadow-overlay">
      <h2 class="text-body-long font-semibold text-ink mb-4">Add Client</h2>

      <div class="space-y-4">
        <input
            v-model="name"
            type="text"
            placeholder="Client name"
            class="w-full border border-border rounded-control px-3 py-2 text-body"
        />

        <input
            v-model="email"
            type="email"
            placeholder="Email (optional)"
            class="w-full border border-border rounded-control px-3 py-2 text-body"
        />

        <textarea
            v-model="note"
            placeholder="Quick note (optional)"
            class="w-full border border-border rounded-control px-3 py-2 text-body"
        ></textarea>
      </div>

      <div class="flex justify-end gap-3 mt-6">
        <button
            class="px-3 py-1.5 text-body-sm rounded-control border border-border"
            @click="emit('close')"
        >
          Cancel
        </button>

        <button
            class="px-4 py-1.5 text-body-sm rounded-control bg-action-primary text-on-action font-medium"
            @click="submit"
        >
          Add
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";

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
