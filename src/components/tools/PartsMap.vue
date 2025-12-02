<!-- src/components/tools/PartsMap.vue -->
<template>
  <div class="p-6 bg-white rounded-lg shadow-sm border border-[#d9dce1] max-w-3xl mx-auto">
    <h2 class="text-[18px] font-semibold text-[#2c3e50] mb-2">IFS Parts Map</h2>
    <p class="text-[14px] text-slate-600 mb-4">
      Visualize internal parts, roles, and relationships. Interactive mapping coming soon.
    </p>

    <div class="space-y-4">
      <div>
        <label class="block text-[14px] font-medium text-[#3f4754] mb-1">
          Part Name
        </label>
        <input
            v-model="form.partName"
            type="text"
            placeholder="e.g. Inner Critic"
            class="cbt-input"
        />
      </div>

      <div>
        <label class="block text-[14px] font-medium text-[#3f4754] mb-1">
          Role / Function
        </label>
        <textarea
            v-model="form.role"
            rows="2"
            placeholder="e.g. Protects from feeling shame"
            class="cbt-input"
        ></textarea>
      </div>

      <div>
        <label class="block text-[14px] font-medium text-[#3f4754] mb-1">
          Related Parts
        </label>
        <input
            v-model="form.relatedParts"
            type="text"
            placeholder="e.g. Exile, Caretaker"
            class="cbt-input"
        />
      </div>
    </div>

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
        Save
      </button>
    </div>
  </div>
</template>

<script setup>
import { reactive } from 'vue'

const emit = defineEmits(['save', 'generate-insight'])

const form = reactive({
  partName: '',
  role: '',
  relatedParts: ''
})

function save() {
  const clientId = JSON.parse(localStorage.getItem('helio_selectedClient'))?.id
  if (!clientId) {
    alert('No client selected — please select a client first.')
    return
  }

  const all = JSON.parse(localStorage.getItem('helio_toolData')) || {}
  all[`${clientId}_parts-map`] = { ...form, savedAt: new Date().toISOString() }
  localStorage.setItem('helio_toolData', JSON.stringify(all))

  alert('Parts Map saved for this client!')
  window.dispatchEvent(new CustomEvent('tool-saved'))

  emit('save', { tool: 'ifs_parts-map', clientId, form })
}

function generateInsight() {
  const clientId = JSON.parse(localStorage.getItem('helio_selectedClient'))?.id
  if (!clientId) {
    alert('No client selected — please select a client first.')
    return
  }

  const payload = { tool: 'ifs_parts-map', clientId, form }
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
