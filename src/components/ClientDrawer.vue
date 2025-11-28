<template>
  <transition name="slide">
    <aside
        v-if="isOpen"
        class="w-72 bg-white border-l border-[#d9dce1] shadow-xl h-full fixed right-0 top-0 flex flex-col"
    >
      <div class="h-14 flex items-center justify-between px-4 border-b border-[#d9dce1]">
        <span class="text-[16px] font-semibold">Client Info</span>
        <button @click="toggle" class="text-[#3f4754] hover:text-black">✕</button>
      </div>

      <div class="p-4 space-y-4 overflow-auto">
        <div class="border border-[#d9dce1] rounded-md p-4 shadow-sm bg-white">
          <div class="text-[15px] font-semibold">Alerts</div>
          <p class="text-[13px] text-slate-600 mt-2">None yet.</p>
        </div>

        <div class="border border-[#d9dce1] rounded-md p-4 shadow-sm bg-white">
          <div class="text-[15px] font-semibold">Tags</div>
          <p class="text-[13px] text-slate-600 mt-2">No tags added.</p>
        </div>
      </div>
    </aside>
  </transition>
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
