<!-- src/components/tools/EMDRToolLoader.vue -->
<template>
  <div class="p-6 text-ink-secondary max-w-4xl mx-auto">
    <!-- Header -->
    <div class="flex items-center justify-between mb-5">
      <div>
        <h2 class="text-h3 font-semibold text-ink">
          EMDR — {{ readableName }}
        </h2>
        <p class="text-body-sm text-ink-muted mt-0.5">
          Eye Movement Desensitization and Reprocessing Tools
        </p>
      </div>
      <button
          class="text-body-sm px-3 py-1.5 rounded-control border border-border
               text-ink-secondary bg-surface-elevated hover:bg-surface-subtle transition-colors duration-standard ease-out"
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

    <div v-else class="text-body text-ink-muted italic">
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
