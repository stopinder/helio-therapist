<!-- src/components/tools/CognitiveInterweave.vue -->
<template>
  <div class="p-6 bg-white rounded-lg shadow-sm border border-[#d9dce1] max-w-4xl mx-auto">
    <h2 class="text-[18px] font-semibold text-[#2c3e50] mb-3">Cognitive Interweave</h2>
    <p class="text-[14px] text-slate-600 mb-4">
      Record and reflect on cognitive interweaves used to facilitate EMDR processing.
    </p>

    <!-- Add new interweave -->
    <div class="flex items-center gap-2 mb-4">
      <input
          v-model="newInterweave.target"
          placeholder="Target or situation"
          class="flex-1 border border-[#d9dce1] rounded-md px-3 py-1.5 text-[14px]"
      />
      <input
          v-model="newInterweave.purpose"
          placeholder="Purpose (e.g., blocked processing, insight, compassion)"
          class="flex-1 border border-[#d9dce1] rounded-md px-3 py-1.5 text-[14px]"
      />
      <button
          v-on:click="addInterweave"
          class="px-3 py-1.5 bg-[#3f4754] text-white rounded-md text-[13px] hover:bg-[#2f3540]"
      >
        Add
      </button>
    </div>

    <!-- Interweave list -->
    <ul class="divide-y divide-[#e5e7eb] text-[14px]">
      <li v-for="(iw, idx) in interweaves" :key="idx" class="py-3">
        <div class="flex justify-between items-start">
          <div class="flex-1">
            <div class="font-semibold text-[#2c3e50]">{{ iw.target }}</div>
            <div class="text-slate-600 text-[13px] mb-1">
              Purpose: {{ iw.purpose }}
            </div>

            <label class="block text-[12px] text-slate-500 mb-0.5">Cognition or Prompt</label>
            <input
                v-model="iw.cognition"
                placeholder="Therapist question or reframe"
                class="w-full border border-[#d9dce1] rounded-md px-2 py-1 text-[13px] mb-2"
            />

            <label class="block text-[12px] text-slate-500 mb-0.5">Outcome / Notes</label>
            <textarea
                v-model="iw.notes"
                placeholder="Describe client response or session effect..."
                rows="2"
                class="w-full border border-[#d9dce1] rounded-md px-2 py-1 text-[13px]"
            ></textarea>
          </div>

          <button
              v-on:click="removeInterweave(idx)"
              class="text-[13px] text-red-600 hover:underline ml-3 mt-1"
          >
            ✕
          </button>
        </div>
      </li>
    </ul>

    <!-- Action buttons -->
    <div class="flex justify-end gap-3 pt-3">
      <button
          v-on:click="generateInsight"
          class="px-4 py-2 bg-[#2563eb] text-white rounded-md hover:bg-[#1d4ed8] text-[14px]"
      >
        Generate Insight
      </button>
      <button
          v-on:click="saveInterweaves"
          class="px-4 py-2 bg-[#3f4754] text-white rounded-md hover:bg-[#2f3540] text-[14px]"
      >
        Save Interweaves
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const emit = defineEmits(['save', 'generate-insight'])

const interweaves = ref([])
const newInterweave = ref({
  target: '',
  purpose: '',
  cognition: '',
  notes: ''
})

function addInterweave() {
  if (!newInterweave.value.target.trim()) return
  interweaves.value.push({ ...newInterweave.value })
  newInterweave.value = { target: '', purpose: '', cognition: '', notes: '' }
}

function removeInterweave(index) {
  interweaves.value.splice(index, 1)
}

function saveInterweaves() {
  const clientId = JSON.parse(localStorage.getItem('helio_selectedClient'))?.id
  if (!clientId) {
    alert('No client selected — please select a client first.')
    return
  }

  const all = JSON.parse(localStorage.getItem('helio_toolData')) || {}
  all[`${clientId}_cognitive`] = {
    interweaves: interweaves.value,
    savedAt: new Date().toISOString()
  }
  localStorage.setItem('helio_toolData', JSON.stringify(all))

  alert('Cognitive Interweaves saved for this client!')
  window.dispatchEvent(new CustomEvent('tool-saved'))

  emit('save', { tool: 'emdr_cognitive', clientId, interweaves: interweaves.value })
}

function generateInsight() {
  const clientId = JSON.parse(localStorage.getItem('helio_selectedClient'))?.id
  if (!clientId) {
    alert('No client selected — please select a client first.')
    return
  }

  const payload = { tool: 'emdr_cognitive', clientId, interweaves: interweaves.value }
  console.log('🔄 Forwarding EMDR insight event...', payload)
  emit('generate-insight', payload)
}

// Load saved interweaves for this client
onMounted(() => {
  const clientId = JSON.parse(localStorage.getItem('helio_selectedClient'))?.id
  const allData = JSON.parse(localStorage.getItem('helio_toolData')) || {}
  const key = `${clientId}_cognitive`
  if (allData[key]) {
    interweaves.value = allData[key].interweaves || []
  }
})
</script>

