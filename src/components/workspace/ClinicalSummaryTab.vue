<template>
  <div class="space-y-stack-lg max-w-4xl mx-auto" data-testid="clinical-summary-workspace">
    <!-- Preparation State -->
    <div v-if="status === 'not_started'" class="bg-surface-elevated border border-border-muted rounded-panel p-6 shadow-sm">
      <h3 class="text-h3 font-semibold text-ink mb-6">Prepare Clinical Record</h3>
      
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
          <p class="text-caption text-ink-muted">{{ reviewedCapture ? 'Your reviewed Session Capture is available as working source material. Choose what to carry into this separate Clinical Record draft.' : 'No reviewed Session Capture is available yet. You can return to Session Capture or begin an empty therapist-authored draft.' }}</p>
        </section>

        <section v-if="reviewedCapture" class="rounded-panel border border-state-info/20 bg-state-info/10 p-4">
          <p class="text-caption font-semibold uppercase tracking-wider text-state-info">Reviewed Session Capture · AI-assisted source</p>
          <h4 class="mt-1 text-body font-semibold text-ink">Clinical suggestions are ready to use</h4>
          <p class="mt-1 text-body-sm text-ink-secondary">These remain editable working suggestions. Starting a draft does not approve the Clinical Record.</p>
          <div class="mt-4 grid gap-3">
            <label v-for="(label, key) in summaryFields" :key="key" class="flex items-start gap-3 text-body-sm text-ink-secondary">
              <input v-model="selectedCaptureFields" type="checkbox" :value="key" class="mt-1 h-4 w-4 rounded border-border text-action-link focus:ring-state-focus-ring" />
              <span><strong class="font-medium text-ink">{{ label }}</strong><span class="block mt-0.5 line-clamp-2">{{ reviewedCapture.content[key] || 'No supported material' }}</span></span>
            </label>
          </div>
        </section>

        <p v-if="captureLoadError" class="text-body-sm text-state-danger" role="alert">{{ captureLoadError }}</p>

        <div class="flex flex-col gap-4">
          <button 
            @click="reviewedCapture ? prepareDraftFromCapture() : prepareDraft()"
            :disabled="!canPrepareDraft"
            class="w-full py-3 bg-action-link text-on-action font-medium rounded-control flex items-center justify-center gap-2 transition-all hover:bg-action-link-hover focus-visible:ring-2 focus-visible:ring-state-focus-ring focus-visible:outline-none"
            :class="{ 'opacity-50 cursor-not-allowed': !canPrepareDraft }"
          >
            {{ reviewedCapture ? 'Prepare draft from reviewed Session Capture' : 'Prepare empty Clinical Record draft' }}
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

        <section v-if="reviewedCapture && status === 'draft'" class="mb-8 rounded-panel border border-state-info/20 bg-state-info/10 p-4">
          <p class="text-caption font-semibold uppercase tracking-wider text-state-info">From reviewed Session Capture</p>
          <p class="mt-1 text-body-sm text-ink-secondary">Use or replace individual draft fields. Session Capture remains separate and unchanged.</p>
          <div class="mt-4 grid gap-3">
            <div v-for="(label, key) in summaryFields" :key="key" class="flex flex-wrap items-start justify-between gap-3 border-t border-state-info/10 pt-3 first:border-0 first:pt-0">
              <div class="min-w-0 flex-1"><p class="text-body-sm font-medium text-ink">{{ label }}</p><p class="mt-0.5 line-clamp-2 text-caption text-ink-muted">{{ reviewedCapture.content[key] || 'No supported material' }}</p></div>
              <button v-if="reviewedCapture.content[key] && summaryData[key] !== reviewedCapture.content[key]" type="button" class="shrink-0 px-3 py-1.5 rounded-control border border-border bg-surface text-caption font-medium text-ink" @click="useCaptureField(key)">{{ summaryData[key] ? 'Replace draft field' : 'Use in draft' }}</button>
              <span v-else-if="reviewedCapture.content[key]" class="text-caption font-medium text-state-success">In draft</span>
            </div>
          </div>
        </section>

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
                :disabled="submitting || !reviewConfirmed"
                class="px-inline-lg py-3 bg-action-primary text-on-action text-body-sm font-bold rounded-control hover:bg-action-primary-hover transition-all disabled:opacity-50 shadow-sm"
              >
                {{ submitting ? 'Processing...' : 'Approve Clinical Record' }}
              </button>
              <button 
                @click="status = 'draft'"
                :disabled="submitting"
                class="px-inline-lg py-3 bg-surface border border-border text-body-sm font-medium text-ink rounded-control hover:bg-state-hover transition-colors disabled:opacity-50"
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
              :disabled="Boolean(activeDictationKey) || Boolean(transcribingKey)"
              class="w-full p-3 rounded-control border border-border bg-surface focus:ring-2 focus:ring-action-link focus:border-action-link outline-none transition-all text-body-sm text-ink disabled:opacity-60"
            ></textarea>
            <div v-if="status === 'draft'" class="flex items-center justify-between gap-3">
              <p v-if="dictationErrorKey === key" class="text-caption text-state-danger" role="alert">{{ dictationError }}</p>
              <span v-else class="text-caption text-ink-muted">Dictation adds editable draft text for you to review before approval.</span>
              <button
                type="button"
                class="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-control border border-border bg-surface text-body-sm font-medium text-ink-secondary hover:bg-surface-subtle disabled:opacity-50"
                :disabled="submitting || (Boolean(activeDictationKey) && activeDictationKey !== key) || (Boolean(transcribingKey) && transcribingKey !== key)"
                :aria-pressed="activeDictationKey === key"
                @click="toggleDictation(key)"
              >
                <span aria-hidden="true">🎙️</span>
                {{ dictationButtonLabel(key) }}
              </button>
            </div>
          </div>
        </div>

        <!-- Legacy Plain Text Display in Editor -->
        <div v-if="legacyNotes" class="mt-8 pt-8 border-t border-border">
          <h4 class="text-caption font-bold text-ink-muted uppercase tracking-wider mb-4">Legacy Session Notes</h4>
          <div class="p-4 rounded-control border border-border bg-surface-muted text-body-sm text-ink whitespace-pre-wrap leading-relaxed">
            {{ legacyNotes }}
          </div>
        </div>

        <!-- Local persistence notice -->
        <NoticeBanner 
          class="mt-8 mb-0"
          message="Your changes are saved as a draft on the session record."
          icon="📋"
        />

        <div class="mt-8 pt-6 border-t border-border flex justify-end gap-3">
          <p v-if="saveMessage" class="text-caption text-state-success font-medium animate-pulse flex-1 self-center" aria-live="polite">
            {{ saveMessage }}
          </p>
          <button 
            @click="saveDraft"
            :disabled="submitting || Boolean(activeDictationKey) || Boolean(transcribingKey)"
            class="px-inline-lg py-stack-sm bg-surface-elevated border border-border text-body-sm font-medium text-ink rounded-control hover:bg-surface-subtle transition-colors disabled:opacity-50"
          >
            Save Draft
          </button>
          <button 
            v-if="status === 'draft'"
            @click="markReady"
            :disabled="submitting || Boolean(activeDictationKey) || Boolean(transcribingKey)"
            class="px-inline-lg py-stack-sm bg-action-link text-on-action text-body-sm font-medium rounded-control hover:bg-action-link-hover transition-colors shadow-sm disabled:opacity-50"
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
            :author="therapistName"
          />

          <ApprovedClinicalRecordView 
            :fields="summaryFields"
            :data="approvedRecord.content"
          />

          <!-- Legacy Plain Text Display -->
          <div v-if="legacyNotes" class="mt-8 pt-8 border-t border-border">
            <h4 class="text-caption font-bold text-ink-muted uppercase tracking-wider mb-4">Legacy Session Notes</h4>
            <div class="p-4 rounded-control border border-border bg-surface-muted text-body-sm text-ink whitespace-pre-wrap leading-relaxed">
              {{ legacyNotes }}
            </div>
          </div>

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
              Approved by: {{ therapistName || 'Therapist' }} • {{ approvedAmendment.timestamp }}
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
import { ref, reactive, computed, nextTick, watch, onMounted, onBeforeUnmount } from 'vue';
import StatusBadge from './StatusBadge.vue';
import ClinicalWorkflowIndicator from './ClinicalWorkflowIndicator.vue';
import ClinicalRecordMetadata from './ClinicalRecordMetadata.vue';
import RecordHistoryPanel from './RecordHistoryPanel.vue';
import ApprovalConfirmationDialog from './ApprovalConfirmationDialog.vue';
import ApprovedClinicalRecordView from './ApprovedClinicalRecordView.vue';
import NoticeBanner from './NoticeBanner.vue';
import { authenticatedFetch } from '../../lib/api.js';
import { saveSessionDraft, completeSessionRecord } from '../../lib/sessions.js';
import { getSessionCapture } from '../../lib/sessionCaptures.js';

