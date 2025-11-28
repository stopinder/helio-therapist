<template>
  <div
      class="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50"
      @click.self="emit('close')"
  >
    <div class="w-full max-w-sm bg-white rounded-lg p-6 shadow-xl">
      <h2 class="text-[16px] font-semibold text-[#2c3e50] mb-4">Add Client</h2>

      <div class="space-y-4">
        <input
            v-model="name"
            type="text"
            placeholder="Client name"
            class="w-full border border-[#d1d5db] rounded-md px-3 py-2 text-[14px]"
        />

        <input
            v-model="email"
            type="email"
            placeholder="Email (optional)"
            class="w-full border border-[#d1d5db] rounded-md px-3 py-2 text-[14px]"
        />

        <textarea
            v-model="note"
            placeholder="Quick note (optional)"
            class="w-full border border-[#d1d5db] rounded-md px-3 py-2 text-[14px]"
        ></textarea>
      </div>

      <div class="flex justify-end gap-3 mt-6">
        <button
            class="px-3 py-1.5 text-[13px] rounded-md border border-[#d1d5db]"
            @click="emit('close')"
        >
          Cancel
        </button>

        <button
            class="px-4 py-1.5 text-[13px] rounded-md bg-[#3f4754] text-white font-medium"
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
