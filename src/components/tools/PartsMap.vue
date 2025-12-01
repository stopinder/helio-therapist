<!-- src/components/tools/PartsMap.vue -->
<template>
  <div class="p-6 bg-white rounded-lg shadow-sm border border-[#d9dce1] max-w-3xl mx-auto">
    <h2 class="text-[18px] font-semibold text-[#2c3e50] mb-3">IFS Parts Map</h2>
    <p class="text-[14px] text-slate-600 mb-4">
      Visualize internal parts, roles, and relationships. Interactive mapping coming soon.
    </p>

    <!-- Add new part -->
    <div class="flex items-center gap-2 mb-4">
      <input
          v-model="newPart.name"
          placeholder="Part name"
          class="flex-1 border border-[#d9dce1] rounded-md px-3 py-1.5 text-[14px]"
      />
      <input
          v-model="newPart.role"
          placeholder="Role (e.g. protector, exile)"
          class="flex-1 border border-[#d9dce1] rounded-md px-3 py-1.5 text-[14px]"
      />
      <button
          v-on:click="addPart"
          class="px-3 py-1.5 bg-[#3f4754] text-white rounded-md text-[13px] hover:bg-[#2f3540]"
      >
        Add
      </button>
    </div>

    <!-- Parts list -->
    <ul class="divide-y divide-[#e5e7eb] text-[14px]">
      <li
          v-for="(p, idx) in parts"
          v-bind:key="idx"
          class="py-2"
      >
        <div class="flex justify-between items-start">
          <div class="flex-1">
            <div class="font-semibold text-[#2c3e50]">{{ p.name }}</div>
            <div class="text-slate-600 text-[13px] mb-1">{{ p.role }}</div>
            <textarea
                v-model="p.notes"
                placeholder="Notes about this part..."
                rows="2"
                class="w-full border border-[#d9dce1] rounded-md px-2 py-1 text-[13px] mt-1"
            ></textarea>
          </div>
          <button
              v-on:click="removePart(idx)"
              class="text-[13px] text-red-600 hover:underline ml-3 mt-1"
          >
            ✕
          </button>
        </div>
      </li>
    </ul>

    <!-- Save button -->
    <div class="flex justify-end pt-3">
      <button
          v-on:click="saveParts"
          class="px-4 py-2 bg-[#3f4754] text-white rounded-md hover:bg-[#2f3540] text-[14px]"
      >
        Save Parts
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const emit = defineEmits(['save'])

const parts = ref([])
const newPart = ref({ name: '', role: '', notes: '' })

function addPart() {
  if (!newPart.value.name.trim()) return
  parts.value.push({ ...newPart.value })
  newPart.value = { name: '', role: '', notes: '' }
}

function removePart(index) {
  parts.value.splice(index, 1)
}

function saveParts() {
  const clientId = localStorage.getItem('helio_selectedClientId')
  emit('save', {
    template: 'parts-map',
    data: { clientId, parts: parts.value }
  })
  alert('Parts saved for current client.')
}

// Load saved parts when opening for current client
onMounted(() => {
  const clientId = localStorage.getItem('helio_selectedClientId')
  const allData = JSON.parse(localStorage.getItem('helio_toolData')) || {}
  const key = `${clientId}_parts-map`
  if (allData[key]) {
    parts.value = allData[key].parts || []
  }
})
</script>
