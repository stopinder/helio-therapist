<template>
  <div
      :class="[
      'fixed left-56 bottom-0 transition-all duration-300 border-t border-slate-800 p-4 flex items-center gap-3 bg-[#1E2E4C] z-40',
      drawerOpen ? 'mr-[22rem]' : 'right-0'
    ]"
      style="height:4rem"
  >
    <MicrophoneIcon class="w-6 h-6 text-violet-glow hover:text-fog-white cursor-pointer transition" />
    <textarea
        rows="1"
        placeholder="Write or speak your reflection..."
        class="flex-1 resize-none bg-transparent text-fog-white placeholder-slate-haze focus:outline-none"
    />
  </div>
</template>

<script setup>
import { MicrophoneIcon } from '@heroicons/vue/24/outline'
defineProps({
  drawerOpen: Boolean
})
</script>
