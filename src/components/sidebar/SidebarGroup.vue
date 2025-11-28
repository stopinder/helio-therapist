<template>
  <div class="w-full">
    <!-- Header -->
    <button
        class="w-full flex items-center justify-between px-3 py-2 text-[13px] font-semibold text-[#2c3e50] hover:bg-[#f5f7fa] transition rounded-md"
        @click="toggle"
    >
      <span>{{ title }}</span>

      <span
          class="transition-transform"
          :class="{ 'rotate-90': open }"
      >
        ▶
      </span>
    </button>

    <!-- Body -->
    <transition name="slide-vert">
      <div v-if="open" class="mt-2 pl-2">
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
