<template>
  <div class="flex gap-inline-md group relative">
    <!-- Icon/Timeline Line -->
    <div class="flex flex-col items-center">
      <div 
        class="w-8 h-8 rounded-pill flex items-center justify-center shrink-0 z-10 border transition-all duration-200"
        :class="typeClasses.icon"
      >
        <span class="text-lg">{{ presentation.icon }}</span>
      </div>
      <div v-if="!isLast" class="w-0.5 h-full bg-border-muted -mt-1 group-last:hidden"></div>
    </div>

    <!-- Content -->
    <div class="flex-1 pb-stack-lg">
      <div class="flex justify-between items-start mb-1">
        <h4 class="text-body-sm font-bold text-ink">{{ presentation.detail }}</h4>
        <span class="text-caption font-medium text-ink-subtle uppercase tracking-wider">{{ date }}</span>
      </div>
      <div 
        @click="handleClick"
        class="p-inline-md bg-surface-elevated border border-border-muted rounded-control shadow-sm transition-colors duration-200"
        :class="[isNavigatable ? 'hover:border-action-link cursor-pointer' : 'group-hover:border-border-muted']"
      >
        <p class="text-body-sm text-ink-secondary">{{ description }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { timelineEventPresentation } from '../../lib/clinicalExchange.js';

const props = defineProps({
  eventType: {
    type: String,
    required: true
  },
  date: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  subjectType: {
    type: String,
    default: null
  },
  subjectId: {
    type: String,
    default: null
  },
  sessionId: {
    type: String,
    default: null
  },
  isLast: {
    type: Boolean,
    default: false
  }
});

const router = useRouter();
const route = useRoute();

const presentation = computed(() => timelineEventPresentation(props.eventType));

const isNavigatable = computed(() => {
  return (props.subjectType === 'session' || props.eventType === 'session_completed') && 
         (props.subjectId || props.sessionId);
});

const typeClasses = computed(() => {
  const t = props.eventType;
  const classes = {
    session_completed: 'bg-state-success-surface text-state-success border-state-success/20',
    outcome_measure_recorded: 'bg-state-warning-surface text-state-warning border-state-warning/20',
    risk_assessment_recorded: 'bg-state-error-surface text-state-error border-state-error/20',
    referral_recorded: 'bg-state-selected text-action-link border-action-link/20',
    diagnosis_updated: 'bg-surface-subtle text-ink-secondary border-border',
    treatment_plan_updated: 'bg-surface-subtle text-ink-secondary border-border',
    clinical_milestone: 'bg-surface-muted text-ink-secondary border-border'
  };
  
  return { 
    icon: classes[t] || 'bg-surface-subtle text-ink-muted border-border'
  };
});

function handleClick() {
  if (isNavigatable.value) {
    const sId = props.subjectId || props.sessionId;
    const cId = route.params.clientId;
    if (cId && sId) {
      router.push(`/clients/${cId}/sessions/${sId}`);
    }
  }
}
</script>
