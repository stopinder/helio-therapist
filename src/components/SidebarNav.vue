<template>
  <aside
      class="fixed top-0 left-0 h-screen w-64 bg-helios-slate text-white flex flex-col border-r border-slate-700 z-40"
      aria-label="Therapist Sidebar Navigation"
  >
    <!-- Logo / Title -->
    <div class="h-14 flex items-center justify-center border-b border-slate-700 text-indigo-200 text-xl font-bold tracking-tight select-none">
      Heliosynthesis
    </div>

    <!-- Sidebar Sections -->
    <nav class="flex-1 overflow-y-auto px-4 py-6 space-y-8">
      <!-- Sections injected here -->
      <slot />
    </nav>
  </aside>
</template>

<script setup>
// No props needed yet — receives children via <slot>
</script>

<style scoped>
/* Custom scrollbars (optional) */
nav::-webkit-scrollbar {
  width: 6px;
}
nav::-webkit-scrollbar-track {
  background: transparent;
}
nav::-webkit-scrollbar-thumb {
  background-color: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
}
</style>
