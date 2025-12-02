<!-- src/components/tools/EMDRToolLoader.vue -->
<template>
  <div class="p-6 text-slate-600 max-w-4xl mx-auto">
    <!-- Header -->
    <div class="flex items-center justify-between mb-5">
      <div>
        <h2 class="text-[18px] font-semibold text-[#2c3e50]">
          EMDR — {{ readableName }}
        </h2>
        <p class="text-[13px] text-slate-500 mt-0.5">
          Eye Movement Desensitization and Reprocessing Tools
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

    <!-- Dynamic tool component -->
    <div v-if="currentComponent">
      <component
          v-bind:is="currentComponent"
          v-on:save="handleSave"
          v-on:generate-insight="forwardInsight"
      />
    </div>

    <div v-else class="text-[14px] text-slate-500 italic">
      Select an EMDR tool from the sidebar to begin.
    </div>
  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue'

const props = defineProps({
  template: { type: String, default: null }
})

const emit = defineEmits(['close', 'save', 'generate-insight'])

const loaders = {
  'target-log': () => import('./TargetLog.vue'),
  'cognitive': () => import('./CognitiveInterweave.vue')
}

const currentComponent = ref(null)

watch(
    () => props.template,
    async (name) => {
      if (!name) {
        currentComponent.value = null
        return
      }
      const loader = loaders[name]
      if (!loader) {
        currentComponent.value = null
        return
      }
      const mod = await loader()
      currentComponent.value = mod.default
    },
    { immediate: true }
)

const readableName = computed(() => {
  const names = {
    'target-log': 'Target Log',
    'cognitive': 'Cognitive Interweave'
  }
  return names[props.template] || 'EMDR Tool'
})

function handleSave(data) {
  emit('save', { template: props.template, data })
}

function forwardInsight(payload) {
  console.log('🔄 Forwarding EMDR insight event...', payload)
  emit('generate-insight', payload)
}

function goBack() {
  emit('close')
}
</script>
