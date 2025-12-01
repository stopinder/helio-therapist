<!-- src/components/tools/IFSToolLoader.vue -->
<template>
  <div class="p-6 text-slate-600 max-w-4xl mx-auto">
    <div class="flex items-center justify-between mb-5">
      <div>
        <h2 class="text-[18px] font-semibold text-[#2c3e50]">
          IFS — {{ readableName }}
        </h2>
        <p class="text-[13px] text-slate-500 mt-0.5">
          Internal Family Systems Interactive Tool
        </p>
      </div>
      <button
          class="text-[13px] px-3 py-1.5 rounded-md border border-[#d9dce1]
               text-[#3f4754] bg-white hover:bg-[#f5f7fa] transition"
          v-on:click="goBack"
      >
        ← Back to Workspace
      </button>
    </div>

    <div v-if="currentComponent">
      <component v-bind:is="currentComponent" />
    </div>

    <div v-else class="text-[14px] text-slate-500 italic">
      Select an IFS tool from the sidebar to begin.
    </div>
  </div>
</template>

<script setup>
import { ref, watch, computed, onMounted } from 'vue'

const emit = defineEmits(['close', 'save'])

const props = defineProps({
  template: { type: String, default: null }
})

const loaders = {
  'parts-map': () => import('./PartsMap.vue'),
  'self-energy': () => import('./SelfEnergy.vue')
}

const currentComponent = ref(null)

watch(
    () => props.template,
    async (name) => {
      if (!name) return (currentComponent.value = null)
      const loader = loaders[name]
      if (!loader) return (currentComponent.value = null)
      const mod = await loader()
      currentComponent.value = mod.default
    },
    { immediate: true }
)

const readableName = computed(() => {
  const names = {
    'parts-map': 'Parts Map',
    'self-energy': 'Self-Energy Exercise'
  }
  return names[props.template] || 'IFS Tool'
})

// Save current tool state (e.g., when subcomponent emits data)
function saveToolState(data) {
  const clientId = localStorage.getItem('helio_selectedClientId')
  emit('save', {
    template: props.template || 'ifs-tool',
    data: { clientId, ...data }
  })
}

// Load saved data for the active client/tool when this loader mounts
onMounted(() => {
  const clientId = localStorage.getItem('helio_selectedClientId')
  const allData = JSON.parse(localStorage.getItem('helio_toolData')) || {}
  const key = `${clientId}_${props.template}`
  if (allData[key]) {
    // Optionally, you can pass this to your subcomponent later as a prop
    console.log('Loaded saved IFS data:', allData[key])
  }
})

function goBack() {
  emit('close')
}
</script>

