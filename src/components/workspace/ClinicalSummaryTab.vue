<template>
  <div class="space-y-stack-lg max-w-4xl mx-auto">
    <div v-if="status === 'not_generated'" class="bg-surface-elevated border border-border-muted rounded-panel p-6 shadow-sm">
      <h3 class="text-h3 font-semibold text-ink mb-6">Preparation for Clinical Summary</h3>
      
      <div class="space-y-8">
        <!-- Checklist -->
        <section>
          <h4 class="text-body-sm font-bold text-ink uppercase tracking-wider mb-4">Source Material Checklist</h4>
          <div class="space-y-3">
            <div v-for="item in checklist" :key="item.id" class="flex items-center gap-3">
              <div 
                class="w-5 h-5 rounded border flex items-center justify-center text-xs"
                :class="item.available ? 'bg-state-success-surface border-state-success text-state-success' : 'bg-surface-subtle border-border text-ink-muted'"
              >
                {{ item.available ? '✓' : '' }}
              </div>
              <span class="text-body-sm" :class="item.available ? 'text-ink' : 'text-ink-muted'">
                {{ item.label }} 
                <span v-if="item.available" class="text-caption font-medium uppercase ml-2 px-1 bg-state-success-surface rounded">Available</span>
                <span v-else-if="item.required" class="text-caption font-medium uppercase ml-2 px-1 bg-state-danger-surface text-state-danger rounded">Required</span>
              </span>
            </div>
          </div>
        </section>

        <!-- Status -->
        <section class="p-4 bg-surface-subtle rounded border border-border">
          <div class="flex items-center justify-between mb-2">
            <span class="text-body-sm font-medium text-ink">Summary Status</span>
            <StatusBadge :status="status" :label="statusLabel" />
          </div>
          <p class="text-caption text-ink-muted">Generate a draft clinical summary based on the available source material above.</p>
        </section>

        <!-- Action -->
        <div class="flex flex-col gap-4">
          <button 
            @click="prepareDraft"
            :disabled="!canPrepareDraft"
            class="w-full py-3 bg-action-link text-on-action font-medium rounded-control flex items-center justify-center gap-2 transition-all hover:bg-action-link-hover focus-visible:ring-2 focus-visible:ring-state-focus-ring focus-visible:outline-none"
            :class="{ 'opacity-50 cursor-not-allowed': !canPrepareDraft }"
          >
            🪄 Prepare Draft Clinical Summary
          </button>
          
          <div v-if="!canPrepareDraft" class="p-3 bg-state-danger-surface border border-state-danger/20 rounded flex gap-3 text-state-danger">
            <span class="text-xl">⚠️</span>
            <p class="text-caption leading-relaxed">
              Missing required source material: {{ missingRequiredSources }}
            </p>
          </div>

          <div class="p-3 bg-surface border border-border rounded flex gap-3">
            <span class="text-xl">ℹ️</span>
            <div class="space-y-2">
              <p class="text-caption text-ink-secondary leading-relaxed">
                <strong>AI-assisted content must be reviewed and approved by the therapist</strong> before it becomes part of the clinical record. 
                The draft will be generated using only the selected source materials.
              </p>
              <p class="text-caption text-ink-muted italic border-t border-border pt-2">
                Therapist reflection is private working material and is not automatically included in the clinical record.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Editor Mode -->
    <div v-else class="space-y-stack-lg">
      <div class="bg-surface-elevated border border-border-muted rounded-panel p-6 shadow-sm">
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-h3 font-semibold text-ink">Clinical Summary Review</h3>
          <StatusBadge :status="status" :label="statusLabel" />
        </div>

        <!-- Notification for draft status -->
        <div v-if="status === 'draft' && showDraftNotice" class="mb-6 p-3 bg-state-selected text-action-link border border-action-link/20 rounded flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="text-lg">✨</span>
            <span class="text-body-sm font-medium">Mock draft prepared for therapist review.</span>
          </div>
          <button @click="showDraftNotice = false" class="text-ink-muted hover:text-ink">✕</button>
        </div>

        <!-- Local persistence notice -->
        <div class="mb-6 p-3 bg-surface-muted border border-border rounded flex gap-3">
          <span class="text-lg">📋</span>
          <p class="text-caption text-ink-secondary leading-relaxed">
            This demonstration draft is stored only in local UI state and will reset when the page is refreshed.
          </p>
        </div>

        <!-- Editor Fields -->
        <div class="grid grid-cols-1 gap-6">
          <div v-for="(label, key) in summaryFields" :key="key" class="space-y-2">
            <label :for="key" class="text-body-sm font-bold text-ink uppercase tracking-wider">
              {{ label }}
            </label>
            <textarea
              ref="firstField"
              :id="key"
              v-model="summaryData[key]"
              :disabled="status === 'approved'"
              rows="4"
              class="w-full p-3 rounded-control border border-border bg-surface focus:ring-2 focus:ring-action-link focus:border-action-link outline-none transition-all text-body-sm text-ink disabled:opacity-75 disabled:bg-surface-subtle"
            ></textarea>
          </div>
        </div>

        <!-- Footer Actions -->
        <div class="mt-8 pt-6 border-t border-border flex flex-wrap gap-4">
          <div class="flex-1 min-w-[200px]">
            <p v-if="saveMessage" class="text-caption text-state-success font-medium animate-pulse" aria-live="polite">
              {{ saveMessage }}
            </p>
          </div>
          
          <div class="flex gap-inline-md">
            <button 
              v-if="status === 'draft' || status === 'ready_for_review'"
              @click="saveDraft"
              class="px-inline-lg py-stack-sm bg-surface-elevated border border-border text-body-sm font-medium text-ink rounded-control hover:bg-surface-subtle transition-colors"
            >
              Save Draft
            </button>
            <button 
              v-if="status === 'draft'"
              @click="markReady"
              class="px-inline-lg py-stack-sm bg-action-link text-on-action text-body-sm font-medium rounded-control hover:bg-action-link-hover transition-colors"
            >
              Mark Ready for Review
            </button>
            <button 
              v-if="status === 'ready_for_review' || status === 'approved'"
              @click="approveSummary"
              :disabled="status === 'approved'"
              class="px-inline-lg py-stack-sm bg-state-success text-on-action text-body-sm font-medium rounded-control hover:opacity-90 transition-colors disabled:opacity-50"
            >
              {{ status === 'approved' ? 'Approved' : 'Approve Clinical Summary' }}
            </button>
            <button 
              v-if="status === 'approved'"
              @click="createAmendment"
              class="px-inline-lg py-stack-sm bg-surface-elevated border border-border text-body-sm font-medium text-action-link rounded-control hover:bg-surface-subtle transition-colors"
            >
              Create Amendment
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, nextTick } from 'vue';
import StatusBadge from './StatusBadge.vue';

