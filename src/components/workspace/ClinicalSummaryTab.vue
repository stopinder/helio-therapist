<template>
  <div class="space-y-stack-lg max-w-4xl mx-auto">
    <!-- Preparation State -->
    <div v-if="status === 'not_started'" class="bg-surface-elevated border border-border-muted rounded-panel p-6 shadow-sm">
      <h3 class="text-h3 font-semibold text-ink mb-6">Preparation for Clinical Summary</h3>
      
      <div class="space-y-8">
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
                <StatusBadge v-if="item.available" status="success" label="Available" class="ml-2" />
                <StatusBadge v-else-if="item.required" status="high" label="Required" class="ml-2" />
              </span>
            </div>
          </div>
        </section>

        <section class="p-4 bg-surface-subtle rounded border border-border">
          <div class="flex items-center justify-between mb-2">
            <span class="text-body-sm font-medium text-ink">Workflow Status</span>
            <StatusBadge :status="status" :label="statusLabel" />
          </div>
          <p class="text-caption text-ink-muted">Ready to begin the clinical record workflow.</p>
        </section>

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

          <NoticeBanner 
            message="AI-assisted content must be reviewed and approved by the therapist before it becomes part of the clinical record."
          >
            <p class="text-caption text-ink-muted italic border-t border-border pt-2 mt-2">
              Therapist reflection is private working material and is not automatically included in the clinical record.
            </p>
          </NoticeBanner>
        </div>
      </div>
    </div>

    <!-- Workflow Active states -->
    <div v-else class="space-y-stack-lg">
      <!-- Workflow Indicator -->
      <div class="bg-surface-elevated border border-border-muted rounded-panel p-6 shadow-sm pb-2">
        <div class="flex items-center justify-between mb-2">
          <h2 class="text-h2 font-semibold text-ink editorial-heading" ref="mainHeading">{{ pageTitle }}</h2>
          <StatusBadge :status="status" :label="statusLabel" />
        </div>
        <ClinicalWorkflowIndicator :state="status" />
      </div>

      <!-- Draft & Review Area -->
      <div v-if="['draft', 'ready_for_review'].includes(status)" class="bg-surface-elevated border border-border-muted rounded-panel p-6 shadow-sm">
        <NoticeBanner 
          v-if="status === 'draft'"
          type="info" 
          message="This is a working draft and is not yet part of the clinical record."
          icon="✨"
        >
          <p class="text-caption text-ink-muted italic">Therapist reflection is private working material and is not automatically included.</p>
        </NoticeBanner>

        <!-- Review Panel -->
        <div v-if="status === 'ready_for_review'" class="mb-8 p-6 bg-state-selected border border-action-link/30 rounded-panel">
          <h4 class="text-body-sm font-bold text-action-link uppercase tracking-wider mb-2">Review Summary</h4>
          <p class="text-body-sm text-ink-secondary mb-6">
            Please confirm that this summary accurately represents the session before creating the clinical record.
          </p>
          <div class="space-y-4">
            <label class="flex items-start gap-3 cursor-pointer group">
              <input 
                type="checkbox" 
                v-model="reviewConfirmed"
                class="mt-1 h-4 w-4 rounded border-border text-action-link focus:ring-state-focus-ring"
              >
              <span class="text-body-sm text-ink group-hover:text-action-link transition-colors font-medium">
                I have reviewed this summary.
              </span>
            </label>
            <div class="flex gap-3">
              <button 
                @click="openApprovalDialog"
                :disabled="!reviewConfirmed"
                class="px-inline-lg py-3 bg-action-primary text-on-action text-body-sm font-bold rounded-control hover:bg-action-primary-hover transition-all disabled:opacity-50 shadow-sm"
              >
                Approve Clinical Record
              </button>
              <button 
                @click="status = 'draft'"
                class="px-inline-lg py-3 bg-surface border border-border text-body-sm font-medium text-ink rounded-control hover:bg-state-hover transition-colors"
              >
                Return to Draft
              </button>
            </div>
          </div>
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
              rows="4"
              class="w-full p-3 rounded-control border border-border bg-surface focus:ring-2 focus:ring-action-link focus:border-action-link outline-none transition-all text-body-sm text-ink"
            ></textarea>
          </div>
        </div>

        <!-- Local persistence notice -->
        <NoticeBanner 
          class="mt-8 mb-0"
          message="This demonstration draft is stored only in local UI state and will reset when the page is refreshed."
          icon="📋"
        />

        <div class="mt-8 pt-6 border-t border-border flex justify-end gap-3">
          <p v-if="saveMessage" class="text-caption text-state-success font-medium animate-pulse flex-1 self-center" aria-live="polite">
            {{ saveMessage }}
          </p>
          <button 
            @click="saveDraft"
            class="px-inline-lg py-stack-sm bg-surface-elevated border border-border text-body-sm font-medium text-ink rounded-control hover:bg-surface-subtle transition-colors"
          >
            Save Draft
          </button>
          <button 
            v-if="status === 'draft'"
            @click="markReady"
            class="px-inline-lg py-stack-sm bg-action-link text-on-action text-body-sm font-medium rounded-control hover:bg-action-link-hover transition-colors shadow-sm"
          >
            Mark Ready for Review
          </button>
        </div>
      </div>

      <!-- Approved Record View -->
      <div v-if="status === 'approved_record' || status === 'amendment_approved' || status.startsWith('amendment_')" class="space-y-stack-lg">
        <div class="bg-surface-elevated border border-border-muted rounded-panel p-6 shadow-sm">
          <NoticeBanner 
            type="success"
            message="This approved record is read-only. Corrections must be added through an amendment."
            icon="🔒"
          />

          <ClinicalRecordMetadata 
            :version="1" 
            :timestamp="approvedRecord.timestamp"
          />

          <ApprovedClinicalRecordView 
            :fields="summaryFields"
            :data="approvedRecord.content"
          />

          <!-- Amendment display when approved -->
          <div v-if="status === 'amendment_approved'" class="mt-8 pt-8 border-t-2 border-dashed border-border-muted">
            <h4 class="text-h3 font-semibold text-ink mb-6 flex items-center gap-2">
              <span class="text-action-link">⟳</span> Record Amendment 1
            </h4>
            <div class="space-y-6">
              <div class="space-y-2">
                <h5 class="text-caption font-bold text-ink-muted uppercase tracking-wider">Amendment Reason</h5>
                <div class="p-4 rounded-control border border-border-muted bg-surface-reflection italic text-body-sm text-ink">
                  {{ approvedAmendment.reason }}
                </div>
              </div>
              <div class="space-y-2">
                <h5 class="text-caption font-bold text-ink-muted uppercase tracking-wider">Amendment Content</h5>
                <div class="p-4 rounded-control border border-border-muted bg-surface-subtle text-body-sm text-ink leading-relaxed">
                  {{ approvedAmendment.content }}
                </div>
              </div>
            </div>
            <div class="mt-6 text-caption text-ink-muted">
              Approved by: Robert Ormiston (Mock) • {{ approvedAmendment.timestamp }}
            </div>
          </div>

          <div class="mt-8 pt-6 border-t border-border flex flex-wrap gap-3">
            <button 
              v-if="status === 'approved_record'"
              @click="startAmendment"
              class="px-inline-lg py-stack-sm bg-action-link text-on-action text-body-sm font-medium rounded-control hover:bg-action-link-hover transition-colors shadow-sm"
            >
              Create Record Amendment
            </button>
            <div class="flex-1"></div>
            <button class="px-inline-lg py-stack-sm bg-surface border border-border text-body-sm font-medium text-ink rounded-control hover:bg-state-hover transition-colors">
              Print
            </button>
            <button class="px-inline-lg py-stack-sm bg-surface border border-border text-body-sm font-medium text-ink rounded-control hover:bg-state-hover transition-colors">
              Export PDF
            </button>
          </div>
        </div>

        <!-- Amendment Editor -->
        <div v-if="['amendment_draft', 'amendment_ready_for_review'].includes(status)" class="bg-surface-elevated border border-border-muted rounded-panel p-6 shadow-sm animate-in slide-in-from-bottom-4 duration-300">
          <h3 class="text-h3 font-semibold text-ink mb-6">New Record Amendment</h3>
          
          <div v-if="status === 'amendment_ready_for_review'" class="mb-8 p-6 bg-state-selected border border-action-link/30 rounded-panel">
            <h4 class="text-body-sm font-bold text-action-link uppercase tracking-wider mb-2">Review Amendment</h4>
            <div class="space-y-4">
              <label class="flex items-start gap-3 cursor-pointer group">
                <input 
                  type="checkbox" 
                  v-model="reviewConfirmed"
                  class="mt-1 h-4 w-4 rounded border-border text-action-link focus:ring-state-focus-ring"
                >
                <span class="text-body-sm text-ink group-hover:text-action-link transition-colors font-medium">
                  I have reviewed this amendment and confirm it should be appended to the clinical record.
                </span>
              </label>
              <div class="flex gap-3">
                <button 
                  @click="approveAmendment"
                  :disabled="!reviewConfirmed"
                  class="px-inline-lg py-3 bg-action-primary text-on-action text-body-sm font-bold rounded-control hover:bg-action-primary-hover transition-all disabled:opacity-50 shadow-sm"
                >
                  Approve Amendment
                </button>
                <button 
                  @click="status = 'amendment_draft'"
                  class="px-inline-lg py-3 bg-surface border border-border text-body-sm font-medium text-ink rounded-control hover:bg-state-hover transition-colors"
                >
                  Return to Amendment Draft
                </button>
              </div>
            </div>
          </div>

          <div class="space-y-6">
            <div class="space-y-2">
              <label for="amendment-reason" class="text-body-sm font-bold text-ink uppercase tracking-wider">Amendment Reason</label>
              <textarea
                id="amendment-reason"
                v-model="amendmentData.reason"
                :disabled="status === 'amendment_ready_for_review'"
                rows="2"
                class="w-full p-3 rounded-control border border-border bg-surface-reflection focus:ring-2 focus:ring-state-reflection-focus outline-none transition-all text-body-sm text-ink"
                placeholder="Reason for this amendment (e.g., factual correction, additional context)..."
              ></textarea>
            </div>
            <div class="space-y-2">
              <label for="amendment-content" class="text-body-sm font-bold text-ink uppercase tracking-wider">Amendment Content</label>
              <textarea
                id="amendment-content"
                v-model="amendmentData.content"
                :disabled="status === 'amendment_ready_for_review'"
                rows="6"
                class="w-full p-3 rounded-control border border-border bg-surface focus:ring-2 focus:ring-action-link outline-none transition-all text-body-sm text-ink"
                placeholder="Enter the amendment content here..."
              ></textarea>
            </div>
          </div>

          <div class="mt-8 pt-6 border-t border-border flex justify-end gap-3">
            <button 
              @click="saveDraft"
              class="px-inline-lg py-stack-sm bg-surface-elevated border border-border text-body-sm font-medium text-ink rounded-control hover:bg-surface-subtle transition-colors"
            >
              Save Amendment Draft
            </button>
            <button 
              v-if="status === 'amendment_draft'"
              @click="status = 'amendment_ready_for_review'"
              class="px-inline-lg py-stack-sm bg-action-link text-on-action text-body-sm font-medium rounded-control hover:bg-action-link-hover transition-colors shadow-sm"
            >
              Mark Amendment Ready for Review
            </button>
          </div>
        </div>

        <!-- Record History -->
        <RecordHistoryPanel :history="recordHistory" />
      </div>
    </div>

    <!-- Approval Confirmation Dialog -->
    <ApprovalConfirmationDialog 
      :isOpen="isApprovalDialogOpen"
      title="Create Clinical Record"
      message="You are about to approve the clinical summary for this session."
      @confirm="confirmApproval"
      @close="isApprovalDialogOpen = false"
    />
  </div>
