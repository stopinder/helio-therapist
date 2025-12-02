<!-- src/components/tools/BehaviouralActivation.vue -->
<template>
  <div class="p-6 bg-white rounded-lg shadow-sm border border-[#d9dce1] max-w-3xl mx-auto">
    <h2 class="text-[18px] font-semibold text-[#2c3e50] mb-2">Behavioural Activation</h2>
    <p class="text-[14px] text-slate-600 mb-4">
      Identify and plan meaningful, mood-boosting activities.
    </p>

    <div class="space-y-4">
      <div>
        <label class="block text-[14px] font-medium text-[#3f4754] mb-1">
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
        <label class="block text-[14px] font-medium text-[#3f4754] mb-1">
          Predicted Mood (0–100%)
        </label>
        <input v-model="form.predictedMood" type="number" min="0" max="100" class="cbt-input" />
      </div>

      <div>
        <label class="block text-[14px] font-medium text-[#3f4754] mb-1">
          Notes
        </label>
        <textarea v-model="form.notes" rows="2" class="cbt-input"></textarea>
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
  @apply w-full border border-[#d9dce1] rounded-md px-3 py-2 text-[14px]
  focus:outline-none focus:ring-2 focus:ring-[#a8b0c1] bg-[#fafbfc];
}
</style>
