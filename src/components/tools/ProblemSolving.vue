<!-- src/components/tools/ProblemSolving.vue -->
<template>
  <div class="p-6 bg-surface-elevated rounded-panel  border border-border max-w-3xl mx-auto">
    <h2 class="text-h3 font-semibold text-ink mb-2">Problem Solving</h2>
    <p class="text-body text-ink-secondary mb-4">
      Define the problem, explore solutions, and plan practical next steps.
    </p>

    <div class="space-y-4">
      <div>
        <label class="block text-body font-medium text-ink-secondary mb-1">
          Problem Description
        </label>
        <textarea v-model="form.problem" rows="2" class="cbt-input"></textarea>
      </div>

      <div>
        <label class="block text-body font-medium text-ink-secondary mb-1">
          Possible Solutions
        </label>
        <textarea v-model="form.solutions" rows="2" class="cbt-input"></textarea>
      </div>

      <div>
        <label class="block text-body font-medium text-ink-secondary mb-1">
          Pros and Cons
        </label>
        <textarea v-model="form.prosCons" rows="2" class="cbt-input"></textarea>
      </div>

      <div>
        <label class="block text-body font-medium text-ink-secondary mb-1">
          Chosen Solution
        </label>
        <textarea v-model="form.chosenSolution" rows="2" class="cbt-input"></textarea>
      </div>

      <div>
        <label class="block text-body font-medium text-ink-secondary mb-1">
          Action Plan
        </label>
        <textarea v-model="form.actionPlan" rows="2" class="cbt-input"></textarea>
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
  problem: '',
  solutions: '',
  prosCons: '',
  chosenSolution: '',
  actionPlan: ''
})

function save() {
  emit('save', { ...form, sessionId: props.sessionId })
}

function generateInsight() {
  const payload = { tool: 'cbt_problem', clientId, form }
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

