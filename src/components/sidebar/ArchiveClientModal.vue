<template>
  <div
      class="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50"
      @click.self="emit('close')"
  >
    <div class="w-full max-w-sm bg-white rounded-lg p-6 shadow-xl">
      <h2 class="text-[16px] font-semibold text-[#2c3e50] mb-3">
        Archive Client
      </h2>

      <p class="text-[14px] text-slate-600 leading-relaxed">
        This will remove the client from your active list, but all notes and
        history will be preserved. You can restore them anytime.
      </p>

      <div class="flex justify-end gap-3 mt-6">
        <button
            class="px-3 py-1.5 text-[13px] rounded-md border border-[#d1d5db]"
            @click="emit('close')"
        >
          Cancel
        </button>

        <button
            class="px-4 py-1.5 text-[13px] rounded-md bg-red-600 text-white font-medium"
            @click="emit('confirm')"
        >
          Archive
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
const emit = defineEmits(["close", "confirm"]);
</script>
