<!-- src/components/tools/ProblemSolving.vue -->
<template>
  <div class="p-6 bg-white rounded-lg shadow-sm border border-[#d9dce1] max-w-3xl mx-auto">
    <h2 class="text-[18px] font-semibold text-[#2c3e50] mb-2">Problem Solving</h2>
    <p class="text-[14px] text-slate-600 mb-4">
      Define the problem, explore solutions, and plan practical next steps.
    </p>

    <div class="space-y-4">
      <div>
        <label class="block text-[14px] font-medium text-[#3f4754] mb-1">
          Problem Description
        </label>
        <textarea v-model="form.problem" rows="2" class="cbt-input"></textarea>
      </div>

      <div>
        <label class="block text-[14px] font-medium text-[#3f4754] mb-1">
          Possible Solutions
        </label>
        <textarea v-model="form.solutions" rows="2" class="cbt-input"></textarea>
      </div>

      <div>
        <label class="block text-[14px] font-medium text-[#3f4754] mb-1">
          Pros and Cons
        </label>
        <textarea v-model="form.prosCons" rows="2" class="cbt-input"></textarea>
      </div>

      <div>
        <label class="block text-[14px] font-medium text-[#3f4754] mb-1">
          Chosen Solution
        </label>
        <textarea v-model="form.chosenSolution" rows="2" class="cbt-input"></textarea>
      </div>

      <div>
        <label class="block text-[14px] font-medium text-[#3f4754] mb-1">
          Action Plan
        </label>
        <textarea v-model="form.actionPlan" rows="2" class="cbt-input"></textarea>
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
  @apply w-full border border-[#d9dce1] rounded-md px-3 py-2 text-[14px]
  focus:outline-none focus:ring-2 focus:ring-[#a8b0c1] bg-[#fafbfc];
}
</style>