</template>

<script setup>
import { ref, reactive, computed, nextTick } from 'vue';
import StatusBadge from './StatusBadge.vue';
import ClinicalWorkflowIndicator from './ClinicalWorkflowIndicator.vue';
import ClinicalRecordMetadata from './ClinicalRecordMetadata.vue';
import RecordHistoryPanel from './RecordHistoryPanel.vue';
import ApprovalConfirmationDialog from './ApprovalConfirmationDialog.vue';
import ApprovedClinicalRecordView from './ApprovedClinicalRecordView.vue';
import NoticeBanner from './NoticeBanner.vue';

const status = ref('not_started');
const saveMessage = ref('');
const firstField = ref(null);
const mainHeading = ref(null);
const reviewConfirmed = ref(false);
const isApprovalDialogOpen = ref(false);

const checklist = [
  { id: 1, label: 'Session Transcript', available: true, required: true },
  { id: 2, label: 'Therapist Notes', available: true, required: true },
  { id: 3, label: 'Therapist Reflection', available: true, required: false },
  { id: 4, label: 'Client Feedback', available: false, required: false }
];

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

const amendmentData = reactive({
  reason: '',
  content: ''
});

// Snapshot storage
const approvedRecord = reactive({
  timestamp: '',
  content: {}
});

const approvedAmendment = reactive({
  timestamp: '',
  reason: '',
  content: ''
});

