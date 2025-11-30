<template>
  <div class="p-6 text-slate-600">
    <!-- When no template selected -->
    <div v-if="!template">
      <h2 class="text-lg font-semibold mb-3">CBT Tools</h2>
      <p>Select a CBT template from the sidebar to begin.</p>
    </div>

    <!-- When a template is selected -->
    <component
        v-else
        :is="currentComponent"
    />
  </div>
</template>

<script setup>
// ✅ Import all CBT templates
import ThoughtRecord from './cbt/ThoughtRecord.vue'
import BehaviouralActivation from './cbt/BehaviouralActivation.vue'
import CoreBelief from './cbt/CoreBelief.vue'
import ExposureHierarchy from './cbt/ExposureHierarchy.vue'
import ProblemSolving from './cbt/ProblemSolving.vue'

// Props received from App.vue
const props = defineProps({
  template: String
})

// Choose the correct component
const templates = {
  thought: ThoughtRecord,
  behavioural: BehaviouralActivation,
  core: CoreBelief,
  exposure: ExposureHierarchy,
  problem: ProblemSolving
}

const currentComponent = computed(() => templates[props.template])
</script>
