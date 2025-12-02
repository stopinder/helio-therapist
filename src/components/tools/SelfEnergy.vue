<!-- src/components/tools/SelfEnergy.vue -->
<template>
  <div class="p-6 bg-white rounded-lg shadow-sm border border-[#d9dce1] max-w-3xl mx-auto">
    <h2 class="text-[18px] font-semibold text-[#2c3e50] mb-3">Self-Energy Exercise</h2>
    <p class="text-[14px] text-slate-600 mb-4">
      Reflect on Self-Energy qualities such as calm, curiosity, compassion, and clarity.
      Use this space to note what you observe or feel during the exercise.
    </p>

    <!-- Reflection form -->
    <div class="space-y-3">
      <div>
        <label class="block text-[14px] font-medium text-[#3f4754] mb-1">Date / Context</label>
        <input
            v-model="form.context"
            type="text"
            placeholder="Session date or context"
            class="cbt-input"
        />
      </div>

      <div>
        <label class="block text-[14px] font-medium text-[#3f4754] mb-1">Reflections</label>
        <textarea
            v-model="form.reflections"
            rows="4"
            placeholder="Describe how Self-energy was experienced or accessed..."
            class="cbt-input"
        ></textarea>
      </div>

      <div>
        <label class="block text-[14px] font-medium text-[#3f4754] mb-1">Qualities Present</label>
        <input
            v-model="form.qualities"
            type="text"
            placeholder="e.g., Calm, Curiosity, Courage, Clarity"
            class="cbt-input"
        />
      </div>
    </div>

    <!-- Action buttons -->
    <div class="flex justify-end gap-3 pt-4">
      <button
          v-on:click="generateInsight"
          class="px-4 py-2 bg-[#2563eb] text-white rounded-md hover:bg-[#1d4ed8] text-[14px]"
      >
        Generate Insight
      </button>
      <button
          v-on:click="save"
          class="px-4 py-2 bg-[#3f4754] text-white rounded-md hover:bg-[#2f3540] text-[14px]"
      >
        Save Reflection
      </button>
    </div>
  </div>
</template>

<script setup>
import { reactive } from 'vue'

const emit = defineEmits(['save', 'generate-insight'])

const form = reactive({
  context: '',
  reflections: '',
  qualities: ''
})

function save() {
  const clientId = JSON.parse(localStorage.getItem('helio_selectedClient'))?.id
  if (!clientId) {
    alert('No client selected — please select a client first.')
    return
  }

  const all = JSON.parse(localStorage.getItem('helio_toolData')) || {}
  all[`${clientId}_self-energy`] = { ...form, savedAt: new Date().toISOString() }
  localStorage.setItem('helio_toolData', JSON.stringify(all))

  alert('Self-Energy reflection saved for this client!')
  window.dispatchEvent(new CustomEvent('tool-saved'))

  emit('save', { tool: 'ifs_self-energy', clientId, form })
}

function generateInsight() {
  const clientId = JSON.parse(localStorage.getItem('helio_selectedClient'))?.id
  if (!clientId) {
    alert('No client selected — please select a client first.')
    return
  }

  const payload = { tool: 'ifs_self-energy', clientId, form }
  console.log('🔄 Forwarding IFS insight event...', payload)
  emit('generate-insight', payload)
}
</script>

<style scoped>
.cbt-input {
  @apply w-full border border-[#d9dce1] rounded-md px-3 py-2 text-[14px]
  focus:outline-none focus:ring-2 focus:ring-[#a8b0c1] bg-[#fafbfc];
}
</style>

