<template>
  <aside
      class="hidden md:flex md:w-60 bg-white border-r border-[#d9dce1] flex-col"
  >
    <!-- Therapist header -->
    <div class="h-16 flex items-center px-4 border-b border-[#d9dce1]">
      <div class="flex items-center gap-3">
        <div
            class="h-9 w-9 rounded-full bg-[#e4d9cf] flex items-center justify-center text-[14px] font-semibold text-[#2c3e50]"
        >
          RO
        </div>
        <div class="flex flex-col">
          <span class="text-[14px] font-semibold text-[#2c3e50]">
            Robert Ormiston
          </span>
          <span class="text-[12px] text-slate-600">
            Psychotherapist
          </span>
        </div>
      </div>
    </div>

    <!-- Navigation + clients -->
    <div class="flex-1 overflow-auto px-4 py-4 space-y-6 text-[14px]">
      <!-- Navigation section -->
      <section>
        <h2 class="text-[12px] font-semibold tracking-wide text-slate-500 uppercase mb-2">
          Navigation
        </h2>
        <div class="space-y-1">
          <button
              class="w-full flex items-center justify-between px-3 py-2 rounded border border-transparent hover:border-[#d9dce1] hover:bg-[#f5f7fa]"
          >
            <span>Clients</span>
          </button>
          <button
              class="w-full flex items-center justify-between px-3 py-2 rounded border border-transparent hover:border-[#d9dce1] hover:bg-[#f5f7fa]"
          >
            <span>Sessions</span>
          </button>
          <button
              class="w-full flex items-center justify-between px-3 py-2 rounded border border-transparent hover:border-[#d9dce1] hover:bg-[#f5f7fa]"
          >
            <span>Resources</span>
          </button>
        </div>
      </section>

      <!-- Clients section -->
      <section>
        <h2 class="text-[12px] font-semibold tracking-wide text-slate-500 uppercase mb-2">
          Clients
        </h2>
        <div class="rounded-md border border-[#d9dce1] bg-white divide-y divide-[#d9dce1]">
          <button
              v-for="client in clients"
              :key="client.id"
              type="button"
              class="w-full text-left px-3 py-3 cursor-pointer rounded-sm transition-all"
              :class="[
              selectedClient && client.id === selectedClient.id
                ? 'relative bg-[#eef1f5] border-l-4 border-[#3f4754] shadow-sm'
                : 'hover:bg-[#f5f7fa] border-l-4 border-transparent'
            ]"
              @click="onSelectClient(client)"
          >
            <div class="flex items-center justify-between">
              <span
                  class="text-[14px]"
                  :class="selectedClient && client.id === selectedClient.id
                  ? 'font-semibold text-[#2c3e50]'
                  : 'font-medium text-[#3f4754]'"
              >
                {{ client.name }}
              </span>

              <span class="text-[11px] text-slate-500">
                {{ client.lastSeen }}
              </span>
            </div>

            <p
                class="text-[12px] mt-1"
                :class="selectedClient && client.id === selectedClient.id
                ? 'text-slate-700'
                : 'text-slate-600'"
            >
              {{ client.note }}
            </p>
          </button>
        </div>
      </section>
    </div>
  </aside>
</template>

<script setup>
const props = defineProps({
  clients: {
    type: Array,
    default: () => [],
  },
  selectedClient: {
    type: Object,
    default: null,
  },
});

const emit = defineEmits(["select-client"]);

const onSelectClient = (client) => {
  emit("select-client", client);
};
</script>


