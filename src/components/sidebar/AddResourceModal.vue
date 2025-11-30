<template>
  <div class="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
    <div class="bg-white rounded-md shadow-lg p-5 w-[90%] max-w-sm">
      <h2 class="text-lg font-semibold mb-4 text-[#2c3e50]">Add Resource</h2>

      <form @submit.prevent="submit">
        <label class="block text-sm text-slate-600 mb-1">Title</label>
        <input
            v-model="form.title"
            type="text"
            class="w-full mb-3 border border-[#d9dce1] rounded-md p-2"
            placeholder="Resource title"
        />

        <label class="block text-sm text-slate-600 mb-1">Type</label>
        <select
            v-model="form.type"
            class="w-full mb-3 border border-[#d9dce1] rounded-md p-2"
        >
          <option value="audio">Audio</option>
          <option value="pdf">PDF</option>
          <option value="video">Video</option>
          <option value="link">Link</option>
        </select>

        <label class="block text-sm text-slate-600 mb-1">URL (optional)</label>
        <input
            v-model="form.url"
            type="text"
            class="w-full mb-4 border border-[#d9dce1] rounded-md p-2"
            placeholder="https://..."
        />

        <div class="flex justify-end gap-2">
          <button
              type="button"
              class="px-3 py-1.5 rounded-md border border-[#d9dce1]"
              @click="$emit('close')"
          >
            Cancel
          </button>
          <button
              type="submit"
              class="px-3 py-1.5 rounded-md bg-[#3f4754] text-white hover:bg-[#2f3540]"
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
