<!-- src/components/tools/PartsMap.vue -->
<template>
  <div class="p-6 bg-surface-elevated rounded-panel  border border-border max-w-3xl mx-auto">
    <h2 class="text-h3 font-semibold text-ink mb-2">IFS Parts Map</h2>
    <p class="text-body text-ink-secondary mb-4">
      Visualize internal parts, roles, and relationships. Interactive mapping coming soon.
    </p>

    <div class="space-y-4">
      <div>
        <label class="block text-body font-medium text-ink-secondary mb-1">
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
        <label class="block text-body font-medium text-ink-secondary mb-1">
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
        <label class="block text-body font-medium text-ink-secondary mb-1">
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
          class="px-4 py-2 bg-action-link text-on-action rounded-control hover:bg-action-link-hover text-body"
      >
        Generate Insight
      </button>
      <button
          v-on:click="save"
          class="px-4 py-2 bg-action-primary text-on-action rounded-control hover:bg-action-primary-hover text-body"
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
  @apply w-full border border-border rounded-control px-3 py-2 text-body
  focus:outline-none focus:ring-2 focus:ring-state-focus-ring bg-surface-subtle;
}
</style>
