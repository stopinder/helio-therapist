<!-- src/components/tools/SelfEnergy.vue -->
<template>
  <div class="p-6 bg-surface-elevated rounded-panel  border border-border max-w-3xl mx-auto">
    <h2 class="text-h3 font-semibold text-ink mb-3">Self-Energy Exercise</h2>
    <p class="text-body text-ink-secondary mb-4">
      Reflect on Self-Energy qualities such as calm, curiosity, compassion, and clarity.
      Use this space to note what you observe or feel during the exercise.
    </p>

    <!-- Reflection form -->
    <div class="space-y-3">
      <div>
        <label class="block text-body font-medium text-ink-secondary mb-1">Date / Context</label>
        <input
            v-model="form.context"
            type="text"
            placeholder="Session date or context"
            class="cbt-input"
        />
      </div>

      <div>
        <label class="block text-body font-medium text-ink-secondary mb-1">Reflections</label>
        <textarea
            v-model="form.reflections"
            rows="4"
            placeholder="Describe how Self-energy was experienced or accessed..."
            class="cbt-input"
        ></textarea>
      </div>

      <div>
        <label class="block text-body font-medium text-ink-secondary mb-1">Qualities Present</label>
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
          class="px-4 py-2 bg-action-link text-on-action rounded-control hover:bg-action-link-hover text-body"
      >
        Generate Insight
      </button>
      <button
          v-on:click="save"
          class="px-4 py-2 bg-action-primary text-on-action rounded-control hover:bg-action-primary-hover text-body"
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
  @apply w-full border border-border rounded-control px-3 py-2 text-body
  focus:outline-none focus:ring-2 focus:ring-state-focus-ring bg-surface-subtle;
}
</style>

