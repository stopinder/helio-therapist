<template>
  <div class="w-full border-t border-slate-700 bg-slate-800 p-4 flex items-center gap-3 z-10">
    <MicrophoneIcon class="w-6 h-6 text-white" />
    <textarea
        rows="1"
        placeholder="Type something..."
        class="flex-1 resize-none bg-transparent text-white placeholder-gray-400 focus:outline-none"
    />
  </div>
</template>

<script setup>
import { MicrophoneIcon } from '@heroicons/vue/24/outline'
</script>