const recordHistory = computed(() => {
  const history = [];
  
  if (status.value === 'approved_record' || status.value === 'amendment_draft' || status.value === 'amendment_ready_for_review' || status.value === 'amendment_approved') {
    history.push({
      title: 'Version 1',
      status: 'approved_record',
      statusLabel: 'Approved',
      author: 'Robert Ormiston',
      approvedDate: approvedRecord.timestamp
    });
  }

  if (status.value === 'amendment_draft') {
    history.push({
      title: 'Amendment 1',
      status: 'amendment_draft',
      statusLabel: 'Draft',
      author: 'Robert Ormiston',
      createdDate: new Date().toLocaleString()
    });
  } else if (status.value === 'amendment_ready_for_review') {
    history.push({
      title: 'Amendment 1',
      status: 'amendment_ready_for_review',
      statusLabel: 'Ready for Review',
      author: 'Robert Ormiston',
      createdDate: new Date().toLocaleString()
    });
  } else if (status.value === 'amendment_approved') {
    history.push({
      title: 'Amendment 1',
      status: 'amendment_approved',
      statusLabel: 'Approved',
      author: 'Robert Ormiston',
      approvedDate: approvedAmendment.timestamp,
      reason: approvedAmendment.reason
    });
  }

  return history;
});

const canPrepareDraft = computed(() => {
  return checklist
    .filter(item => item.required)
    .every(item => item.available) && status.value === 'not_started';
});

