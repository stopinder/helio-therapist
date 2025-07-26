<template>
  <div class="min-h-screen bg-celestial-dusk text-fog-white font-sans">
    <!-- Top Bar -->
    <header class="fixed top-0 left-0 right-0 h-14 bg-celestial-dusk flex items-center justify-between px-8 shadow z-30 border-b border-slate-800">
      <div class="text-xl font-bold tracking-tight text-lavender-wash select-none">
        Heliosynthesis
      </div>
      <div class="flex items-center gap-4">
        <Cog6ToothIcon class="w-5 h-5 text-slate-haze hover:text-fog-white transition cursor-pointer" aria-label="Settings" />
        <img
            src="https://ui-avatars.com/api/?name=Therapist&background=232940&color=fff"
            alt="Therapist profile"
            class="w-9 h-9 rounded-full object-cover border border-slate-600"
        />
        <button
            class="text-red-400 hover:text-fog-white border border-red-400 hover:border-fog-white rounded-full px-4 py-1.5 text-sm transition"
        >
          Logout
        </button>
      </div>
    </header>

    <!-- Layout -->
    <div class="flex pt-14">
      <SidebarNav class="bg-celestial-dusk border-r border-slate-800">
        <ClientsSection />
      </SidebarNav>

      <main class="flex-1 min-h-[calc(100vh-3.5rem)] bg-midnight-blue text-fog-white p-10">
        <section class="max-w-3xl mx-auto">
          <h1 class="text-3xl font-semibold text-lavender-wash mb-2">Therapist Cockpit</h1>
          <p class="text-slate-haze text-lg">
            Calm. Structured. Celestial. Now with visual clarity and hierarchy.
          </p>
        </section>
      </main>
    </div>
  </div>
</template>

<script setup>
import SidebarNav from './components/SidebarNav.vue'
import ClientsSection from './components/ClientsSection.vue'
import { Cog6ToothIcon } from '@heroicons/vue/24/outline'
</script>