const props = defineProps({
  session: {
    type: Object,
    required: true
  },
  therapistName: {
    type: String,
    default: ''
  }
});

const emit = defineEmits(['update:session']);

const status = ref('not_started');
const saveMessage = ref('');
const firstField = ref(null);
const mainHeading = ref(null);
const reviewConfirmed = ref(false);
const isApprovalDialogOpen = ref(false);
const submitting = ref(false);
const legacyNotes = ref('');
const activeDictationKey = ref('');
const transcribingKey = ref('');
const dictationErrorKey = ref('');
const dictationError = ref('');
const reviewedCapture = ref(null);
const selectedCaptureFields = ref([]);
const captureLoadError = ref('');
let recorder = null;
let stream = null;
let chunks = [];

const checklist = computed(() => [
  { id: 1, label: 'Reviewed Session Capture', available: Boolean(reviewedCapture.value), required: false },
  { id: 2, label: 'Therapist Notes', available: false, required: false },
  { id: 3, label: 'Therapist Reflection', available: false, required: false },
  { id: 4, label: 'Client Feedback', available: false, required: false }
]);

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

onMounted(async () => {
  loadFromSession();
  await loadReviewedCapture();
});

async function loadReviewedCapture() {
  captureLoadError.value = '';
  try {
    const capture = await getSessionCapture({ sessionId: props.session.id, clientId: props.session.clientId });
    reviewedCapture.value = capture?.status === 'reviewed' ? capture : null;
    selectedCaptureFields.value = reviewedCapture.value
      ? Object.keys(summaryFields).filter(key => reviewedCapture.value.content[key])
      : [];
  } catch (error) {
    console.error('Failed to load reviewed Session Capture:', error);
    captureLoadError.value = 'Reviewed Session Capture could not be loaded.';
  }
}

