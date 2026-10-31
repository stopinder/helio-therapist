<template>
  <section class="transcript-inbox">
    <template v-if="!selected">
      <header class="page-header inbox-page-header">
        <div class="header-orientation">
          <span class="icon-surface icon-surface-accent header-icon" aria-hidden="true"><Inbox class="workspace-icon-lg" /></span>
          <div>
            <p class="type-eyebrow text-accent">Zoom imports</p>
            <h1 class="type-page-title text-ink">Transcript Inbox</h1>
            <p class="type-body text-ink-muted header-supporting">Identify the session, place it with the right client, or clear it from the queue. Nothing is analysed automatically.</p>
          </div>
        </div>
        <span v-if="errorMessage" class="type-metadata text-state-danger" role="status">Inbox unavailable</span>
      </header>

      <div v-if="transcripts.length" class="queue-controls">
        <label class="inbox-search">
          <span class="sr-only">Search transcripts</span>
          <span class="search-control">
            <Search class="workspace-icon search-icon" aria-hidden="true" />
            <input v-model="searchQuery" class="control-field min-h-touch" type="search" placeholder="Search transcripts" />
          </span>
        </label>
        <div class="filters" role="group" aria-label="Transcript views">
          <button v-for="filter in filters" :key="filter.id" type="button" class="min-h-touch type-ui" :class="{ active: filterMode === filter.id }" :aria-pressed="filterMode === filter.id" @click="setFilter(filter.id)">
            {{ filter.label }}<template v-if="filter.id === 'attention'"> · {{ actionableCount }}</template>
          </button>
        </div>
        <button v-if="filterMode === 'attention' && matchingTranscripts.length" class="button-secondary clear-all compact-button" :disabled="saving || !!searchQuery" :title="searchQuery ? 'Clear your search to archive all attention items.' : 'Archive every item currently in Needs attention.'" @click="clearAllAttention">
          <Archive class="workspace-icon-sm" aria-hidden="true" />
          <span>{{ saving ? 'Archiving…' : 'Archive all' }}</span>
        </button>
      </div>

      <p v-if="errorMessage" class="notice error" role="alert">{{ errorMessage }}</p><p v-else-if="successMessage" class="notice success" role="status">{{ successMessage }}</p>
      <button v-if="lastClearedBatch.length" class="undo-link" :disabled="saving" @click="undoClearAttention">Undo</button>
      <p v-if="filterMode === 'history'">Archived transcripts and transcripts with completed inbox setup. Archiving preserves the transcript and removes it from Needs attention.</p>
      <div v-if="loading" class="empty-card compact">Loading transcripts…</div>
      <div v-else-if="!errorMessage && !transcripts.length" class="empty-card compact"><h2>Inbox up to date</h2><p>New Zoom transcripts will appear here when they need review.</p></div>
      <div v-else-if="visibleTranscripts.length" class="inbox-list">
        <article
          v-for="transcript in visibleTranscripts"
          :key="transcript.id"
          class="transcript-row triage-row"
          :data-transcript-id="transcript.id"
        >
          <div class="row-main">
            <div class="row-header">
              <div class="identity-block min-w-0">
                <span class="identity-icon icon-surface icon-surface-accent" aria-hidden="true"><UserRound class="workspace-icon" /></span>
                <div class="min-w-0">
                  <strong class="triage-identity">{{ triageIdentity(transcript) }}</strong>
                  <p v-if="transcript.sourceTitle && transcript.sourceTitle !== triageIdentity(transcript)" class="triage-topic">{{ transcript.sourceTitle }}</p>
                  <div class="row-metadata">
                    <span><CalendarDays class="workspace-icon-sm" aria-hidden="true" /> Encounter: {{ formatDate(transcript.sourceOccurredAt || transcript.receivedAt) }}</span>
                    <span v-if="transcript.meetingId">Meeting {{ transcript.meetingId }}</span>
                    <span v-if="speakerClues(transcript).length"><UsersRound class="workspace-icon-sm" aria-hidden="true" /> Named speakers: {{ speakerClues(transcript).join(', ') }}</span>
                  </div>
                </div>
              </div>
              <StatusIndicator class="status-indicator" :tone="filterMode === 'history' ? (transcript.completedAt || (!transcript.attentionClearedAt && isVerifiedMatch(transcript)) ? 'success' : 'neutral') : workflowTone(transcript)">
                {{ filterMode === 'history' ? (transcript.completedAt ? 'Inbox setup complete' : transcript.attentionClearedAt ? 'Archived' : isVerifiedMatch(transcript) ? 'Matched automatically' : 'History') : workflowState(transcript).label }}
              </StatusIndicator>
            </div>

            <section v-if="transcript.zoomGeneratedSummary" class="zoom-note-card" aria-label="Zoom note">
              <div class="zoom-note-header">
                <span class="zoom-note-icon" aria-hidden="true"><FileText class="workspace-icon" /></span>
                <div>
                  <p class="type-eyebrow text-accent">Zoom note</p>
                  <p class="type-metadata text-ink-muted">Imported session context</p>
                </div>
              </div>
              <div class="zoom-note-content">
                <template v-for="(block, index) in visibleZoomNoteBlocks(transcript)" :key="index">
                  <h3 v-if="block.type === 'heading'" class="zoom-note-heading">{{ block.text }}</h3>
                  <div v-else-if="block.type === 'bullet'" class="zoom-note-bullet"><span aria-hidden="true">•</span><p>{{ block.text }}</p></div>
                  <p v-else class="zoom-note-paragraph">{{ block.text }}</p>
                </template>
              </div>
              <button v-if="zoomNoteCanExpand(transcript)" type="button" class="zoom-note-toggle" :aria-expanded="expandedNoteIds.has(transcript.id)" @click="toggleZoomNote(transcript.id)">
                <ChevronUp v-if="expandedNoteIds.has(transcript.id)" class="workspace-icon-sm" aria-hidden="true" />
                <ChevronDown v-else class="workspace-icon-sm" aria-hidden="true" />
                <span>{{ expandedNoteIds.has(transcript.id) ? 'Show less' : 'Show more' }}</span>
              </button>
            </section>
            <p v-else class="triage-preview">{{ transcriptPreview(transcript) }}</p>

            <div v-if="filterMode === 'attention' && !isVerifiedMatch(transcript)" class="inline-assignment">
              <div class="assignment-intro">
                <span class="assignment-icon" aria-hidden="true"><UserPlus class="workspace-icon" /></span>
                <div>
                  <p class="type-ui font-semibold text-ink">Place with client</p>
                  <p class="type-metadata text-ink-muted">Choose an existing client or add someone new.</p>
                </div>
              </div>
              <div class="encounter-date-field">
                <div class="encounter-date-heading">
                  <div>
                    <label :for="'encounter-date-' + transcript.id">Encounter date</label>
                    <p>This date controls longitudinal ordering and becomes the session date when assigned.</p>
                  </div>
                  <span class="encounter-time">Time: {{ formatTime(transcript.sourceOccurredAt || transcript.receivedAt) }}</span>
                </div>
                <div class="encounter-date-controls">
                  <input
                    :id="'encounter-date-' + transcript.id"
                    v-model="encounterDateDrafts[transcript.id]"
                    class="control-field min-h-touch"
                    type="date"
                    :disabled="encounterDateSavingId === transcript.id || assignmentSavingId === transcript.id"
                  />
                  <button
                    type="button"
                    class="button-secondary compact-button"
                    :disabled="encounterDateSavingId === transcript.id || assignmentSavingId === transcript.id || !encounterDateChanged(transcript)"
                    @click="saveEncounterDate(transcript)"
                  >
                    <CalendarDays class="workspace-icon-sm" aria-hidden="true" />
                    <span>{{ encounterDateSavingId === transcript.id ? 'Saving…' : 'Save date' }}</span>
                  </button>
                </div>
              </div>
              <div class="field-group">
                <label :for="'client-' + transcript.id">Client</label>
                <div class="inline-client-picker">
                  <select :id="'client-' + transcript.id" v-model="assignmentDrafts[transcript.id]" class="control-field min-h-touch">
                    <option value="">Select client…</option>
                    <option v-for="client in clients" :key="client.id" :value="client.id">{{ client.name || client.display_name }}</option>
                  </select>
                  <button type="button" class="button-secondary add-client-inline" :disabled="addingClient" @click="openAddClientForTranscript(transcript)">
                    <UserPlus class="workspace-icon-sm" aria-hidden="true" />
                    <span>Add client</span>
                  </button>
                  <button
                    type="button"
                    class="button-primary assign-inline"
                    :disabled="assignmentSavingId === transcript.id || !assignmentDrafts[transcript.id]"
                    @click="assignFromInbox(transcript)"
                  >
                    <Check class="workspace-icon-sm" aria-hidden="true" />
                    <span>{{ assignmentSavingId === transcript.id ? 'Assigning…' : 'Assign' }}</span>
                  </button>
                </div>
                <span v-if="suggestedClient(transcript)" class="suggestion-note">Suggested from an exact Zoom title match — confirm before assigning.</span>
              </div>
            </div>

            <div v-else-if="isVerifiedMatch(transcript)" class="matched-note">
              <span class="matched-copy"><CheckCircle2 class="workspace-icon" aria-hidden="true" /> Verified Zoom/session match · {{ clientName(transcript.clientId) }}</span>
              <button type="button" class="button-secondary compact-button" @click="openLinkedSessionFromRow(transcript)">Open Clinical Workspace</button>
            </div>

            <div class="triage-actions">
              <div class="utility-actions">
                <button type="button" class="quiet-action" :aria-expanded="expandedRows.has(transcript.id)" @click="toggleExpand(transcript.id, $event)">
                  <Eye class="workspace-icon-sm" aria-hidden="true" />
                  <span>{{ expandedRows.has(transcript.id) ? 'Hide preview' : 'Preview transcript' }}</span>
                </button>
                <button type="button" class="quiet-action" @click="openTranscript(transcript)">
                  <FileText class="workspace-icon-sm" aria-hidden="true" />
                  <span>Open full transcript</span>
                </button>
              </div>
              <div v-if="filterMode === 'attention'" class="record-actions">
                <button type="button" class="quiet-action" :disabled="rowActionSavingId === transcript.id" @click="archiveFromInbox(transcript)">
                  <Archive class="workspace-icon-sm" aria-hidden="true" />
                  <span>{{ rowActionSavingId === transcript.id && rowActionSavingMode === 'archive' ? 'Archiving…' : 'Archive' }}</span>
                </button>
                <button v-if="canDeleteTranscript(transcript)" type="button" class="quiet-action danger-action" :disabled="rowActionSavingId === transcript.id" @click="deleteFromInbox(transcript)">
                  <Trash2 class="workspace-icon-sm" aria-hidden="true" />
                  <span>{{ rowActionSavingId === transcript.id && rowActionSavingMode === 'delete' ? 'Deleting…' : 'Delete' }}</span>
                </button>
              </div>
            </div>
            <section v-if="expandedRows.has(transcript.id)" class="conversation-preview" aria-label="Transcript preview">
              <header class="conversation-preview-header">
                <div>
                  <p class="type-eyebrow text-accent">Transcript preview</p>
                  <div class="identity-clues">
                    <span v-if="transcript.sourceTitle">Zoom title: {{ transcript.sourceTitle }}</span>
                    <span v-if="speakerSummary(transcript).identifiedSpeakers.length">Named speakers: {{ speakerSummary(transcript).identifiedSpeakers.join(', ') }}</span>
                    <span>{{ speakerTrackLabel(speakerSummary(transcript)) }}</span>
                    <span v-if="speakerSummary(transcript).hasUnidentified">Includes unidentified speaker</span>
                  </div>
                </div>
                <span class="type-metadata text-ink-muted">{{ previewConversation(transcript).totalTurns }} readable turn{{ previewConversation(transcript).totalTurns === 1 ? '' : 's' }}</span>
              </header>
              <div v-if="previewConversation(transcript).turns.length" class="conversation-turns conversation-turns-preview">
                <article v-for="(turn, index) in previewConversation(transcript).turns" :key="`${turn.key}-${turn.sourceIndex}-${index}`" class="conversation-turn">
                  <header class="turn-header">
                    <span class="turn-speaker" :class="{ unidentified: !turn.identified }">{{ turn.speaker }}</span>
                    <time v-if="turn.time" class="turn-time">{{ turn.time }}</time>
                  </header>
                  <p>{{ turn.text }}</p>
                </article>
              </div>
              <p v-else class="conversation-empty">No readable conversation turns could be extracted from this source.</p>
              <footer v-if="previewConversation(transcript).totalTurns > 12" class="conversation-preview-footer">
                <button type="button" class="zoom-note-toggle" :aria-expanded="expandedPreviewIds.has(transcript.id)" @click="togglePreviewDepth(transcript.id)">
                  <ChevronUp v-if="expandedPreviewIds.has(transcript.id)" class="workspace-icon-sm" aria-hidden="true" />
                  <ChevronDown v-else class="workspace-icon-sm" aria-hidden="true" />
                  <span>{{ expandedPreviewIds.has(transcript.id) ? 'Show less' : 'Show more' }}</span>
                </button>
                <span v-if="expandedPreviewIds.has(transcript.id) && previewConversation(transcript).hasMore" class="type-metadata text-ink-muted">
                  Showing the first {{ previewConversation(transcript).limit }} of {{ previewConversation(transcript).totalTurns }} turns. Open the full transcript for the rest.
                </span>
              </footer>
            </section>
          </div>
        </article>
        <div v-if="hasMoreHistory" class="load-more-row"><button class="load-more" type="button" @click="historyLimit += historyPageSize">Load more</button></div>
      </div>
      <div v-else class="empty-card compact">
        <h2>{{ filterMode === 'attention' && !searchQuery ? 'Inbox up to date' : 'No matching transcripts' }}</h2>
        <p>{{ filterMode === 'attention' && !searchQuery ? 'New Zoom transcripts will appear here when they need review.' : 'Try another search term or view.' }}</p>
      </div>
    </template>

    <template v-else>
      <header class="review-header">
        <div class="header-main">
          <button class="back" @click="closeTranscript"><ArrowLeft class="workspace-icon-sm" aria-hidden="true" /> Transcript Inbox</button>
          <div class="title-area">
            <p class="eyebrow">Transcript review</p>
            <h1>{{ labelFor(selected) }}</h1>
            <p>{{ formatDate(selected.receivedAt) }} · original Zoom transcript</p>
          </div>
        </div>
      </header>
      <p v-if="errorMessage" class="notice error" role="alert">{{ errorMessage }}</p><p v-else-if="successMessage" class="notice success" role="status">{{ successMessage }}</p>
      <section class="workflow-section client-section"><template v-if="!selected.clientId || editingClient"><div><p class="eyebrow">Client</p><h2>Client</h2><p>Select the client this original Zoom transcript belongs to. Helio will not guess.</p></div><div class="assignment-controls"><div v-if="!selected.clientId" class="encounter-date-field detail-encounter-date"><div class="encounter-date-heading"><div><label for="selected-encounter-date">Encounter date</label><p>This date controls longitudinal ordering and becomes the session date when assigned.</p></div><span class="encounter-time">Time: {{ formatTime(selected.sourceOccurredAt || selected.receivedAt) }}</span></div><div class="encounter-date-controls"><input id="selected-encounter-date" v-model="encounterDateDrafts[selected.id]" class="control-field min-h-touch" type="date" :disabled="encounterDateSavingId === selected.id || saving" /><button type="button" class="button-secondary compact-button" :disabled="encounterDateSavingId === selected.id || saving || !encounterDateChanged(selected)" @click="saveEncounterDate(selected)"><CalendarDays class="workspace-icon-sm" aria-hidden="true" /><span>{{ encounterDateSavingId === selected.id ? 'Saving…' : 'Save date' }}</span></button></div></div><div class="flex items-center gap-2"><label for="client-select" class="sr-only">Client</label><select id="client-select" v-model="selectedClientId" class="flex-1"><option value="" disabled>Select a client…</option><option v-for="client in clients" :key="client.id" :value="client.id">{{ client.name }}</option></select><button type="button" class="secondary whitespace-nowrap" @click="openAddClientForSelected">Add client</button></div><div class="assignment-actions"><button v-if="selected.clientId" class="secondary" :disabled="saving" @click="editingClient = false">Cancel</button><button class="primary" :disabled="saving || !selectedClientId || selectedClientId === selected.clientId" @click="saveAssignment">{{ saving ? 'Saving…' : selected.clientId ? 'Change client' : 'Assign client' }}</button></div></div></template><template v-else><div><p class="eyebrow">Client</p><h2>{{ clientName(selected.clientId) }}</h2><p>Assigned client</p></div><button class="secondary" @click="editingClient = true">Change</button></template></section>
      <section v-if="selected.clientId && !editingClient" class="ready-card">
        <div>
          <p class="eyebrow">Assigned</p>
          <h2>{{ clientName(selected.clientId) }}</h2>
          <p>The transcript is now in this client’s workspace. Session linking is optional and can be done there.</p>
        </div>
        <div class="assignment-actions">
          <button v-if="selected.sessionRef" class="primary" @click="openLinkedSession">Open Clinical Workspace</button>
          <button class="secondary" @click="openClientTranscripts">Client transcripts</button>
          <button class="secondary" @click="closeTranscript">Back to inbox</button>
        </div>
      </section>
      <section class="readable-transcript">
        <header class="readable-transcript-header">
          <div>
            <p class="type-eyebrow text-accent">Original source</p>
            <h2>Transcript</h2>
            <p>Readable view of the original Zoom transcript. Speaker names are shown only when Zoom supplied them; Helio has not analysed or re-attributed the conversation.</p>
          </div>
          <div class="source-actions">
            <button class="secondary" :aria-expanded="showRaw" @click="showRaw = !showRaw">{{ showRaw ? 'Hide raw source' : 'Raw source' }}</button>
            <button class="secondary download" @click="downloadRaw(selected)">Download .txt</button>
            <button v-if="isEligibleForDeletion" class="secondary text-state-danger" :disabled="saving" @click="deleteTranscript">{{ saving ? 'Deleting…' : 'Delete transcript' }}</button>
          </div>
        </header>
        <div class="transcript-reader">
          <div class="transcript-reader-toolbar">
            <label class="transcript-search">
              <span class="sr-only">Search transcript</span>
              <Search class="workspace-icon search-icon" aria-hidden="true" />
              <input v-model="transcriptSearch" type="search" class="control-field min-h-touch" placeholder="Search this transcript" />
            </label>
            <div class="identity-clues full-identity-clues">
              <span v-if="selectedSpeakerSummary.identifiedSpeakers.length">Named speakers: {{ selectedSpeakerSummary.identifiedSpeakers.join(', ') }}</span>
              <span>{{ speakerTrackLabel(selectedSpeakerSummary) }}</span>
              <span v-if="selectedSpeakerSummary.hasUnidentified">Includes unidentified speaker</span>
            </div>
          </div>
          <div v-if="filteredSelectedConversationTurns.length" class="conversation-turns conversation-turns-full">
            <article v-for="(turn, index) in filteredSelectedConversationTurns" :key="`${turn.key}-${turn.sourceIndex}-${index}`" class="conversation-turn">
              <header class="turn-header">
                <span class="turn-speaker" :class="{ unidentified: !turn.identified }">{{ turn.speaker }}</span>
                <time v-if="turn.time" class="turn-time">{{ turn.time }}</time>
              </header>
              <p>{{ turn.text }}</p>
            </article>
          </div>
          <div v-else class="conversation-empty">
            {{ transcriptSearch ? 'No transcript turns match your search.' : 'No readable conversation turns could be extracted from this source.' }}
          </div>
        </div>
        <div v-if="showRaw" class="raw-source-panel">
          <div class="raw-source-heading">
            <div><strong>Raw source</strong><p>Exact imported text retained for source fidelity.</p></div>
          </div>
          <pre>{{ selected.text }}</pre>
        </div>
      </section>
      <section v-if="selected.reviewChoicesSavedAt || editingChoices" class="review-choices"><div><p class="eyebrow">Review choices</p><h2>Review choices</h2><p>Choose what, if anything, should be requested later and how the original source should be retained. This does not start analysis.</p></div><label for="clinical-output">Requested output</label><select id="clinical-output" v-model="selectedLens"><option value="">No output requested</option><option value="clinical_summary">Clinical summary</option><option value="draft_note">Draft clinical note</option><option value="cbt">CBT reflection</option></select><fieldset><legend>Source retention</legend><label><input v-model="sourceRetention" type="radio" value="keep_until_review" /> Keep the original source until I review it</label><label><input v-model="sourceRetention" type="radio" value="delete_after_approved_output" /> Mark for deletion after I approve an output</label></fieldset><div class="assignment-actions"><button v-if="selected.reviewChoicesSavedAt" class="secondary" :disabled="saving" @click="editingChoices = false">Cancel</button><button class="primary save-choices" :disabled="saving" @click="saveReviewChoices">{{ saving ? 'Saving…' : selected.reviewChoicesSavedAt ? 'Update review choices' : 'Save review choices' }}</button></div></section>
      <section v-if="selected.completedAt || selected.attentionClearedAt" class="ready-card complete-card">
        <div v-if="selected.completedAt">
          <p class="eyebrow">Triage complete</p>
          <h2>Transcript triage complete</h2>
          <p>Client, session and review choices have been recorded. No requested output or Clinical Record was created by this triage step.</p>
        </div>
        <div v-else>
          <p class="eyebrow">Cleared from inbox</p>
          <h2>Transcript archived</h2>
          <p>This transcript is archived and no longer appears in Needs attention. The original source is preserved.</p>
        </div>
        <div class="assignment-actions">
          <button v-if="selected.attentionClearedAt && !selected.completedAt" class="primary" :disabled="saving" @click="restoreToAttention">Return to Needs attention</button>
          <button v-if="selected.clientId && selected.sessionRef" class="secondary" @click="openLinkedSession">View session</button>
        </div>
      </section>
    </template>
    <AddClientModal
      v-if="showAddClient"
      :submitting="addingClient"
      :error="addClientError"
      :initial-name="addClientInitialName"
      @close="closeAddClient"
      @submit="handleAddClient"
    />
  </section>
