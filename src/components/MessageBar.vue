<template>
  <div
      :class="[
      'fixed bottom-0 left-0 right-0 transition-all duration-300 border-t border-slate-800 p-4 bg-[#1E2E4C] z-40',
      drawerOpen ? 'md:mr-[22rem]' : ''
    ]"
      style="height:4rem"
  >
    <div class="flex w-full items-center gap-3">
      <textarea
          rows="1"
          placeholder="Write or speak your reflection..."
          class="flex-1 resize-none bg-transparent text-fog-white placeholder-slate-haze focus:outline-none"
      />
      <MicrophoneIcon class="w-6 h-6 text-violet-glow hover:text-fog-white cursor-pointer transition" />
    </div>
  </div>
</template>

<script setup>
import { MicrophoneIcon } from '@heroicons/vue/24/outline'
defineProps({
  drawerOpen: Boolean
})
</script>

