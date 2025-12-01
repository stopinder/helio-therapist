<!-- src/components/tools/TargetLog.vue -->
<template>
  <div class="p-6 bg-white rounded-lg shadow-sm border border-[#d9dce1] max-w-4xl mx-auto">
    <h2 class="text-[18px] font-semibold text-[#2c3e50] mb-3">EMDR Target Log</h2>
    <p class="text-[14px] text-slate-600 mb-4">
      Track EMDR targets, associated cognitions, and SUD/VOC ratings for each client.
    </p>

    <!-- Add new target -->
    <div class="flex items-center gap-2 mb-4">
      <input
          v-model="newTarget.memory"
          placeholder="Target memory / event"
          class="flex-1 border border-[#d9dce1] rounded-md px-3 py-1.5 text-[14px]"
      />
      <input
          v-model="newTarget.negativeCognition"
          placeholder="Negative cognition"
          class="flex-1 border border-[#d9dce1] rounded-md px-3 py-1.5 text-[14px]"
      />
      <button
          v-on:click="addTarget"
          class="px-3 py-1.5 bg-[#3f4754] text-white rounded-md text-[13px] hover:bg-[#2f3540]"
      >
        Add
      </button>
    </div>

    <!-- Targets list -->
    <ul class="divide-y divide-[#e5e7eb] text-[14px]">
      <li
          v-for="(t, idx) in targets"
          v-bind:key="idx"
          class="py-3"
      >
        <div class="flex justify-between items-start">
          <div class="flex-1">
            <div class="font-semibold text-[#2c3e50]">{{ t.memory }}</div>
            <div class="text-slate-600 text-[13px] mb-1">Neg. Cognition: {{ t.negativeCognition }}</div>

            <div class="grid grid-cols-2 gap-3 mb-2">
              <div>
                <label class="block text-[12px] text-slate-500 mb-0.5">SUD (0–10)</label>
                <input
                    v-model="t.sud"
                    type="number"
                    min="0"
                    max="10"
                    class="w-full border border-[#d9dce1] rounded-md px-2 py-1 text-[13px]"
                />
              </div>
              <div>
                <label class="block text-[12px] text-slate-500 mb-0.5">VOC (1–7)</label>
                <input
                    v-model="t.voc"
                    type="number"
                    min="1"
                    max="7"
                    class="w-full border border-[#d9dce1] rounded-md px-2 py-1 text-[13px]"
                />
              </div>
            </div>

            <textarea
                v-model="t.notes"
                placeholder="Processing notes or observations..."
                rows="2"
                class="w-full border border-[#d9dce1] rounded-md px-2 py-1 text-[13px]"
            ></textarea>
          </div>

          <button
              v-on:click="removeTarget(idx)"
              class="text-[13px] text-red-600 hover:underline ml-3 mt-1"
          >
            ✕
          </button>
        </div>
      </li>
    </ul>

    <!-- Save button -->
    <div class="flex justify-end pt-3">
      <button
          v-on:click="saveTargets"
          class="px-4 py-2 bg-[#3f4754] text-white rounded-md hover:bg-[#2f3540] text-[14px]"
      >
        Save Targets
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const emit = defineEmits(['save'])

const targets = ref([])
const newTarget = ref({
  memory: '',
  negativeCognition: '',
  sud: '',
  voc: '',
  notes: ''
})

function addTarget() {
  if (!newTarget.value.memory.trim()) return
  targets.value.push({ ...newTarget.value })
  newTarget.value = { memory: '', negativeCognition: '', sud: '', voc: '', notes: '' }
}

function removeTarget(index) {
  targets.value.splice(index, 1)
}

function saveTargets() {
  const clientId = localStorage.getItem('helio_selectedClientId')
  emit('save', {
    template: 'target-log',
    data: { clientId, targets: targets.value }
  })
  alert('EMDR Target Log saved for current client.')
}

// Load saved targets for this client
onMounted(() => {
  const clientId = localStorage.getItem('helio_selectedClientId')
  const allData = JSON.parse(localStorage.getItem('helio_toolData')) || {}
  const key = `${clientId}_target-log`
  if (allData[key]) {
    targets.value = allData[key].targets || []
  }
})
</script>
