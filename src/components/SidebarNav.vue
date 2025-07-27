<template>
  <transition name="slide">
    <div
        v-if="show"
        class="fixed right-0 top-14 bottom-0 w-[22rem] z-50"
    >
      <div
          class="relative w-full h-full bg-[#243659] text-fog-white shadow-lg border-l border-violet-glow ring-1 ring-violet-glow/10 p-6 flex flex-col"
      >
        <button
            class="absolute top-4 right-4 text-slate-haze hover:text-fog-white transition"
            @click="$emit('close')"
        >
          <XMarkIcon class="w-5 h-5" />
        </button>
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

