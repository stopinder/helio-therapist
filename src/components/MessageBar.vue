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


