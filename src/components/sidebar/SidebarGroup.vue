<template>
  <div class="w-full">
    <!-- Header -->
    <button
        type="button"
        class="w-full text-left px-4 py-2.5 text-[11px] uppercase tracking-wide font-semibold text-[#475569] hover:bg-[#f1f5f9] transition rounded-md flex justify-between items-center"
        @click="toggle"
        :aria-expanded="open.toString()"
    >
      <span>{{ title }}</span>
      <span
          v-if="open"
          class="text-slate-400 text-[13px]"
      >−</span>
      <span
          v-else
          class="text-slate-400 text-[13px]"
      >+</span>
    </button>

    <!-- Body -->
    <transition name="slide-vert">
      <div
          v-if="open"
          class="mt-2 pl-4 border-l border-[#e5e7eb] space-y-2"
      >
        <slot />
      </div>
    </transition>
  </div>
</template>


<script setup>
import { ref } from "vue";

const props = defineProps({
  title: String,
  initiallyOpen: {
    type: Boolean,
    default: false,
  },
});

const open = ref(props.initiallyOpen);

const toggle = () => {
  open.value = !open.value;
};
</script>

<style>
.slide-vert-enter-from,
.slide-vert-leave-to {
  max-height: 0;
  opacity: 0;
}
.slide-vert-enter-to,
.slide-vert-leave-from {
  max-height: 400px;
  opacity: 1;
}
.slide-vert-enter-active,
.slide-vert-leave-active {
  transition: all 0.25s ease;
}
</style>
