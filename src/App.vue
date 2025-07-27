<template>
  <div class="flex flex-col min-h-screen bg-celestial-dusk text-fog-white font-sans">
    <!-- Top Bar -->
    <header class="h-14 flex items-center justify-between px-4 md:px-8 border-b border-slate-800">
      <div class="flex items-center gap-4">
        <button class="md:hidden text-lg" @click="sidebarVisible = true">☰</button>
        <div class="text-xl font-bold tracking-tight text-lavender-wash select-none">
          Heliosynthesis
        </div>
      </div>
      <div class="flex items-center gap-4">
        <Cog6ToothIcon class="w-5 h-5 text-slate-haze hover:text-fog-white cursor-pointer" />
        <img src="https://ui-avatars.com/api/?name=Therapist&background=232940&color=fff" alt="Therapist profile" class="w-9 h-9 rounded-full border border-slate-600" />
        <button class="text-red-400 hover:text-fog-white border border-red-400 hover:border-fog-white rounded-full px-4 py-1.5 text-sm">Logout</button>
      </div>
    </header>

    <!-- Layout -->
    <div class="flex flex-1">
      <!-- Desktop Sidebar -->
      <aside class="hidden md:block w-56 bg-celestial-dusk border-r border-slate-800 p-4">
        <ClientsSection @select-client="drawerClient = $event" />
      </aside>

      <!-- Main Content -->
      <main class="flex flex-col justify-between flex-1 bg-midnight-blue relative">
        <div class="flex-grow p-10 max-w-3xl mx-auto w-full">
          <h1 class="text-3xl font-semibold text-lavender-wash mb-2">Therapist Cockpit</h1>
          <p class="text-slate-haze text-lg">Main canvas content</p>
        </div>

        <MessageBar :drawerOpen="!!drawerClient" />

        <!-- Right Sidebar Drawer -->
        <Sidebar
            v-if="drawerClient"
            :show="!!drawerClient"
            :client="drawerClient"
            @close="drawerClient = null"
        />
      </main>
    </div>

    <!-- Backdrop for Mobile Sidebar -->
    <div
        v-if="sidebarVisible"
        class="fixed inset-0 bg-black/40 z-40 md:hidden"
        @click="sidebarVisible = false"
    />

    <!-- Mobile Sidebar Drawer -->
    <transition name="slide-left">
      <aside
          v-if="sidebarVisible"
          class="fixed inset-y-0 left-0 w-64 bg-celestial-dusk z-50 p-4 md:hidden shadow-lg"
          @touchstart="startTouch"
          @touchend="endTouch"
      >
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-xl font-semibold text-lavender-wash">Clients</h2>
          <button class="text-fog-white text-xl" @click="sidebarVisible = false">✕</button>
        </div>
        <ClientsSection @select-client="drawerClient = $event" />
      </aside>
    </transition>
  </div>
</template>

<script setup>
import ClientsSection from './components/ClientsSection.vue'
import Sidebar from './components/SidebarNav.vue'
import MessageBar from './components/MessageBar.vue'
import { ref, watch } from 'vue'
import { Cog6ToothIcon } from '@heroicons/vue/24/outline'

const drawerClient = ref(null)
const sidebarVisible = ref(false)

// Prevent background scroll when mobile sidebar is open
watch(sidebarVisible, (open) => {
  document.body.style.overflow = open ? 'hidden' : ''
})

// Swipe-to-close logic
const touchStartX = ref(0)

function startTouch(e) {
  touchStartX.value = e.changedTouches[0].clientX
}

function endTouch(e) {
  const diff = e.changedTouches[0].clientX - touchStartX.value
  if (diff < -50) {
    sidebarVisible.value = false
  }
}
</script>

<style scoped>
.slide-left-enter-active, .slide-left-leave-active {
  transition: transform 0.3s ease;
}
.slide-left-enter-from, .slide-left-leave-to {
  transform: translateX(-100%);
}
</style>

