<!-- src/components/tools/ThoughtRecord.vue -->
<template>
  <div class="p-6 bg-white rounded-lg shadow-sm border border-[#d9dce1] max-w-3xl mx-auto">
    <header class="mb-6">
      <h2 class="text-[18px] font-semibold text-[#2c3e50]">CBT Thought Record</h2>
      <p class="text-[13px] text-slate-500 mt-1">Identify and challenge unhelpful thoughts</p>
    </header>

    <div class="space-y-4">
      <!-- Fields -->
      <div>
        <label class="block text-[14px] font-medium text-[#3f4754] mb-1">Situation / Trigger</label>
        <textarea v-model="form.situation" rows="2" class="cbt-input"></textarea>
      </div>

      <div>
        <label class="block text-[14px] font-medium text-[#3f4754] mb-1">Automatic Thought(s)</label>
        <textarea v-model="form.automaticThoughts" rows="2" class="cbt-input"></textarea>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="block text-[14px] font-medium text-[#3f4754] mb-1">Emotion(s)</label>
          <input v-model="form.emotions" type="text" class="cbt-input" placeholder="e.g. anxious, frustrated" />
        </div>
        <div>
          <label class="block text-[14px] font-medium text-[#3f4754] mb-1">Intensity (0–100%)</label>
          <input v-model="form.intensity" type="number" min="0" max="100" class="cbt-input" />
        </div>
      </div>

      <div>
        <label class="block text-[14px] font-medium text-[#3f4754] mb-1">Evidence For</label>
        <textarea v-model="form.evidenceFor" rows="2" class="cbt-input"></textarea>
      </div>

      <div>
        <label class="block text-[14px] font-medium text-[#3f4754] mb-1">Evidence Against</label>
        <textarea v-model="form.evidenceAgainst" rows="2" class="cbt-input"></textarea>
      </div>

      <div>
        <label class="block text-[14px] font-medium text-[#3f4754] mb-1">Balanced Thought</label>
        <textarea v-model="form.balancedThought" rows="2" class="cbt-input"></textarea>
      </div>

      <!-- Buttons -->
      <div class="flex justify-between items-center pt-3">
        <button
            v-on:click="generateInsight"
            class="px-4 py-2 bg-[#2563eb] text-white rounded-md hover:bg-[#1d4ed8] text-[14px]"
        >
          💡 Generate Insight
        </button>
        <button
            v-on:click="save"
            class="px-4 py-2 bg-[#3f4754] text-white rounded-md hover:bg-[#2f3540] text-[14px]"
        >
          💾 Save
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, watch } from 'vue'

const props = defineProps({
  sessionId: { type: String, default: null }
})
const emit = defineEmits(['save', 'generate-insight'])

const client = JSON.parse(localStorage.getItem('helio_selectedClient'))
const clientId = client?.id

// --- Reactive form state ---
const form = reactive({
  situation: '',
  automaticThoughts: '',
  emotions: '',
  intensity: '',
  evidenceFor: '',
  evidenceAgainst: '',
  balancedThought: ''
})

// --- Auto-load saved data for client ---
const key = `thoughtRecord_${clientId || 'default'}`
const saved = localStorage.getItem(key)
if (saved) Object.assign(form, JSON.parse(saved))

// --- Save function ---
function save() {
  if (!clientId) return alert('No client selected.')
  localStorage.setItem(key, JSON.stringify(form))
  emit('save', { ...form, sessionId: props.sessionId })
  alert('Thought record saved for this client.')
}

// --- AI Insight function ---
function generateInsight() {
  if (!clientId) return alert('No client selected.')
  emit('generate-insight', { tool: 'cbt_thought', clientId, form })
}
</script>

<style scoped>
.cbt-input {
  @apply w-full border border-[#d9dce1] rounded-md px-3 py-2 text-[14px] focus:outline-none focus:ring-2 focus:ring-[#a8b0c1] bg-[#fafbfc];
}
</style>