const loadFromSession = () => {
  if (!props.session) return;

  // Sync internal status with session status
  if (props.session.status === 'completed') {
    status.value = 'approved_record';
    
    // Load approved record content
    if (props.session.notes) {
      try {
        const parsed = JSON.parse(props.session.notes);
        if (parsed && typeof parsed === 'object') {
          approvedRecord.content = { ...parsed };
          delete approvedRecord.content.legacyNotes;
          legacyNotes.value = parsed.legacyNotes || '';
        } else {
          legacyNotes.value = props.session.notes;
        }
      } catch (e) {
        legacyNotes.value = props.session.notes;
      }
    }
    approvedRecord.timestamp = props.session.completedAt ? new Date(props.session.completedAt).toLocaleString() : '';
    return;
  }

  if (!props.session.notes) {
    status.value = 'not_started';
    return;
  }

  try {
    const parsed = JSON.parse(props.session.notes);
    if (parsed && typeof parsed === 'object') {
      Object.keys(summaryData).forEach(key => {
        if (parsed[key] !== undefined) {
          summaryData[key] = parsed[key];
        }
      });
      // If we have content, move to draft state automatically if it was not_started
      if (status.value === 'not_started' && Object.values(summaryData).some(v => v)) {
        status.value = 'draft';
      }
      legacyNotes.value = parsed.legacyNotes || '';
    } else {
      legacyNotes.value = props.session.notes;
    }
  } catch (e) {
    // Plain text or invalid JSON
    legacyNotes.value = props.session.notes;
  }
};

// Re-load if session changes externally (e.g. from another tab/component)
watch(() => props.session?.notes, (newNotes, oldNotes) => {
  if (newNotes !== oldNotes) {
    loadFromSession();
  }
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
  const authorName = props.therapistName || 'Therapist';
  
  if (status.value === 'approved_record' || status.value === 'amendment_draft' || status.value === 'amendment_ready_for_review' || status.value === 'amendment_approved') {
    history.push({
      title: 'Version 1',
      status: 'approved_record',
      statusLabel: 'Approved',
      author: authorName,
      approvedDate: approvedRecord.timestamp
    });
  }

  if (status.value === 'amendment_draft') {
    history.push({
      title: 'Amendment 1',
      status: 'amendment_draft',
      statusLabel: 'Draft',
      author: authorName,
      createdDate: new Date().toLocaleString()
    });
  } else if (status.value === 'amendment_ready_for_review') {
    history.push({
      title: 'Amendment 1',
      status: 'amendment_ready_for_review',
      statusLabel: 'Ready for Review',
      author: authorName,
      createdDate: new Date().toLocaleString()
    });
  } else if (status.value === 'amendment_approved') {
    history.push({
      title: 'Amendment 1',
      status: 'amendment_approved',
      statusLabel: 'Approved',
      author: authorName,
      approvedDate: approvedAmendment.timestamp,
      reason: approvedAmendment.reason
    });
  }

  return history;
});

const canPrepareDraft = computed(() => {
  // Allow starting a draft even if source material is not yet verified for this sprint
  return status.value === 'not_started';
});

