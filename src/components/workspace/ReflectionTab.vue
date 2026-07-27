<template>
  <div class="space-y-stack-lg max-w-4xl mx-auto">
    <div class="bg-surface-elevated border border-border-muted rounded-panel p-6 shadow-sm">
      <h3 class="text-h3 font-semibold text-ink mb-6">Therapist Reflection</h3>
      <p class="text-body-sm text-ink-muted mb-8 italic border-l-4 border-state-info pl-4">
        This reflection is private and conceptually separate from the client's clinical record. 
        It is intended for your professional development and supervision preparation.
      </p>

      <div class="grid grid-cols-1 gap-8">
        <div v-for="(label, key) in reflectionFields" :key="key" class="space-y-2">
          <label :for="key" class="text-body-sm font-bold text-ink uppercase tracking-wider flex items-center gap-2">
            {{ label }}
          </label>
          <textarea
            :id="key"
            v-model="reflection[key]"
            rows="3"
            class="w-full p-3 rounded-control border border-border bg-surface focus:ring-2 focus:ring-action-link focus:border-action-link outline-none transition-all text-body-sm text-ink"
            :placeholder="`Reflect on ${label.toLowerCase()}...`"
          ></textarea>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive } from 'vue';

const reflectionFields = {
  stoodOut: 'What stood out in this session?',
  emotionalResponse: 'Therapist emotional response',
  countertransference: 'Possible countertransference',
  uncertainties: 'Uncertainties or sticking points',
  supervisionQuestions: 'Supervision questions',
  nextSession: 'Next session considerations'
};

const reflection = reactive({
  stoodOut: '',
  emotionalResponse: '',
  countertransference: '',
  uncertainties: '',
  supervisionQuestions: '',
  nextSession: ''
});
</script>
