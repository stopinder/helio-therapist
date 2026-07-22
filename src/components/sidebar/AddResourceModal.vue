<template>
  <div class="fixed inset-0 bg-backdrop flex items-center justify-center z-50">
    <div class="bg-surface-elevated rounded-control shadow-overlay p-5 w-[90%] max-w-sm">
      <h2 class="text-h3 font-semibold mb-4 text-ink">Add Resource</h2>

      <form @submit.prevent="submit">
        <label class="block text-body text-ink-secondary mb-1">Title</label>
        <input
            v-model="form.title"
            type="text"
            class="w-full mb-3 border border-border rounded-control p-2"
            placeholder="Resource title"
        />

        <label class="block text-body text-ink-secondary mb-1">Type</label>
        <select
            v-model="form.type"
            class="w-full mb-3 border border-border rounded-control p-2"
        >
          <option value="audio">Audio</option>
          <option value="pdf">PDF</option>
          <option value="video">Video</option>
          <option value="link">Link</option>
        </select>

        <label class="block text-body text-ink-secondary mb-1">URL (optional)</label>
        <input
            v-model="form.url"
            type="text"
            class="w-full mb-4 border border-border rounded-control p-2"
            placeholder="https://..."
        />

        <div class="flex justify-end gap-2">
          <button
              type="button"
              class="px-3 py-1.5 rounded-control border border-border"
              @click="$emit('close')"
          >
            Cancel
          </button>
          <button
              type="submit"
              class="px-3 py-1.5 rounded-control bg-action-primary text-on-action hover:bg-action-primary-hover"
          >
            Save
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";

const emit = defineEmits(["close", "submit"]);

const form = ref({
  title: "",
  type: "audio",
  url: "",
});

const submit = () => {
  emit("submit", { ...form.value });
};
</script>
