<template>
  <div>
    <!-- Writing space -->
    <div class="mb-4">
      <h3 class="text-xl font-semibold mb-2 text-[#2c3e50]">
        New Reflection
      </h3>
      <p class="text-[14px] text-slate-600 mb-4">
        Write freely about what came up for you during or after your sessions.
        This space is private and not linked to client records.
      </p>
    </div>

    <div class="bg-white border border-[#e5e7eb] rounded-md shadow-sm p-4">
      <textarea
          v-model="text"
          placeholder="Begin reflecting here..."
          class="w-full h-48 border border-[#d9dce1] rounded-md p-3 text-[14px] focus:outline-none focus:ring-2 focus:ring-[#2563eb] resize-none"
      ></textarea>

      <div class="flex justify-end mt-3">
        <button
            class="text-[13px] px-4 py-2 rounded-md border border-[#d9dce1] bg-[#2563eb] text-white hover:bg-[#1d4ed8] transition disabled:opacity-50"
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
