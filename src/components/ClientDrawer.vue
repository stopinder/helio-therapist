<template>
  <transition name="slide">
    <div
        v-if="show"
        class="fixed inset-0 z-40 flex justify-end"
        @click.self="$emit('close')"
    >
      <div
          class="relative w-[22rem] max-w-full h-[calc(100vh-3.5rem)] top-14 bg-[#243659] text-fog-white shadow-lg border-l border-violet-glow ring-1 ring-violet-glow/10 p-6 flex flex-col"
      >
        <!-- Close Button -->
        <button
            class="absolute top-4 right-4 text-slate-haze hover:text-fog-white transition"
            @click="$emit('close')"
        >
          <XMarkIcon class="w-5 h-5" />
        </button>

        <!-- Client Info -->
        <h2 class="text-xl font-semibold text-lavender-wash mb-4">
          {{ client?.name }}
        </h2>
        <p class="text-slate-haze text-sm">Client details will appear here…</p>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { XMarkIcon } from '@heroicons/vue/24/outline'
defineProps({
  client: Object,
  show: Boolean
})
defineEmits(['close'])
</script>

<style scoped>
.slide-enter-active,
.slide-leave-active {
  transition: all 0.3s ease;
}
.slide-enter-from,
.slide-leave-to {
  transform: translateX(100%);
  opacity: 0;
}
</style>