const status = ref('not_generated');
const showDraftNotice = ref(false);
const saveMessage = ref('');
const firstField = ref(null);

const checklist = [
  { id: 1, label: 'Session Transcript', available: true, required: true },
  { id: 2, label: 'Therapist Notes', available: true, required: true },
  { id: 3, label: 'Therapist Reflection', available: true, required: false },
  { id: 4, label: 'Client Feedback', available: false, required: false }
];

const canPrepareDraft = computed(() => {
  return checklist
    .filter(item => item.required)
    .every(item => item.available) && status.value === 'not_generated';
});

const missingRequiredSources = computed(() => {
  return checklist
    .filter(item => item.required && !item.available)
    .map(item => item.label)
    .join(', ');
});

const statusLabel = computed(() => {
  switch (status.value) {
    case 'not_generated': return 'Not Generated';
    case 'draft': return 'Draft';
    case 'ready_for_review': return 'Ready for Review';
    case 'approved': return 'Approved';
    case 'amended': return 'Amended';
    default: return status.value;
  }
});

const summaryFields = {
  presentingConcerns: 'Presenting concerns',
  sessionThemes: 'Session themes',
  interventionsUsed: 'Interventions used',
  clientResponse: 'Client response',
  riskSafeguarding: 'Risk and safeguarding',
  progressGoals: 'Progress toward goals',
  planNextSession: 'Plan for next session'
};

const summaryData = reactive({
  presentingConcerns: '',
  sessionThemes: '',
  interventionsUsed: '',
  clientResponse: '',
  riskSafeguarding: '',
  progressGoals: '',
  planNextSession: ''
});

const prepareDraft = () => {
  status.value = 'draft';
  showDraftNotice.value = true;
  
  // Populate with mock demonstration content
  summaryData.presentingConcerns = '[DEMO] Client expressed anxiety regarding upcoming performance review at work.';
  summaryData.sessionThemes = '[DEMO] Professional competence, self-criticism, fear of failure.';
  summaryData.interventionsUsed = '[DEMO] Cognitive restructuring, socratic questioning regarding "worst case scenario".';
  summaryData.clientResponse = '[DEMO] Engaged, able to identify two cognitive distortions.';
  summaryData.riskSafeguarding = '[DEMO] No new risk concerns identified. Protective factors remain stable.';
  summaryData.progressGoals = '[DEMO] Working towards reducing workplace anxiety. Progress is consistent.';
  summaryData.planNextSession = '[DEMO] Behavioral experiment review and deepening work on self-compassion.';

  nextTick(() => {
    if (firstField.value && firstField.value[0]) {
      firstField.value[0].focus();
    }
  });
};

const saveDraft = () => {
  saveMessage.value = 'Draft saved in local demonstration state.';
  setTimeout(() => {
    saveMessage.value = '';
  }, 3000);
};

const markReady = () => {
  status.value = 'ready_for_review';
};

const approveSummary = () => {
  status.value = 'approved';
};

const createAmendment = () => {
  status.value = 'amended';
  // In a real app, this would create a new record, here we just change status for demo
};
</script>
