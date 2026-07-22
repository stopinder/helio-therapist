<template>
  <form
      class="flex items-center bg-surface-elevated border border-border rounded-control "
      @submit.prevent="onSubmit"
  >
    <input
        v-model="inputValue"
        type="text"
        placeholder="Type a note or instruction and press Enter…"
        class="flex-1 px-4 py-2 text-body bg-transparent outline-none"
    />
    <button
        type="submit"
        class="px-4 text-ink-secondary hover:text-ink text-body"
    >
      ↵
    </button>
    <!-- inside MessageBar.vue -->
    <button
        class="h-9 w-9 flex items-center justify-center rounded-control border border-border text-ink-muted bg-surface-subtle hover:bg-surface-muted transition-colors duration-standard ease-out cursor-not-allowed opacity-60"
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


