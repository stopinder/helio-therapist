<!-- src/components/tools/BehaviouralActivation.vue -->
<template>
  <div class="p-6 bg-surface-elevated rounded-panel  border border-border max-w-3xl mx-auto">
    <h2 class="text-h3 font-semibold text-ink mb-2">Behavioural Activation</h2>
    <p class="text-body text-ink-secondary mb-4">
      Identify and plan meaningful, mood-boosting activities.
    </p>

    <div class="space-y-4">
      <div>
        <label class="block text-body font-medium text-ink-secondary mb-1">
          Activity
        </label>
        <input
            v-model="form.activity"
            type="text"
            class="cbt-input"
            placeholder="e.g. go for a walk, call a friend"
        />
      </div>

      <div>
        <label class="block text-body font-medium text-ink-secondary mb-1">
          Predicted Mood (0–100%)
        </label>
        <input v-model="form.predictedMood" type="number" min="0" max="100" class="cbt-input" />
      </div>

      <div>
        <label class="block text-body font-medium text-ink-secondary mb-1">
          Notes
        </label>
        <textarea v-model="form.notes" rows="2" class="cbt-input"></textarea>
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

const props = defineProps({ sessionId: { type: String, default: null } })
const emit = defineEmits(['save', 'generate-insight'])

const clientId = JSON.parse(localStorage.getItem('helio_selectedClient'))?.id

const form = reactive({
  activity: '',
  predictedMood: '',
  notes: ''
})

function save() {
  emit('save', { ...form, sessionId: props.sessionId })
}

function generateInsight() {
  const payload = { tool: 'cbt_behavioural', clientId, form }
  console.log('🔄 Forwarding insight event...', payload)
  emit('generate-insight', payload)
}
</script>

<style scoped>
.cbt-input {
  @apply w-full border border-border rounded-control px-3 py-2 text-body
  focus:outline-none focus:ring-2 focus:ring-state-focus-ring bg-surface-subtle;
}
</style>
