<template>
  <transition name="fade">
    <div
        v-if="show"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60"
    >
      <div class="bg-celestial-dusk border border-slate-700 rounded-xl p-6 w-80 shadow-lg">
        <h2 class="text-lg font-semibold text-fog-white mb-2">{{ title }}</h2>
        <p class="text-sm text-slate-haze mb-4">{{ message }}</p>
        <div class="flex justify-end gap-3">
          <button
              class="px-3 py-1.5 text-sm text-slate-haze hover:text-fog-white"
              @click="$emit('cancel')"
          >
            Cancel
          </button>
          <button
              class="px-3 py-1.5 text-sm text-red-400 hover:text-white border border-red-400 hover:border-white rounded transition"
              @click="$emit('confirm')"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup>
defineProps({
  show: Boolean,
  title: String,
  message: String
})
</script>

<style scoped>
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.25s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>