const missingRequiredSources = computed(() => {
  return checklist
    .filter(item => item.required && !item.available)
    .map(item => item.label)
    .join(', ');
});

const statusLabel = computed(() => {
  switch (status.value) {
    case 'not_started': return 'Not Started';
    case 'draft': return 'Draft';
    case 'ready_for_review': return 'Ready for Review';
    case 'approved_record': return 'Approved';
    case 'amendment_draft': return 'Amendment Draft';
    case 'amendment_ready_for_review': return 'Amendment Review';
    case 'amendment_approved': return 'Amendment Approved';
    default: return status.value;
  }
});

const pageTitle = computed(() => {
  switch (status.value) {
    case 'draft': return 'Draft Clinical Summary';
    case 'ready_for_review': return 'Review Clinical Summary';
    case 'approved_record': return 'Clinical Record';
    case 'amendment_draft':
    case 'amendment_ready_for_review':
    case 'amendment_approved': return 'Clinical Record & Amendment';
    default: return 'Clinical Summary';
  }
});

const prepareDraft = () => {
  status.value = 'draft';
  
  // Populate with mock demonstration content
  summaryData.presentingConcerns = '[DEMO] Client expressed anxiety regarding upcoming performance review at work.';
  summaryData.sessionThemes = '[DEMO] Professional competence, self-criticism, fear of failure.';
  summaryData.interventionsUsed = '[DEMO] Cognitive restructuring, socratic questioning regarding "worst case scenario".';
  summaryData.clientResponse = '[DEMO] Engaged, able to identify two cognitive distortions.';
  summaryData.riskSafeguarding = '[DEMO] No new risk concerns identified. Protective factors remain stable.';
  summaryData.progressGoals = '[DEMO] Working towards reducing workplace anxiety. Progress is consistent.';
  summaryData.planNextSession = '[DEMO] Behavioral experiment review and deepening work on self-compassion.';

  scrollAndFocus();
};

const saveDraft = () => {
  saveMessage.value = 'Draft saved in local demonstration state.';
  setTimeout(() => {
    saveMessage.value = '';
  }, 3000);
};

const markReady = () => {
  status.value = 'ready_for_review';
  scrollAndFocus();
};

const openApprovalDialog = () => {
  isApprovalDialogOpen.value = true;
};

const confirmApproval = () => {
  // Snapshot the content
  approvedRecord.timestamp = new Date().toLocaleString();
  approvedRecord.content = { ...summaryData };
  
  status.value = 'approved_record';
  scrollAndFocus();
};

const startAmendment = () => {
  status.value = 'amendment_draft';
  reviewConfirmed.value = false;
  scrollAndFocus();
};

const approveAmendment = () => {
  approvedAmendment.timestamp = new Date().toLocaleString();
  approvedAmendment.reason = amendmentData.reason;
  approvedAmendment.content = amendmentData.content;
  
  status.value = 'amendment_approved';
  scrollAndFocus();
};

const scrollAndFocus = () => {
  nextTick(() => {
    if (mainHeading.value) {
      mainHeading.value.scrollIntoView({ behavior: 'smooth' });
      mainHeading.value.focus();
    }
    if (status.value === 'draft' && firstField.value && firstField.value[0]) {
      firstField.value[0].focus();
    }
  });
};
</script>

<style scoped>
.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: .5; }
}
</style>
