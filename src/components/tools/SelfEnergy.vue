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
            class="w-full border border-[#d9dce1] rounded-md px-3 py-2 text-[14px]"
        />
      </div>

      <div>
        <label class="block text-[14px] font-medium text-[#3f4754] mb-1">Reflections</label>
        <textarea
            v-model="form.reflections"
            rows="4"
            placeholder="Describe how Self-energy was experienced or accessed..."
            class="w-full border border-[#d9dce1] rounded-md px-3 py-2 text-[14px]"
        ></textarea>
      </div>

      <div>
        <label class="block text-[14px] font-medium text-[#3f4754] mb-1">Qualities Present</label>
        <input
            v-model="form.qualities"
            type="text"
            placeholder="e.g., Calm, Curiosity, Courage, Clarity"
            class="w-full border border-[#d9dce1] rounded-md px-3 py-2 text-[14px]"
        />
      </div>
    </div>

    <!-- Save button -->
    <div class="flex justify-end pt-4">
      <button
          v-on:click="saveExercise"
          class="px-4 py-2 bg-[#3f4754] text-white rounded-md hover:bg-[#2f3540] text-[14px]"
      >
        Save Reflection
      </button>
    </div>
  </div>
</template>

<script setup>
import { reactive, onMounted } from 'vue'

const emit = defineEmits(['save'])

const form = reactive({
  context: '',
  reflections: '',
  qualities: ''
})

function saveExercise() {
  const clientId = localStorage.getItem('helio_selectedClientId')
  emit('save', {
    template: 'self-energy',
    data: { clientId, ...form }
  })
  alert('Self-Energy reflection saved for current client.')
}

onMounted(() => {
  const clientId = JSON.parse(localStorage.getItem('helio_selectedClient'))?.id

  const allData = JSON.parse(localStorage.getItem('helio_toolData')) || {}
  const key = `${clientId}_self-energy`
  if (allData[key]) {
    Object.assign(form, allData[key])
  }
})
</script>
