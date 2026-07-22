<!-- src/components/tools/CognitiveInterweave.vue -->
<template>
  <div class="p-6 bg-surface-elevated rounded-panel  border border-border max-w-4xl mx-auto">
    <h2 class="text-h3 font-semibold text-ink mb-3">Cognitive Interweave</h2>
    <p class="text-body text-ink-secondary mb-4">
      Record and reflect on cognitive interweaves used to facilitate EMDR processing.
    </p>

    <!-- Add new interweave -->
    <div class="flex items-center gap-2 mb-4">
      <input
          v-model="newInterweave.target"
          placeholder="Target or situation"
          class="flex-1 border border-border rounded-control px-3 py-1.5 text-body"
      />
      <input
          v-model="newInterweave.purpose"
          placeholder="Purpose (e.g., blocked processing, insight, compassion)"
          class="flex-1 border border-border rounded-control px-3 py-1.5 text-body"
      />
      <button
          v-on:click="addInterweave"
          class="px-3 py-1.5 bg-action-primary text-on-action rounded-control text-body-sm hover:bg-action-primary-hover"
      >
        Add
      </button>
    </div>

    <!-- Interweave list -->
    <ul class="divide-y divide-border-muted text-body">
      <li v-for="(iw, idx) in interweaves" :key="idx" class="py-3">
        <div class="flex justify-between items-start">
          <div class="flex-1">
            <div class="font-semibold text-ink">{{ iw.target }}</div>
            <div class="text-ink-secondary text-body-sm mb-1">
              Purpose: {{ iw.purpose }}
            </div>

            <label class="block text-caption text-ink-muted mb-0.5">Cognition or Prompt</label>
            <input
                v-model="iw.cognition"
                placeholder="Therapist question or reframe"
                class="w-full border border-border rounded-control px-2 py-1 text-body-sm mb-2"
            />

            <label class="block text-caption text-ink-muted mb-0.5">Outcome / Notes</label>
            <textarea
                v-model="iw.notes"
                placeholder="Describe client response or session effect..."
                rows="2"
                class="w-full border border-border rounded-control px-2 py-1 text-body-sm"
            ></textarea>
          </div>

          <button
              v-on:click="removeInterweave(idx)"
              class="text-body-sm text-state-danger hover:underline ml-3 mt-1"
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
          class="px-4 py-2 bg-action-link text-on-action rounded-control hover:bg-action-link-hover text-body"
      >
        Generate Insight
      </button>
      <button
          v-on:click="saveInterweaves"
          class="px-4 py-2 bg-action-primary text-on-action rounded-control hover:bg-action-primary-hover text-body"
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