</template>
<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Archive, ArrowLeft, CalendarDays, Check, CheckCircle2, ChevronDown, ChevronUp, Eye, FileText, Inbox, Search, Trash2, UserPlus, UserRound, UsersRound } from '@lucide/vue'
import { authenticatedFetch } from '../lib/api.js'
import { createClient } from '../lib/clients.js'
import { conversationPreview, conversationTurns, searchConversationTurns, transcriptSpeakerSummary } from '../lib/transcriptPresentation.js'
import AddClientModal from './sidebar/AddClientModal.vue'
import StatusIndicator from './ui/StatusIndicator.vue'
const props = defineProps({ clients: { type: Array, default: () => [] }, openTranscriptId: { type: [String, Number], default: null } })
const emit = defineEmits(['client-added'])
const router = useRouter()
const transcripts = ref([]), selected = ref(null), selectedClientId = ref(''), selectedLens = ref(''), sourceRetention = ref('keep_until_review'), transcriptSearch = ref('')
const editingClient = ref(false), editingChoices = ref(false), searchQuery = ref(''), filterMode = ref('attention'), showRaw = ref(false), expandedRows = ref(new Set()), expandedNoteIds = ref(new Set()), expandedPreviewIds = ref(new Set()), assignmentDrafts = ref({}), encounterDateDrafts = ref({}), assignmentSavingId = ref(null), encounterDateSavingId = ref(null), rowActionSavingId = ref(null), rowActionSavingMode = ref(''), detailReturnId = ref(null)
const loading = ref(true), saving = ref(false), errorMessage = ref(''), successMessage = ref('')
const showAddClient = ref(false), addingClient = ref(false), addClientError = ref(''), addClientTranscriptId = ref(null), addClientInitialName = ref('')
const lastClearedBatch = ref([])
const historyPageSize = 20
const historyLimit = ref(historyPageSize)
function canDeleteTranscript(transcript) {
  return Boolean(transcript &&
    transcript.status === 'unassigned' &&
    !transcript.clientId &&
    !transcript.sessionRef &&
    !transcript.reviewChoicesSavedAt &&
    !transcript.completedAt);
}
const isEligibleForDeletion = computed(() => canDeleteTranscript(selected.value));
const selectedConversationTurns = computed(() => conversationTurns(selected.value));
const selectedSpeakerSummary = computed(() => transcriptSpeakerSummary(selected.value));
const filteredSelectedConversationTurns = computed(() => searchConversationTurns(selectedConversationTurns.value, transcriptSearch.value));
const filters = [{ id: 'attention', label: 'Needs attention' }, { id: 'history', label: 'History' }]
const actionableCount = computed(() => transcripts.value.filter(item => needsAttention(item)).length)
const matchingTranscripts = computed(() => {
  const query = searchQuery.value.trim().toLowerCase();
  return transcripts.value.filter(item => {
    if (filterMode.value === 'attention' && !needsAttention(item)) return false;
    if (filterMode.value === 'history' && needsAttention(item)) return false;
    if (!query) return true;
    return [
      labelFor(item), rowTitle(item), triageIdentity(item), clientName(item.clientId),
      workflowState(item).label, formatDate(item.sourceOccurredAt || item.receivedAt),
      item.sourceTitle, ...speakerClues(item)
    ].some(value => String(value || '').toLowerCase().includes(query))
  }).sort((a,b)=>new Date(b.receivedAt||0)-new Date(a.receivedAt||0))
})
const visibleTranscripts = computed(() => filterMode.value === 'history' ? matchingTranscripts.value.slice(0, historyLimit.value) : matchingTranscripts.value)
const hasMoreHistory = computed(() => filterMode.value === 'history' && visibleTranscripts.value.length < matchingTranscripts.value.length)
function setFilter(id){ filterMode.value=id; historyLimit.value=historyPageSize }
function formatDate(value){ const date=new Date(value);return Number.isNaN(date.getTime())?'Date unavailable':date.toLocaleString(undefined,{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}) }
function formatTime(value){ const date=new Date(value);return Number.isNaN(date.getTime())?'Unavailable':date.toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit'}) }
function localDateInput(value){
  const date=new Date(value)
  if(Number.isNaN(date.getTime()))return''
  const year=date.getFullYear()
  const month=String(date.getMonth()+1).padStart(2,'0')
  const day=String(date.getDate()).padStart(2,'0')
  return `${year}-${month}-${day}`
}
function encounterDateIso(transcript,dateValue){
  const current=new Date(transcript?.sourceOccurredAt||transcript?.receivedAt||Date.now())
  const parts=String(dateValue||'').split('-').map(Number)
  if(parts.length!==3||parts.some(part=>!Number.isFinite(part)))return null
  if(Number.isNaN(current.getTime()))return null
  current.setFullYear(parts[0],parts[1]-1,parts[2])
  return Number.isNaN(current.getTime())?null:current.toISOString()
}
function labelFor(transcript){ return transcript.meetingId ? `Zoom meeting ${transcript.meetingId}` : 'Zoom transcript' }
function clientName(clientId){ const client=props.clients.find(item=>item.id===clientId);return client?.name||client?.display_name||'' }
function normaliseIdentity(value){ return String(value||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim() }
function suggestedClient(transcript){
  if(transcript?.clientId || !transcript?.sourceTitle)return null;
  const title=normaliseIdentity(transcript.sourceTitle);
  if(!title)return null;
  const exact=props.clients.filter(client=>normaliseIdentity(client.name||client.display_name)===title);
  return exact.length===1?exact[0]:null;
}
function initialiseAssignmentDraft(transcript){
  if(!transcript?.id || transcript.clientId)return;
  if(!Object.prototype.hasOwnProperty.call(assignmentDrafts.value,transcript.id)){
    assignmentDrafts.value={...assignmentDrafts.value,[transcript.id]:suggestedClient(transcript)?.id||''};
  }
  if(!Object.prototype.hasOwnProperty.call(encounterDateDrafts.value,transcript.id)){
    encounterDateDrafts.value={...encounterDateDrafts.value,[transcript.id]:localDateInput(transcript.sourceOccurredAt||transcript.receivedAt)};
  }
}
function encounterDateChanged(transcript){
  if(!transcript?.id)return false
  return encounterDateDrafts.value[transcript.id]!==localDateInput(transcript.sourceOccurredAt||transcript.receivedAt)
}
function isVerifiedMatch(transcript){ return Boolean(transcript?.clientId && transcript?.sessionRef && transcript.status!=='unassigned') }
function needsAttention(transcript){ return !transcript?.completedAt && !transcript?.attentionClearedAt && !isVerifiedMatch(transcript) }
function rowTitle(transcript){ return clientName(transcript.clientId) || transcript.sourceTitle || labelFor(transcript) }
function triageIdentity(transcript){ return clientName(transcript.clientId) || suggestedClient(transcript)?.name || suggestedClient(transcript)?.display_name || (transcript.sourceTitle && normaliseIdentity(transcript.sourceTitle).split(' ').length<=3 ? transcript.sourceTitle : 'Unassigned transcript') }
function workflowState(transcript){
  if(isVerifiedMatch(transcript))return{id:'matched',label:'Matched'}
  if(!transcript?.clientId||transcript.status==='unassigned')return{id:'needs-client',label:suggestedClient(transcript)?'Likely client':'Needs client'}
  return{id:'assigned',label:'Assigned'}
}
function workflowTone(transcript){ return ({'needs-client':'warning','assigned':'success','matched':'success'})[workflowState(transcript).id] || 'neutral' }
function speakerClues(transcript){
  const speakers=Array.isArray(transcript?.structuredTranscript?.speakers)?transcript.structuredTranscript.speakers:[];
  return [...new Set(speakers.map(item=>String(item?.display_name||'').trim()).filter(name=>name&&!/^unknown$/i.test(name)&&!/^speaker\s*\d+$/i.test(name)))].slice(0,4)
}
function speakerSummary(transcript){ return transcriptSpeakerSummary(transcript) }
function speakerTrackLabel(summary){
  const count=Number(summary?.speakerCount||0)
  return `${count} speaker track${count===1?'':'s'}`
}
function previewConversation(transcript){
  return conversationPreview(transcript,{expanded:expandedPreviewIds.value.has(transcript?.id)})
}
function togglePreviewDepth(id){
  if(!id)return
  const next=new Set(expandedPreviewIds.value)
  if(next.has(id))next.delete(id)
  else next.add(id)
  expandedPreviewIds.value=next
}
function cleanZoomNoteText(value){
  return String(value||'')
    .replace(/\*\*(.*?)\*\*/g,'$1')
    .replace(/__(.*?)__/g,'$1')
    .replace(/\[(.*?)\]\([^)]+\)/g,'$1')
    .replace(/`([^`]+)`/g,'$1')
    .replace(/\s+/g,' ')
    .trim()
}
function zoomNoteBlocks(value){
  const normalized=String(value||'')
    .replace(/\r/g,'')
    .replace(/\s+(?=##\s+)/g,'\n')
    .trim()
  if(!normalized)return[]
  return normalized
    .split(/\n+/)
    .map(line=>line.trim())
    .filter(Boolean)
    .map(line=>{
      if(/^#{1,3}\s+/.test(line))return{type:'heading',text:cleanZoomNoteText(line.replace(/^#{1,3}\s+/,''))}
      if(/^[-*]\s+/.test(line))return{type:'bullet',text:cleanZoomNoteText(line.replace(/^[-*]\s+/,''))}
      return{type:'paragraph',text:cleanZoomNoteText(line)}
    })
    .filter(block=>block.text)
}
function compactNoteBlock(block){
  if(block.type==='heading')return block
  const limit=block.type==='bullet'?260:340
  return block.text.length>limit?{...block,text:`${block.text.slice(0,limit-1).trimEnd()}…`}:block
}
function visibleZoomNoteBlocks(transcript){
  const blocks=zoomNoteBlocks(transcript?.zoomGeneratedSummary)
  if(expandedNoteIds.value.has(transcript?.id))return blocks
  return blocks.slice(0,4).map(compactNoteBlock)
}
function zoomNoteCanExpand(transcript){
  const blocks=zoomNoteBlocks(transcript?.zoomGeneratedSummary)
  return blocks.length>4||blocks.some(block=>block.type!=='heading'&&block.text.length>(block.type==='bullet'?260:340))
}
function toggleZoomNote(id){
  if(!id)return
  const next=new Set(expandedNoteIds.value)
  if(next.has(id))next.delete(id)
  else next.add(id)
  expandedNoteIds.value=next
}
function transcriptPreview(transcript){
  if(typeof transcript?.text!=='string')return 'No Zoom note excerpt is available. Open Preview only if you need the source transcript.';
  const text=transcript.text.replace(/\b\d{1,2}:\d{2}(?::\d{2})?(?:\.\d+)?\b/g,' ').replace(/\s+/g,' ').trim();
  if(!text)return 'No transcript preview is available.';
  return text.length>340?`${text.slice(0,337)}…`:text
}
function suggestedNewClientName(transcript){
  const title=String(transcript?.sourceTitle||'').trim();
  if(!title)return '';
  const words=title.split(/\s+/).filter(Boolean);
  return words.length<=3?title:'';
}
function openAddClientForTranscript(transcript){
  addClientTranscriptId.value=transcript?.id||null;
  addClientInitialName.value=suggestedNewClientName(transcript);
  addClientError.value='';
  showAddClient.value=true;
}
function openAddClientForSelected(){
  addClientTranscriptId.value=null;
  addClientInitialName.value=suggestedNewClientName(selected.value);
  addClientError.value='';
  showAddClient.value=true;
}
function closeAddClient(){
  if(addingClient.value)return;
  showAddClient.value=false;
  addClientTranscriptId.value=null;
  addClientInitialName.value='';
  addClientError.value='';
}
async function clearAllAttention() {
  if (saving.value || searchQuery.value || !matchingTranscripts.value.length) return;
  saving.value = true;
  errorMessage.value = '';
  successMessage.value = '';
  lastClearedBatch.value = [];
  const idsToClear = matchingTranscripts.value.map(t => t.id);
  
  try {
    const response = await authenticatedFetch('/api/zoom/transcripts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'clear-attention', ids: idsToClear })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Unable to clear transcripts.');
    
    const cleared = data.transcripts || [];
    cleared.forEach(replaceTranscriptInList);
    lastClearedBatch.value = cleared;
    successMessage.value = `${cleared.length} item${cleared.length === 1 ? '' : 's'} archived.`;
  } catch (error) {
    errorMessage.value = error.message || 'Unable to clear transcripts.';
  } finally {
    saving.value = false;
  }
}
function isRestoredTranscript(transcript, id) {
  return transcript && typeof transcript === 'object' && !Array.isArray(transcript) &&
    transcript.id === id && transcript.attentionClearedAt === null && transcript.completedAt === null &&
    typeof transcript.updatedAt === 'string' && Number.isFinite(Date.parse(transcript.updatedAt)) &&
    typeof transcript.text === 'string' && typeof transcript.status === 'string' &&
    ['clientId', 'sessionRef', 'reviewChoicesSavedAt'].every(key =>
      transcript[key] === null || typeof transcript[key] === 'string');
}
async function undoClearAttention() {
  if (saving.value || !lastClearedBatch.value.length) return;
  saving.value = true;
  errorMessage.value = '';
  successMessage.value = '';
  const batch = [...lastClearedBatch.value];

  try {
    const results = await Promise.allSettled(batch.map(async t => {
      const response = await authenticatedFetch('/api/zoom/transcripts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: t.id, restoreAttention: true, expectedUpdatedAt: t.updatedAt })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'Unable to restore transcript.');
      if (!isRestoredTranscript(data?.transcript, t.id)) throw new Error('Invalid restoration response.');
      replaceTranscriptInList(data.transcript);
    }));
    // Retain the original versions for retries, including stale-write conflicts.
    lastClearedBatch.value = batch.filter((_, index) => results[index].status === 'rejected');
    if (lastClearedBatch.value.length) {
      errorMessage.value = 'Unable to undo some items. Retry Undo for the remaining items.';
    } else {
      successMessage.value = 'Archive undone.';
    }
  } finally {
    saving.value = false;
  }
}
async function restoreToAttention() {
  if (saving.value || !selected.value?.attentionClearedAt || selected.value.completedAt) return;
  const transcript = await patchTranscript({ restoreAttention: true }, 'Unable to restore this transcript.');
  if (transcript) {
    successMessage.value = 'Restored to Needs attention.';
  }
}
function replaceTranscriptInList(transcript) {
  const index = transcripts.value.findIndex(item => item.id === transcript.id);
  if (index >= 0) transcripts.value[index] = transcript;
  if (selected.value?.id === transcript.id) selected.value = transcript;
  const draft = encounterDateDrafts.value[transcript.id]
  initialiseAssignmentDraft(transcript);
  if (!draft || !encounterDateChanged(transcript)) {
    encounterDateDrafts.value={...encounterDateDrafts.value,[transcript.id]:localDateInput(transcript.sourceOccurredAt||transcript.receivedAt)}
  }
}
function replaceTranscript(transcript){replaceTranscriptInList(transcript)}
async function fetchTranscriptDetail(transcript){
  if(!transcript?.id)return null;
  if(typeof transcript.text==='string')return transcript;
  try{
    const response=await authenticatedFetch('/api/zoom/transcripts?id='+encodeURIComponent(transcript.id));
    const data=await response.json().catch(()=>({}));
    if(!response.ok||!data.transcript)throw new Error(data.error||'Unable to load this transcript.');
    replaceTranscriptInList(data.transcript);
    return data.transcript;
  }catch(error){
    errorMessage.value=error.message||'Unable to load this transcript.';
    return null;
  }
}
async function toggleExpand(id, event) {
  event.stopPropagation();
  if (expandedRows.value.has(id)) { expandedRows.value.delete(id); return; }
  const transcript=transcripts.value.find(item=>item.id===id);
  const detailed=await fetchTranscriptDetail(transcript);
  if(detailed)expandedRows.value.add(id);
}
async function openTranscript(transcript){
  const detailed=await fetchTranscriptDetail(transcript);
  if(!detailed)return;
  detailReturnId.value=detailed.id;
  selected.value=detailed;
  selectedClientId.value=detailed.clientId||'';
  selectedLens.value=detailed.requestedLens||'';
  sourceRetention.value=detailed.sourceRetention||'keep_until_review';
  errorMessage.value='';
  successMessage.value='';
  showRaw.value=false;
  transcriptSearch.value='';
}
function closeTranscript(){
  const returnId=detailReturnId.value;
  selected.value=null;
  detailReturnId.value=null;
  transcriptSearch.value='';
  requestAnimationFrame(()=>document.querySelector(`[data-transcript-id="${returnId}"]`)?.scrollIntoView({block:'center'}));
}
async function load(){loading.value=true;errorMessage.value='';try{const response=await authenticatedFetch('/api/zoom/transcripts');const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.error||'Unable to load transcripts.');transcripts.value=data.transcripts||[];for(const transcript of transcripts.value)initialiseAssignmentDraft(transcript)}catch(error){errorMessage.value=error.message||'Unable to load transcripts.'}finally{loading.value=false}}
async function patchTranscript(body,fallbackMessage){saving.value=true;errorMessage.value='';successMessage.value='';try{const response=await authenticatedFetch('/api/zoom/transcripts',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:selected.value.id,expectedUpdatedAt:selected.value.updatedAt,...body})});const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.error||fallbackMessage);if(body.restoreAttention && !isRestoredTranscript(data?.transcript,selected.value.id))throw new Error(fallbackMessage);replaceTranscript(data.transcript);return data.transcript}catch(error){errorMessage.value=error.message||fallbackMessage;return null}finally{saving.value=false}}
async function saveEncounterDate(transcript,{quiet=false}={}){
  if(!transcript?.id||encounterDateSavingId.value)return transcript
  if(!encounterDateChanged(transcript))return transcript
  const sourceOccurredAt=encounterDateIso(transcript,encounterDateDrafts.value[transcript.id])
  if(!sourceOccurredAt){
    errorMessage.value='Choose a valid encounter date.'
    return null
  }
  encounterDateSavingId.value=transcript.id
  if(!quiet){errorMessage.value='';successMessage.value=''}
  try{
    const response=await authenticatedFetch('/api/zoom/transcripts',{
      method:'PATCH',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({id:transcript.id,expectedUpdatedAt:transcript.updatedAt,sourceOccurredAt})
    })
    const data=await response.json().catch(()=>({}))
    if(!response.ok||!data.transcript)throw new Error(data.error||'Unable to update the encounter date.')
    replaceTranscriptInList(data.transcript)
    encounterDateDrafts.value={...encounterDateDrafts.value,[transcript.id]:localDateInput(data.transcript.sourceOccurredAt)}
    if(!quiet)successMessage.value='Encounter date updated.'
    return data.transcript
  }catch(error){
    errorMessage.value=error.message||'Unable to update the encounter date.'
    return null
  }finally{
    encounterDateSavingId.value=null
  }
}
async function assignTranscriptToClient(transcript,clientId,clientLabel=''){
  if(!transcript?.id||!clientId||assignmentSavingId.value)return null;
  assignmentSavingId.value=transcript.id;
  errorMessage.value='';
  successMessage.value='';
  try{
    const response=await authenticatedFetch('/api/zoom/transcripts',{
      method:'PATCH',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({id:transcript.id,expectedUpdatedAt:transcript.updatedAt,clientId,clearAttention:true})
    });
    const data=await response.json().catch(()=>({}));
    if(!response.ok||!data.transcript)throw new Error(data.error||'Unable to assign this transcript.');
    replaceTranscript(data.transcript);
    const label=clientLabel||clientName(data.transcript.clientId)||'the new client';
    successMessage.value=`Assigned to ${label}. The transcript is ready in Clinical Workspace.`;
    return data.transcript;
  }catch(error){
    errorMessage.value=error.message||'Unable to assign this transcript.';
    return null;
  }finally{
    assignmentSavingId.value=null;
  }
}
async function assignFromInbox(transcript){
  const clientId=assignmentDrafts.value[transcript.id];
  if(!clientId)return;
  let current=transcript
  if(encounterDateChanged(transcript)){
    current=await saveEncounterDate(transcript,{quiet:true})
    if(!current)return
  }
  await assignTranscriptToClient(current,clientId);
}
async function openLinkedSessionFromRow(transcript){
  if(!transcript?.clientId||!transcript?.sessionRef)return;
  await router.push({name:'SessionWorkspace',params:{clientId:transcript.clientId,sessionId:transcript.sessionRef}});
}
function removeExpandedRow(id){
  if(!expandedRows.value.has(id))return;
  const next=new Set(expandedRows.value);
  next.delete(id);
  expandedRows.value=next;
}
async function archiveFromInbox(transcript){
  if(!transcript?.id||rowActionSavingId.value)return;
  rowActionSavingId.value=transcript.id;
  rowActionSavingMode.value='archive';
  errorMessage.value='';
  successMessage.value='';
  try{
    const response=await authenticatedFetch('/api/zoom/transcripts',{
      method:'PATCH',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({id:transcript.id,expectedUpdatedAt:transcript.updatedAt,clearAttention:true})
    });
    const data=await response.json().catch(()=>({}));
    if(!response.ok||!data.transcript)throw new Error(data.error||'Unable to archive this transcript.');
    replaceTranscriptInList(data.transcript);
    removeExpandedRow(transcript.id);
    successMessage.value='Transcript archived. Restore it any time from History.';
  }catch(error){
    errorMessage.value=error.message||'Unable to archive this transcript.';
  }finally{
    rowActionSavingId.value=null;
    rowActionSavingMode.value='';
  }
}
async function deleteTranscriptRecord(transcript,{closeDetail=false}={}){
  if(!canDeleteTranscript(transcript)||rowActionSavingId.value)return false;
  if(!window.confirm('Delete this unassigned transcript permanently? This removes the imported source from Helios and cannot be undone.'))return false;
  rowActionSavingId.value=transcript.id;
  rowActionSavingMode.value='delete';
  errorMessage.value='';
  successMessage.value='';
  try{
    const response=await authenticatedFetch('/api/zoom/transcripts',{
      method:'DELETE',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({id:transcript.id})
    });
    if(!response.ok){
      const data=await response.json().catch(()=>({}));
      throw new Error(data.error||'Unable to delete transcript.');
    }
    transcripts.value=transcripts.value.filter(item=>item.id!==transcript.id);
    removeExpandedRow(transcript.id);
    if(closeDetail&&selected.value?.id===transcript.id)selected.value=null;
    successMessage.value='Transcript deleted.';
    return true;
  }catch(error){
    errorMessage.value=error.message||'Unable to delete transcript.';
    return false;
  }finally{
    rowActionSavingId.value=null;
    rowActionSavingMode.value='';
  }
}
async function deleteFromInbox(transcript){return deleteTranscriptRecord(transcript)}

async function saveAssignment(){
  if(!selected.value||!selectedClientId.value)return
  if(encounterDateChanged(selected.value)){
    const dated=await saveEncounterDate(selected.value,{quiet:true})
    if(!dated)return
  }
  const transcript=await patchTranscript({clientId:selectedClientId.value,clearAttention:true},'Unable to save the client assignment.')
  if(transcript){editingClient.value=false;successMessage.value=`Assigned to ${clientName(transcript.clientId)} and ready in Clinical Workspace.`}
}
async function saveReviewChoices(){const transcript=await patchTranscript({requestedLens:selectedLens.value||null,sourceRetention:sourceRetention.value,reviewChoicesSaved:true},'Unable to save review choices.');if(transcript){editingChoices.value=false;successMessage.value='Review choices saved. No analysis has started.'}}
async function deleteTranscript(){if(!selected.value)return;await deleteTranscriptRecord(selected.value,{closeDetail:true})}
async function handleAddClient(payload) {
  addingClient.value = true;
  addClientError.value = '';
  const targetTranscriptId = addClientTranscriptId.value;
  let newClient;
  try {
    newClient = await createClient(payload);
  } catch (err) {
    addClientError.value = err.message || 'Failed to create client.';
    addingClient.value = false;
    return;
  }

  emit('client-added', newClient);
  showAddClient.value = false;
  addClientTranscriptId.value = null;
  addClientInitialName.value = '';
  addingClient.value = false;

  if (targetTranscriptId) {
    assignmentDrafts.value = { ...assignmentDrafts.value, [targetTranscriptId]: newClient.id };
    const transcript = transcripts.value.find(item => item.id === targetTranscriptId);
    if (!transcript) {
      errorMessage.value = 'Client added, but the transcript is no longer available.';
      return;
    }
    let current = transcript;
    if (encounterDateChanged(transcript)) {
      current = await saveEncounterDate(transcript, { quiet: true });
      if (!current) return;
    }
    const assigned = await assignTranscriptToClient(current, newClient.id, newClient.name || newClient.display_name);
    if (assigned) successMessage.value = `Added ${newClient.name || newClient.display_name} and assigned the transcript.`;
    return;
  }

  selectedClientId.value = newClient.id;
  if (selected.value && encounterDateChanged(selected.value)) {
    const dated = await saveEncounterDate(selected.value, { quiet: true });
    if (!dated) return;
  }
  const assigned = await patchTranscript({clientId:newClient.id,clearAttention:true},'Client added, but the transcript could not be assigned.');
  if (assigned) {
    editingClient.value=false;
    successMessage.value=`Added ${newClient.name || newClient.display_name} and assigned the transcript.`;
  }
}
async function openClientTranscripts(){if(!selected.value?.clientId)return;await router.push({name:'ClientWorkspace',params:{clientId:selected.value.clientId},query:{tab:'Transcripts'}})}
async function openLinkedSession(){if(!selected.value?.sessionRef)return;if(selected.value.reviewChoicesSavedAt&&!selected.value.completedAt){const completed=await patchTranscript({markComplete:true},'Unable to complete transcript triage.');if(!completed)return}await router.push({name:'SessionWorkspace',params:{clientId:selected.value.clientId,sessionId:selected.value.sessionRef}})}
function downloadRaw(transcript){const blob=new Blob([transcript.text],{type:'text/plain;charset=utf-8'});const link=document.createElement('a');link.href=URL.createObjectURL(blob);link.download=`helio-zoom-transcript-${transcript.meetingId||transcript.id}.txt`;link.click();URL.revokeObjectURL(link.href)}
async function openQueuedTranscript(id){if(!id)return;if(!transcripts.value.length)await load();const transcript=transcripts.value.find(item=>String(item.id)===String(id));if(transcript)await openTranscript(transcript)}
watch(()=>props.openTranscriptId,openQueuedTranscript);watch(searchQuery,()=>{historyLimit.value=historyPageSize});onMounted(async()=>{await load();openQueuedTranscript(props.openTranscriptId)})
</script>
<style scoped>
.transcript-inbox {
  max-width: 1040px;
  margin: 0 auto;
  padding: var(--space-page);
  color: var(--text-primary);
}
.inbox-page-header {
  display:flex;
  align-items:flex-start;
  justify-content:space-between;
  gap:var(--space-inline-lg);
  margin:0 0 var(--space-stack-xl);
}
.header-orientation { display:flex; align-items:flex-start; gap:var(--space-inline-md); }
.header-icon { width:2.75rem; height:2.75rem; margin-top:.15rem; }
.header-supporting { max-width:46rem; margin-top:.45rem; }

.queue-controls {
  display:grid;
  grid-template-columns:minmax(240px,1fr) auto auto;
  gap:var(--space-inline-md);
  align-items:center;
  margin:0 0 var(--space-stack-lg);
  padding:var(--space-stack-sm);
  border:1px solid var(--border-muted);
  border-radius:var(--radius-panel);
  background:var(--surface-muted);
}
.inbox-search { min-width:0; }
.search-control { position:relative; display:block; }
.search-control .control-field { padding-left:2.55rem; background:var(--surface-elevated); }
.search-icon { position:absolute; left:.85rem; top:50%; z-index:1; transform:translateY(-50%); color:var(--accent); pointer-events:none; }
.filters { display:inline-flex; min-height:var(--control-target); padding:.2rem; border:1px solid var(--border); border-radius:var(--radius-control); background:var(--surface-raised); }
.filters button { border:0; background:transparent; color:var(--text-secondary); cursor:pointer; padding:.55rem .8rem; border-radius:calc(var(--radius-control) - .18rem); transition:background-color var(--motion-standard) var(--motion-ease),color var(--motion-standard) var(--motion-ease); }
.filters button:hover { background:var(--state-hover); }
.filters button.active { background:var(--state-selected); color:var(--accent); font-weight:600; }
.compact-button { min-height:2.45rem; padding:.45rem .75rem; }
.clear-all { white-space:nowrap; }

.notice { margin:0 0 var(--space-stack-md); padding:.75rem 1rem; border-radius:var(--radius-control); border:1px solid var(--border); background:var(--surface-raised); }
.notice.error { border-color:rgb(154 79 71 / .25); background:var(--state-danger-surface); color:var(--state-danger); }
.notice.success { border-color:rgb(71 112 91 / .25); background:var(--state-success-surface); color:var(--state-success); }
.undo-link { background:none; border:0; color:var(--action-link); font-weight:600; cursor:pointer; padding:.35rem 0; margin-bottom:var(--space-stack-md); }

.inbox-list {
  display:flex;
  flex-direction:column;
  gap:var(--space-stack-md);
}
.transcript-row {
  position:relative;
  background:var(--surface-raised);
  border:1px solid var(--border-muted);
  border-radius:var(--radius-panel);
  overflow:hidden;
  transition:border-color var(--motion-standard) var(--motion-ease),background-color var(--motion-standard) var(--motion-ease),box-shadow var(--motion-standard) var(--motion-ease);
}
.transcript-row::before {
  content:'';
  position:absolute;
  inset:0 auto 0 0;
  width:3px;
  background:var(--accent);
  opacity:.8;
}
.transcript-row:hover { border-color:var(--border-strong); background:var(--surface-elevated); }
.row-main { display:flex; flex-direction:column; gap:var(--space-stack-md); padding:1.25rem 1.35rem 1.1rem 1.5rem; }
.row-header { display:flex; justify-content:space-between; align-items:flex-start; gap:var(--space-inline-lg); }
.identity-block { display:flex; align-items:flex-start; gap:.75rem; }
.identity-icon { width:2.25rem; height:2.25rem; border-radius:var(--radius-pill); flex-shrink:0; }
.triage-identity { display:block; color:var(--text-primary); font-size:1.05rem; line-height:1.35; font-weight:650; letter-spacing:-.01em; text-transform:none; }
.triage-topic { margin:.12rem 0 0; color:var(--text-secondary); font-size:.82rem; line-height:1.4; }
.row-metadata { display:flex; flex-wrap:wrap; align-items:center; gap:.35rem .7rem; margin-top:.45rem; color:var(--text-muted); font-size:var(--type-metadata-size); line-height:var(--type-metadata-line); }
.row-metadata > span { display:inline-flex; align-items:center; gap:.3rem; }
.row-metadata > span + span::before { content:'·'; margin-right:.35rem; color:var(--border-strong); }
.status-indicator { flex-shrink:0; margin-top:.2rem; }

.zoom-note-card {
  margin-left:3rem;
  border:1px solid var(--border-reflection);
  border-radius:var(--radius-control);
  background:var(--surface-reflection);
  padding:.85rem 1rem;
}
.zoom-note-header { display:flex; align-items:center; gap:.65rem; margin-bottom:.65rem; }
.zoom-note-icon { display:inline-flex; width:1.9rem; height:1.9rem; align-items:center; justify-content:center; border:1px solid var(--border-reflection); border-radius:var(--radius-control); background:var(--surface-raised); color:var(--accent); }
.zoom-note-content { display:flex; flex-direction:column; gap:.32rem; color:var(--text-secondary); }
.zoom-note-heading { margin:.28rem 0 .08rem; color:var(--text-primary); font-size:.82rem; line-height:1.3; font-weight:650; }
.zoom-note-paragraph,.zoom-note-bullet p { margin:0; font-size:.82rem; line-height:1.55; }
.zoom-note-bullet { display:grid; grid-template-columns:.8rem 1fr; gap:.2rem; }
.zoom-note-bullet > span { color:var(--accent); font-weight:700; }
.zoom-note-toggle { display:inline-flex; align-items:center; gap:.3rem; margin-top:.55rem; padding:.2rem 0; border:0; background:transparent; color:var(--action-link); font-size:var(--type-ui-size); font-weight:600; cursor:pointer; }
.triage-preview { margin:0 0 0 3rem; padding:.75rem .9rem; border-radius:var(--radius-control); background:var(--surface-subtle); color:var(--text-muted); font-size:.8rem; line-height:1.45; }

.inline-assignment {
  display:block;
  margin-left:3rem;
  padding:1rem;
  border:1px solid var(--border-muted);
  border-radius:var(--radius-control);
  background:var(--surface-subtle);
  overflow:hidden;
}
.assignment-intro { display:flex; align-items:flex-start; gap:.6rem; margin-bottom:.8rem; }
.assignment-icon { display:inline-flex; width:2rem; height:2rem; align-items:center; justify-content:center; border-radius:var(--radius-control); background:var(--state-selected); color:var(--accent); flex-shrink:0; }
.encounter-date-field { display:flex; min-width:0; flex-direction:column; gap:.45rem; margin-bottom:.85rem; padding-bottom:.85rem; border-bottom:1px solid var(--border-muted); }
.encounter-date-heading { display:flex; align-items:flex-end; justify-content:space-between; gap:var(--space-inline-md); }
.encounter-date-heading label,.field-group label { color:var(--text-secondary); font-size:var(--type-ui-size); font-weight:600; }
.encounter-date-heading p { margin:.18rem 0 0; color:var(--text-muted); font-size:var(--type-metadata-size); line-height:1.4; }
.encounter-time { color:var(--text-muted); font-size:var(--type-metadata-size); white-space:nowrap; }
.encounter-date-controls { display:grid; grid-template-columns:minmax(0,14rem) max-content; gap:.5rem; align-items:center; }
.encounter-date-controls .control-field { width:100%; }
.field-group { display:flex; min-width:0; flex-direction:column; gap:.4rem; }
.inline-client-picker {
  display:grid;
  grid-template-columns:minmax(0,1fr) max-content max-content;
  min-width:0;
  width:100%;
  gap:.5rem;
  align-items:center;
}
.inline-client-picker > * { min-width:0; }
.inline-client-picker .control-field { width:100%; padding-top:.55rem; padding-bottom:.55rem; }
.add-client-inline,.assign-inline {
  width:auto;
  min-width:max-content;
  min-height:var(--control-target);
  white-space:nowrap;
  padding:.55rem .8rem;
}
.add-client-inline { color:var(--accent); border-color:rgb(29 84 109 / .28); }
.assign-inline { min-width:5.75rem; }
.suggestion-note { color:var(--text-muted); font-size:var(--type-metadata-size); }

.matched-note {
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:.75rem;
  margin-left:3rem;
  padding:.75rem .9rem;
  border:1px solid rgb(71 112 91 / .22);
  border-radius:var(--radius-control);
  background:var(--state-success-surface);
  color:var(--text-secondary);
}
.matched-copy { display:inline-flex; align-items:center; gap:.45rem; color:var(--state-success); font-size:var(--type-ui-size); font-weight:600; }

.triage-actions {
  display:flex;
  justify-content:space-between;
  align-items:center;
  gap:var(--space-inline-md);
  margin-left:3rem;
  padding-top:.7rem;
  border-top:1px solid var(--border-muted);
}
.utility-actions,.record-actions { display:flex; flex-wrap:wrap; align-items:center; gap:.25rem; }
.quiet-action {
  display:inline-flex;
  min-height:2.35rem;
  align-items:center;
  gap:.35rem;
  padding:.4rem .55rem;
  border:0;
  border-radius:var(--radius-control);
  background:transparent;
  color:var(--text-muted);
  font-size:var(--type-ui-size);
  font-weight:500;
  cursor:pointer;
  transition:background-color var(--motion-fast) var(--motion-ease),color var(--motion-fast) var(--motion-ease);
}
.quiet-action:hover:not(:disabled) { background:var(--state-hover); color:var(--text-primary); }
.quiet-action:disabled { background:transparent; }
.danger-action { color:var(--state-danger); }
.danger-action:hover:not(:disabled) { background:var(--state-danger-surface); color:var(--state-danger); }
.conversation-preview {
  margin:.1rem 0 0 3rem;
  padding:1rem;
  border:1px solid var(--border-muted);
  border-radius:var(--radius-control);
  background:var(--surface-muted);
}
.conversation-preview-header { display:flex; align-items:flex-start; justify-content:space-between; gap:var(--space-inline-md); margin-bottom:.75rem; }
.identity-clues { display:flex; flex-wrap:wrap; align-items:center; gap:.3rem .65rem; margin-top:.3rem; color:var(--text-muted); font-size:var(--type-metadata-size); line-height:var(--type-metadata-line); }
.identity-clues > span { display:inline-flex; align-items:center; gap:.25rem; }
.identity-clues > span + span::before { content:'·'; margin-right:.35rem; color:var(--border-strong); }
.conversation-turns { border:1px solid var(--border-muted); border-radius:var(--radius-control); overflow:hidden; background:var(--surface-raised); }
.conversation-turn { padding:.7rem .85rem .8rem; border-bottom:1px solid var(--border-muted); }
.conversation-turn:last-child { border-bottom:0; }
.turn-header { display:flex; align-items:baseline; justify-content:space-between; gap:.75rem; margin-bottom:.22rem; }
.turn-speaker { color:var(--accent); font-size:var(--type-ui-size); font-weight:650; }
.turn-speaker.unidentified { color:var(--text-muted); font-style:italic; font-weight:550; }
.turn-time { color:var(--text-subtle); font-size:var(--type-metadata-size); font-variant-numeric:tabular-nums; }
.conversation-turn p { margin:0; color:var(--text-secondary); font-size:.84rem; line-height:1.55; }
.conversation-turns-preview { max-height:27rem; overflow:auto; }
.conversation-preview-footer { display:flex; flex-wrap:wrap; align-items:center; gap:.75rem; margin-top:.65rem; }
.conversation-empty { margin:0; padding:1rem; border:1px dashed var(--border); border-radius:var(--radius-control); color:var(--text-muted); font-size:var(--type-ui-size); text-align:center; }
.conversation-turns-full { max-height:48rem; overflow:auto; }


.empty-card { padding:var(--space-stack-2xl); text-align:center; border:1px solid var(--border-muted); border-radius:var(--radius-panel); background:var(--surface-raised); color:var(--text-muted); }
.empty-card h2 { margin:0 0 .4rem; color:var(--text-primary); font-size:var(--type-subsection-size); }
.load-more-row { display:flex; justify-content:center; padding:var(--space-stack-lg); }
.load-more { min-height:var(--control-target); padding:.5rem 1.25rem; border:1px solid var(--border); border-radius:var(--radius-pill); background:var(--surface-raised); color:var(--text-secondary); cursor:pointer; }
.load-more:hover { border-color:var(--border-strong); background:var(--state-hover); }

.review-header { margin-bottom:var(--space-stack-xl); }
.header-main { display:flex; flex-direction:column; gap:var(--space-stack-lg); }
.back { display:inline-flex; align-items:center; gap:.35rem; width:fit-content; padding:.35rem 0; border:0; background:transparent; color:var(--action-link); font-size:var(--type-ui-size); font-weight:600; cursor:pointer; }
.title-area .eyebrow,.workflow-section .eyebrow,.ready-card .eyebrow { color:var(--accent); }
.title-area h1 { margin:.2rem 0; font-size:var(--type-page-title-size); line-height:var(--type-page-title-line); font-weight:600; letter-spacing:var(--type-page-title-tracking); }
.title-area p { color:var(--text-muted); }

.workflow-section,.readable-transcript,.review-choices,.ready-card {
  margin-bottom:var(--space-stack-xl);
  border:1px solid var(--border-muted);
  border-radius:var(--radius-panel);
  background:var(--surface-raised);
}
.workflow-section { padding:1.5rem; display:flex; justify-content:space-between; align-items:flex-start; gap:var(--space-inline-lg); }
.workflow-section > div { flex:1; }
.workflow-section h2,.ready-card h2 { margin:.35rem 0; font-size:var(--type-subsection-size); }
.assignment-controls { flex:1.5; display:flex; flex-direction:column; gap:var(--space-stack-md); }
.assignment-controls select,.review-choices select { min-height:var(--control-target); border:1px solid var(--border); border-radius:var(--radius-control); background:var(--surface-elevated); padding:.55rem .75rem; color:var(--text-primary); }
.assignment-actions { display:flex; gap:.65rem; align-items:center; flex-wrap:wrap; margin-top:.4rem; }
.primary { min-height:var(--control-target); padding:.55rem .9rem; border:1px solid rgb(0 0 0 / .1); border-radius:var(--radius-control); background:var(--accent); color:var(--text-on-action); font-size:var(--type-ui-size); font-weight:600; cursor:pointer; }
.primary:hover:not(:disabled) { background:var(--accent-hover); }
.secondary { min-height:var(--control-target); padding:.55rem .8rem; border:1px solid var(--border); border-radius:var(--radius-control); background:var(--surface-raised); color:var(--text-secondary); font-size:var(--type-ui-size); font-weight:500; cursor:pointer; }
.secondary:hover:not(:disabled) { background:var(--state-hover); border-color:var(--border-strong); }

.ready-card { padding:1.35rem 1.5rem; display:flex; justify-content:space-between; align-items:center; border-color:rgb(71 112 91 / .2); background:var(--state-success-surface); }
.complete-card { border-color:var(--border-muted); background:var(--surface-subtle); }
.readable-transcript { overflow:hidden; }
.readable-transcript-header { padding:1.2rem 1.5rem; background:var(--surface-subtle); border-bottom:1px solid var(--border-muted); display:flex; justify-content:space-between; align-items:flex-start; gap:var(--space-inline-lg); }
.readable-transcript-header h2 { margin:.2rem 0; font-size:var(--type-subsection-size); }
.readable-transcript-header p { max-width:42rem; color:var(--text-muted); font-size:var(--type-ui-size); line-height:1.5; }
.source-actions { display:flex; gap:.5rem; flex-wrap:wrap; justify-content:flex-end; }
.transcript-reader { padding:1rem 1.5rem 1.4rem; background:var(--surface-elevated); }
.transcript-reader-toolbar { display:flex; align-items:center; justify-content:space-between; gap:var(--space-inline-lg); margin-bottom:1rem; }
.transcript-search { position:relative; display:block; flex:1; max-width:24rem; }
.transcript-search .control-field { padding-left:2.55rem; }
.transcript-search .search-icon { position:absolute; left:.85rem; top:50%; z-index:1; transform:translateY(-50%); color:var(--accent); pointer-events:none; }
.full-identity-clues { justify-content:flex-end; }
.raw-source-panel { border-top:1px solid var(--border-muted); background:var(--surface-muted); }
.raw-source-heading { padding:.9rem 1.5rem .65rem; color:var(--text-secondary); }
.raw-source-heading strong { color:var(--text-primary); font-size:var(--type-ui-size); }
.raw-source-heading p { margin:.15rem 0 0; color:var(--text-muted); font-size:var(--type-metadata-size); }
.raw-source-panel pre { max-height:400px; overflow-y:auto; margin:0; padding:1rem 1.5rem 1.5rem; color:var(--text-secondary); font-family:ui-monospace,SFMono-Regular,Menlo,monospace; white-space:pre-wrap; font-size:.76rem; line-height:1.6; }
.review-choices { padding:1.5rem; }
.review-choices select { width:100%; margin:.45rem 0 1.25rem; }
.review-choices fieldset { border:0; padding:0; margin:0 0 1.25rem; display:flex; flex-direction:column; gap:.7rem; }
.review-choices fieldset label { display:flex; align-items:center; gap:.7rem; cursor:pointer; }

@media (max-width: 820px) {
  .queue-controls { grid-template-columns:1fr; }
  .filters { width:100%; }
  .filters button { flex:1; }
  .clear-all { justify-self:start; }
  .zoom-note-card,.inline-assignment,.matched-note,.triage-actions,.conversation-preview { margin-left:0; }
  .assignment-intro { align-self:start; }
  .inline-client-picker { grid-template-columns:minmax(0,1fr) max-content max-content; }
}
@media (max-width: 640px) {
  .transcript-inbox { padding:1rem; }
  .inbox-page-header,.row-header,.workflow-section,.ready-card,.readable-transcript-header { flex-direction:column; align-items:stretch; }
  .header-icon { display:none; }
  .row-header { gap:.7rem; }
  .status-indicator { align-self:flex-start; }
  .inline-client-picker { grid-template-columns:1fr; }
  .encounter-date-heading { align-items:flex-start; flex-direction:column; }
  .encounter-date-controls { grid-template-columns:1fr; }
  .encounter-date-controls .button-secondary { width:100%; justify-content:center; }
  .add-client-inline,.assign-inline { width:100%; justify-content:center; }
  .triage-actions { align-items:flex-start; flex-direction:column; }
  .record-actions { width:100%; padding-top:.35rem; border-top:1px solid var(--border-muted); }
  .workflow-section { padding:1.2rem; }
  .assignment-controls { width:100%; }
  .source-actions { justify-content:flex-start; }
  .transcript-reader { padding:1rem; }
  .transcript-reader-toolbar,.conversation-preview-header { align-items:stretch; flex-direction:column; }
  .transcript-search { max-width:none; width:100%; }
  .full-identity-clues { justify-content:flex-start; }
}
</style>