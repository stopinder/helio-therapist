<template>
  <div class="w-full">
    <!-- Header -->
    <button
        type="button"
        class="w-full text-left px-4 py-2.5 text-overline uppercase tracking-wide font-semibold text-ink-muted hover:bg-surface-subtle transition-colors duration-standard ease-out rounded-control flex justify-between items-center"
        @click="toggle"
        :aria-expanded="open.toString()"
    >
      <span>{{ title }}</span>
      <span
          v-if="open"
          class="text-ink-subtle text-body-sm"
      >−</span>
      <span
          v-else
          class="text-ink-subtle text-body-sm"
      >+</span>
    </button>

    <!-- Body -->
    <transition-colors duration-standard ease-out name="slide-vert">
      <div
          v-if="open"
          class="mt-2 pl-4 border-l border-border-muted space-y-2"
      >
        <slot />
      </div>
    </transition-colors duration-standard ease-out>
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
