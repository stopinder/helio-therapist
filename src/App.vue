<template>
  <div class="flex flex-col min-h-screen bg-celestial-dusk text-fog-white font-sans">
    <!-- Top Bar -->
    <header class="h-14 bg-celestial-dusk flex items-center justify-between px-8 shadow border-b border-slate-800">
      <div class="text-xl font-bold tracking-tight text-lavender-wash select-none">
        Heliosynthesis
      </div>
      <div class="flex items-center gap-4">
        <Cog6ToothIcon class="w-5 h-5 text-slate-haze hover:text-fog-white cursor-pointer" />
        <img src="https://ui-avatars.com/api/?name=Therapist&background=232940&color=fff" alt="Therapist profile" class="w-9 h-9 rounded-full border border-slate-600" />
        <button class="text-red-400 hover:text-fog-white border border-red-400 hover:border-fog-white rounded-full px-4 py-1.5 text-sm">Logout</button>
      </div>
    </header>

    <!-- Layout -->
    <div class="flex flex-1">
      <!-- Left Sidebar -->
      <aside class="w-56 bg-celestial-dusk border-r border-slate-800 p-4">
        <ClientsSection @select-client="drawerClient = $event" />
      </aside>

      <!-- Main Canvas with Message Bar -->
      <main class="flex flex-col justify-between flex-1 bg-midnight-blue relative">
        <div class="flex-grow p-10 max-w-3xl mx-auto w-full">
          <h1 class="text-3xl font-semibold text-lavender-wash mb-2">Therapist Cockpit</h1>
          <p class="text-slate-haze text-lg">Main canvas content</p>
        </div>
        <!-- Message bar gets prop about sidebar state -->
        <MessageBar :drawerOpen="!!drawerClient" />
        <!-- Floating Sidebar, overlays content but not message bar -->
        <Sidebar
            v-if="drawerClient"
            :show="!!drawerClient"
            :client="drawerClient"
            @close="drawerClient = null"
        />
      </main>
    </div>
  </div>
</template>

<script setup>
import ClientsSection from './components/ClientsSection.vue'
import Sidebar from './components/SidebarNav.vue'
import { ref } from 'vue'

const drawerClient = ref(null)

import { Cog6ToothIcon } from '@heroicons/vue/24/outline'
import MessageBar from './components/MessageBar.vue'
</script>
