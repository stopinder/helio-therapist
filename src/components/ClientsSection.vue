<template>
  <section>
    <!-- Section Header -->
    <h2 class="text-xs text-helios-faded uppercase tracking-wider mb-2 pl-2">Clients</h2>

    <!-- Client List -->
    <ul class="space-y-1">
      <li
          v-for="client in clients"
          :key="client.id"
          @click="selectClient(client)"
          class="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-600 cursor-pointer transition"
      >
        <UserIcon class="w-5 h-5 text-indigo-300" />
        <span class="text-sm">{{ client.name }}</span>
      </li>
    </ul>

    <!-- Add Client Button -->
    <button
        @click="addClient"
        class="mt-4 w-full flex items-center gap-2 px-3 py-2 text-sm text-indigo-200 hover:text-white hover:bg-slate-600 rounded-lg transition"
    >
      <PlusIcon class="w-5 h-5" />
      Add Client
    </button>
  </section>
</template>

<script setup>
import { ref } from 'vue'
import { UserIcon, PlusIcon } from '@heroicons/vue/24/outline'

const clients = ref([
  { id: 1, name: 'Alex Carter' },
  { id: 2, name: 'Casey Minh' },
  { id: 3, name: 'Jordan Silva' }
])

function selectClient(client) {
  console.log('Selected client:', client)
  // Replace with event emit or Pinia store later
}

function addClient() {
  console.log('Add client clicked')
  // Replace with modal or form in future
}
</script>
