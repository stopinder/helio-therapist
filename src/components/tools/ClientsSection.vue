<template>
  <section>
    <!-- Header -->
    <button
        class="w-full flex justify-between items-center text-xs text-slate-haze uppercase tracking-wider mb-2 px-2 py-1 hover:text-fog-white transition"
        @click="isOpen = !isOpen"
    >
      <span>Clients</span>
      <ChevronDownIcon
          class="w-4 h-4 transition-transform duration-200"
          :class="{ 'rotate-180': isOpen }"
      />
    </button>

    <!-- Search -->
    <input
        v-show="isOpen"
        v-model="search"
        type="text"
        placeholder="Search..."
        class="w-full text-sm px-3 py-1.5 rounded bg-celestial-dusk text-fog-white placeholder-slate-haze border border-slate-700 mb-2 focus:outline-none focus:ring-1 focus:ring-violet-glow"
    />

    <!-- Clients List & Add -->
    <transition name="fade">
      <div v-show="isOpen" class="space-y-1">
        <ul class="space-y-1 max-h-48 overflow-y-auto pr-1 scrollbar-hide">
          <li
              v-for="client in filteredClients"
              :key="client.id"
              class="flex justify-between items-center px-3 py-2 rounded-lg hover:bg-white/5 transition cursor-pointer"
              @click="selectClient(client)"
          >
            <span class="text-sm">{{ client.name }}</span>
            <TrashIcon
                class="w-4 h-4 text-red-400 hover:text-red-300"
                @click.stop="confirmDelete(client)"
            />
          </li>
        </ul>

        <!-- Add Client Button -->
        <button
            @click="addClient"
            class="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-violet-glow hover:text-fog-white hover:bg-white/5 rounded-lg transition"
        >
          <PlusIcon class="w-5 h-5" />
          Add Client
        </button>
      </div>
    </transition>

    <!-- Confirm Delete Modal -->
    <ConfirmDialog
        v-if="clientPendingDelete"
        :show="true"
        title="Delete Client"
        message="You are about to delete this client. This action cannot be undone."
        @cancel="clientPendingDelete = null"
        @confirm="deleteClient"
    />

    <!-- Right-Side Drawer -->
    <ClientDrawer
        :show="!!drawerClient"
        :client="drawerClient"
        @close="drawerClient = null"
    />
  </section>
</template>

<script setup>
import { ref, computed } from 'vue'
import {
  ChevronDownIcon,
  PlusIcon,
  TrashIcon
} from '@heroicons/vue/24/outline'
import ConfirmDialog from './ConfirmDialog.vue'
import ClientDrawer from './ClientDrawer.vue'

const isOpen = ref(false)
const search = ref('')
const clientPendingDelete = ref(null)
const drawerClient = ref(null)

const clients = ref([
  { id: 1, name: 'Alex Carter' },
  { id: 2, name: 'Casey Minh' },
  { id: 3, name: 'Jordan Silva' },
])

const filteredClients = computed(() =>
    clients.value.filter(c =>
        c.name.toLowerCase().includes(search.value.toLowerCase())
    )
)

function selectClient(client) {
  drawerClient.value = client
}

function confirmDelete(client) {
  clientPendingDelete.value = client
}

function deleteClient() {
  clients.value = clients.value.filter(c => c.id !== clientPendingDelete.value.id)
  clientPendingDelete.value = null
}

function addClient() {
  console.log('Add client clicked')
}
</script>

<style scoped>
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
.scrollbar-hide::-webkit-scrollbar {
  width: 0;
  height: 0;
}
</style>

