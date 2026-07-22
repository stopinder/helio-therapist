<template>
  <transition-colors duration-standard ease-out name="slide">
    <aside
        v-if="isOpen"
        class="w-72 bg-surface-elevated border-l border-border shadow-overlay h-full fixed right-0 top-0 flex flex-col"
    >
      <div class="h-14 flex items-center justify-between px-4 border-b border-border">
        <span class="text-body-long font-semibold">Client Info</span>
        <button @click="toggle" class="text-ink-secondary hover:text-ink">✕</button>
      </div>

      <div class="p-4 space-y-4 overflow-auto">
        <div class="border border-border rounded-control p-4  bg-surface-elevated">
          <div class="text-body font-semibold">Alerts</div>
          <p class="text-body-sm text-ink-secondary mt-2">None yet.</p>
        </div>

        <div class="border border-border rounded-control p-4  bg-surface-elevated">
          <div class="text-body font-semibold">Tags</div>
          <p class="text-body-sm text-ink-secondary mt-2">No tags added.</p>
        </div>
      </div>
    </aside>
  </transition-colors duration-standard ease-out>
</template>

<script setup>
import { ref } from "vue";

const isOpen = ref(false);

const toggle = () => {
  isOpen.value = !isOpen.value;
};

export { toggle, isOpen };
</script>

<style>
.slide-enter-from {
  transform: translateX(100%);
}
.slide-enter-to {
  transform: translateX(0);
}
.slide-enter-active {
  transition: 0.2s ease;
}
.slide-leave-from {
  transform: translateX(0);
}
.slide-leave-to {
  transform: translateX(100%);
}
.slide-leave-active {
  transition: 0.2s ease;
}
</style>
