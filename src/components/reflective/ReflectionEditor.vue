<template>
  <div>
    <!-- Writing space -->
    <div class="mb-4">
      <h3 class="text-h2 font-semibold mb-2 text-ink">
        New Reflection
      </h3>
      <p class="text-body text-ink-secondary mb-4">
        Write freely about what came up for you during or after your sessions.
        This space is private and not linked to client records.
      </p>
    </div>

    <div class="bg-surface-elevated border border-border-muted rounded-control  p-4">
      <textarea
          v-model="text"
          placeholder="Begin reflecting here..."
          class="w-full h-48 border border-border rounded-control p-3 text-body focus:outline-none focus:ring-2 focus:ring-state-focus-ring resize-none"
      ></textarea>

      <div class="flex justify-end mt-3">
        <button
            class="text-body-sm px-4 py-2 rounded-control border border-border bg-action-link text-on-action hover:bg-action-link-hover transition-colors duration-standard ease-out disabled:opacity-50"
            :disabled="!text.trim()"
            @click="save"
        >
          Save Reflection
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";

const text = ref("");
const emit = defineEmits(["save"]);

const save = () => {
  if (!text.value.trim()) return;
  emit("save", text.value);
  text.value = "";
};
</script>
