<template>
  <form
      class="flex items-center bg-white border border-[#d9dce1] rounded-md shadow-sm"
      @submit.prevent="onSubmit"
  >
    <input
        v-model="inputValue"
        type="text"
        placeholder="Type a note or instruction and press Enter…"
        class="flex-1 px-4 py-2 text-[15px] bg-transparent outline-none"
    />
    <button
        type="submit"
        class="px-4 text-[#3f4754] hover:text-black text-sm"
    >
      ↵
    </button>
    <!-- inside MessageBar.vue -->
    <button
        class="h-9 w-9 flex items-center justify-center rounded-md border border-[#d9dce1] text-[#6b7280] bg-[#f9fafb] hover:bg-[#f1f2f4] transition cursor-not-allowed opacity-60"
        disabled
        title="Voice input (coming soon)"
    >
      🎤
    </button>

  </form>
</template>

<script setup>
import { ref } from "vue";

const emit = defineEmits(["submit"]);

const inputValue = ref("");

const onSubmit = () => {
  const value = inputValue.value.trim();
  if (!value) return;
  emit("submit", value);
  inputValue.value = "";
};
</script>