const missingRequiredSources = computed(() => {
  return checklist.value
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

const prepareDraft = async () => {
  status.value = 'draft';
  scrollAndFocus();
};

const prepareDraftFromCapture = async () => {
  if (!reviewedCapture.value) return prepareDraft();
  for (const key of selectedCaptureFields.value) {
    if (reviewedCapture.value.content[key]) summaryData[key] = reviewedCapture.value.content[key];
  }
  status.value = 'draft';
  scrollAndFocus();
};

function useCaptureField(key) {
  const suggestion = reviewedCapture.value?.content?.[key];
  if (suggestion) summaryData[key] = suggestion;
}

function dictationButtonLabel(key) {
  if (transcribingKey.value === key) return 'Transcribing…';
  if (activeDictationKey.value === key) return 'Stop recording';
  return 'Dictate';
}

async function toggleDictation(key) {
  if (status.value !== 'draft') return;
  if (activeDictationKey.value === key) {
    recorder?.stop();
    return;
  }
  if (activeDictationKey.value || transcribingKey.value) return;

  dictationErrorKey.value = '';
  dictationError.value = '';
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    chunks = [];
    recorder = new MediaRecorder(stream);
    recorder.ondataavailable = event => {
      if (event.data.size > 0) chunks.push(event.data);
    };
    recorder.onstop = () => processDictation(key);
    recorder.start();
    activeDictationKey.value = key;
  } catch {
    dictationErrorKey.value = key;
    dictationError.value = 'Microphone access was not available. You can continue by typing.';
  }
}

async function processDictation(key) {
  activeDictationKey.value = '';
  stream?.getTracks().forEach(track => track.stop());

  const blob = new Blob(chunks, { type: recorder?.mimeType || 'audio/webm' });
  if (!blob.size) return;

  transcribingKey.value = key;
  dictationErrorKey.value = '';
  dictationError.value = '';
  try {
    const audio = await blobToDataUrl(blob);
    const response = await authenticatedFetch('/api/ai/transcribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ audio })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload?.error?.message || 'Dictation could not be transcribed.');
    const text = String(payload?.text || '').trim();
    if (text) summaryData[key] = [summaryData[key].trim(), text].filter(Boolean).join(summaryData[key].trim() ? '\n' : '');
  } catch (err) {
    dictationErrorKey.value = key;
    dictationError.value = err.message || 'The recording could not be transcribed. Your audio was not saved.';
  } finally {
    transcribingKey.value = '';
  }
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

const saveDraft = async () => {
  if (submitting.value || activeDictationKey.value || transcribingKey.value) return;
  submitting.value = true;
  saveMessage.value = 'Saving…';
  
  try {
    const payload = {
      ...summaryData,
      legacyNotes: legacyNotes.value
    };
    
    const updatedSession = await saveSessionDraft(
      props.session,
      JSON.stringify(payload)
    );
    
    emit('update:session', updatedSession);
    saveMessage.value = 'Draft saved.';
  } catch (error) {
    console.error('Failed to save clinical summary draft:', error);
    if (error.code === 'DEMO_CLINICAL_CONTENT') {
      saveMessage.value = 'Demonstration content [DEMO] cannot be saved.';
    } else {
      saveMessage.value = 'Failed to save.';
    }
  } finally {
    submitting.value = false;
    setTimeout(() => {
      if (saveMessage.value !== 'Saving…') {
        saveMessage.value = '';
      }
    }, 3000);
  }
};

const markReady = () => {
  if (activeDictationKey.value || transcribingKey.value) return;
  status.value = 'ready_for_review';
  scrollAndFocus();
};

const openApprovalDialog = async () => {
  // Always save latest draft before opening approval dialog to ensure data is persistent
  await saveDraft();
  isApprovalDialogOpen.value = true;
};

const confirmApproval = async () => {
  if (submitting.value) return;
  submitting.value = true;
  saveMessage.value = 'Approving…';

  try {
    const payload = {
      ...summaryData,
      legacyNotes: legacyNotes.value
    };

    const updatedSession = await completeSessionRecord(
      props.session,
      JSON.stringify(payload)
    );

    emit('update:session', updatedSession);
    saveMessage.value = 'Approved successfully.';
    
    // loadFromSession will be called via the watch on props.session.notes
    // but since we want immediate UI update and scroll:
    status.value = 'approved_record';
    scrollAndFocus();
  } catch (error) {
    console.error('Failed to approve clinical record:', error);
    if (error.code === 'SESSION_CONFLICT') {
      saveMessage.value = 'Conflict: Session was updated in another tab.';
    } else if (error.code === 'DEMO_CLINICAL_CONTENT') {
      saveMessage.value = 'Demonstration content [DEMO] cannot be saved.';
    } else {
      saveMessage.value = 'Approval failed.';
    }
  } finally {
    submitting.value = false;
    setTimeout(() => {
      saveMessage.value = '';
    }, 5000);
  }
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

onBeforeUnmount(() => {
  if (recorder?.state && recorder.state !== 'inactive') recorder.stop();
  stream?.getTracks().forEach(track => track.stop());
});
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
