<!-- src/components/tools/CBTToolLoader.vue -->
<template>
  <div class="p-6 text-ink-secondary max-w-4xl mx-auto">
    <!-- Header -->
    <div class="flex items-center justify-between mb-5">
      <div>
        <h2 class="text-h3 font-semibold text-ink">
          CBT — {{ readableName }}
        </h2>
        <p class="text-body-sm text-ink-muted mt-0.5">
          Cognitive Behavioural Therapy Worksheet
        </p>
        <p v-if="selectedClient" class="mt-1 text-body-sm text-ink-secondary italic">
          Working with: <span class="font-semibold">{{ selectedClient.name }}</span>
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

    <!-- Dynamic template loader -->
    <div v-if="currentComponent">
      <component
          v-bind:is="currentComponent"
          v-on:save="handleSave"
          v-on:share="handleShare"
          v-on:generate-insight="forwardInsight"
      />
    </div>

    <div v-else class="text-body text-ink-muted italic">
      Select a CBT template from the sidebar to begin.
    </div>
  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue'

/* ✅ Only one defineProps and one defineEmits */
const props = defineProps({
  template: { type: String, default: null },
  selectedClient: { type: Object, default: null }
})

const emit = defineEmits(['close', 'save', 'share', 'generate-insight'])

// Lazy import map — all CBT tools are in the same folder
const loaders = {
  thought: () => import('./ThoughtRecord.vue'),
  behavioural: () => import('./BehaviouralActivation.vue'),
  core: () => import('./CoreBelief.vue'),
  exposure: () => import('./ExposureHierarchy.vue'),
  problem: () => import('./ProblemSolving.vue')
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
    thought: 'Thought Record',
    behavioural: 'Behavioural Activation',
    core: 'Core Belief Worksheet',
    exposure: 'Exposure Hierarchy',
    problem: 'Problem Solving'
  }
  return names[props.template] || 'CBT Tool'
})

function handleSave(data) {
  emit('save', { template: props.template, data })
}

function handleShare(data) {
  emit('share', { template: props.template, data })
}

function forwardInsight(payload) {
  console.log('🔄 Forwarding insight event...', payload)
  emit('generate-insight', payload)
}

function goBack() {
  emit('close')
}

</script>

