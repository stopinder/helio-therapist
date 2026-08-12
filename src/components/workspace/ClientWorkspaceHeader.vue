<template>
  <header class="bg-surface border-b border-border-muted px-inline-lg py-stack-md">
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-stack-md">
      <div class="flex items-center gap-inline-md"><div class="h-10 w-10 rounded-pill bg-avatar flex items-center justify-center text-h3 font-semibold text-ink shrink-0">{{ clientInitials }}</div><div class="flex flex-col min-w-0"><div class="flex items-center gap-inline-sm flex-wrap"><h1 class="text-h2 font-semibold text-ink truncate">{{ client.display_name }}</h1><StatusBadge :status="client.archived ? 'archived' : 'active'" /></div><div class="flex flex-wrap items-center gap-x-inline-md gap-y-0 text-caption text-ink-muted"><span>Next: {{ nextAppointmentLabel }}</span><span>Therapist: {{ therapistLabel }}</span><span v-if="client.archived_at">Archived {{ archiveDate }}</span></div></div></div>
      <div class="flex items-center gap-inline-sm flex-wrap"><button @click="openSupervisionPicker" class="px-inline-md py-stack-xs bg-surface-elevated border border-border text-caption font-medium text-ink-secondary rounded-control hover:bg-surface-subtle transition-colors">Add to Supervision</button><button @click="$emit('create-document')" class="px-inline-md py-stack-xs bg-surface-elevated border border-border text-body-sm font-medium text-ink rounded-control hover:bg-surface-subtle transition-colors" data-testid="create-client-document">Create Document</button><button v-if="!client.archived" @click="joinMeeting" :disabled="joiningMeeting || !nextAppointment?.zoom_meeting_id" class="px-inline-md py-stack-xs bg-surface-elevated border border-border text-caption font-medium text-ink-secondary rounded-control hover:bg-surface-subtle transition-colors disabled:opacity-50 disabled:cursor-not-allowed"><span>{{ joiningMeeting ? 'Opening Zoom…' : videoLabel }}</span></button><button v-if="!isSessionWorkspace && !client.archived" @click="openSession" :disabled="openingSession" :aria-busy="openingSession" class="px-inline-md py-stack-xs bg-action-link text-body-sm font-medium text-on-action rounded-control hover:bg-action-link-hover transition-colors shadow-sm disabled:cursor-not-allowed disabled:opacity-60" data-testid="open-session-workspace"><span>{{ openingSession ? 'Opening session…' : 'Open Session Workspace' }}</span></button><button v-if="!isSessionWorkspace" type="button" :disabled="archiveSaving" @click="requestArchiveChange" class="px-inline-md py-stack-xs bg-surface-elevated border border-border text-body-sm font-medium text-ink-secondary rounded-control hover:bg-surface-subtle disabled:opacity-50" data-testid="client-archive-action">{{ archiveSaving ? 'Saving…' : (client.archived ? 'Restore client' : 'Archive client') }}</button></div>
    </div>
    <div v-if="sessionOpenError" role="alert" aria-live="assertive" class="mt-stack-sm rounded-control border border-state-danger/20 bg-state-danger/5 px-inline-md py-stack-xs text-body-sm font-medium text-state-danger">{{ sessionOpenError }}</div>
    <div v-if="meetingError" role="alert" aria-live="assertive" class="mt-stack-sm rounded-control border border-state-danger/20 bg-state-danger/5 px-inline-md py-stack-xs text-body-sm font-medium text-state-danger">{{ meetingError }}</div>
    <div v-if="archiveError" role="alert" class="mt-stack-sm rounded-control border border-state-danger/20 bg-state-danger/5 px-inline-md py-stack-xs text-body-sm text-state-danger">{{ archiveError }}</div>
    <div v-if="supervisionSuccess" role="status" aria-live="polite" class="mt-stack-sm inline-flex flex-wrap items-center gap-inline-sm rounded-control border border-state-success/20 bg-state-success-surface px-inline-md py-stack-xs text-body-sm font-medium text-state-success"><span aria-hidden="true">✓</span><span>{{ supervisionSuccess }}</span><button @click="router.push('/supervision/workspace')" class="ml-inline-xs font-semibold underline underline-offset-2 hover:no-underline">View Supervision Workspace</button></div>
    <ClientSupervisionPicker v-if="supervisionPickerOpen" :client-name="client.display_name" :reflections="supervisionReflections" :sessions="supervisionSessions" :loading="supervisionLoading" :saving="supervisionSaving" :error="supervisionError" @close="closeSupervisionPicker" @confirm="addSelectedToSupervision" />
  </header>
</template>
<script setup>
import { computed, ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import StatusBadge from './StatusBadge.vue';
import ClientSupervisionPicker from './ClientSupervisionPicker.vue';
import { listSessions, createOrResumeSession } from '../../lib/sessions.js';
import { setClientArchived } from '../../lib/clients.js';
import { getPrivateReflectionsForClient } from '../../lib/clientSupervision.js';
import { setReflectionSupervisionSelection } from '../../lib/reflections.js';
import { authenticatedFetch } from '../../lib/api.js';
import { videoProviderService } from '../../lib/videoProvider.js';
const props = defineProps({ client: { type: Object, required: true }, nextAppointment: { type: Object, default: null }, therapistLabel: { type: String, default: 'Current therapist' } });
const emit = defineEmits(['create-document', 'client-updated']);
const router = useRouter(); const route = useRoute(); const isSessionWorkspace = computed(() => route.name === 'SessionWorkspace');
const supervisionPickerOpen = ref(false); const supervisionReflections = ref([]); const supervisionSessions = ref([]); const supervisionLoading = ref(false); const supervisionSaving = ref(false); const supervisionError = ref(''); const supervisionSuccess = ref(''); const archiveSaving = ref(false); const archiveError = ref('');
const openingSession = ref(false); const sessionOpenError = ref(''); const joiningMeeting = ref(false); const meetingError = ref('');
let supervisionSuccessTimer;
async function openSupervisionPicker() { supervisionPickerOpen.value = true; supervisionLoading.value = true; supervisionError.value = ''; supervisionSuccess.value = ''; clearTimeout(supervisionSuccessTimer); try { [supervisionReflections.value, supervisionSessions.value] = await Promise.all([getPrivateReflectionsForClient({ clientId: props.client.id }), listSessions({ clientId: props.client.id })]); } catch (error) { console.error('Failed to load supervision choices:', error); supervisionError.value = 'Could not load private reflections for supervision.'; } finally { supervisionLoading.value = false; } }
function closeSupervisionPicker() { if (!supervisionSaving.value) supervisionPickerOpen.value = false; }
async function addSelectedToSupervision(ids) { supervisionSaving.value = true; supervisionError.value = ''; supervisionSuccess.value = ''; clearTimeout(supervisionSuccessTimer); try { const selected = supervisionReflections.value.filter(r => ids.includes(r.id) && !r.included_in_supervision); const updated = await Promise.all(selected.map(r => setReflectionSupervisionSelection({ reflectionId: r.id, included: true }))); const byId = new Map(updated.map(r => [r.id, r])); supervisionReflections.value = supervisionReflections.value.map(r => byId.get(r.id) || r); supervisionPickerOpen.value = false; if (updated.length) { supervisionSuccess.value = updated.length === 1 ? 'Saved to supervision.' : `${updated.length} reflections saved to supervision.`; supervisionSuccessTimer = setTimeout(() => { supervisionSuccess.value = ''; }, 8000); } } catch (error) { console.error('Failed to add supervision choices:', error); supervisionError.value = 'Could not add the selected reflection to supervision.'; } finally { supervisionSaving.value = false; } }
async function requestArchiveChange() { const archiving = !props.client.archived; const message = archiving ? `Archive ${props.client.display_name}? Their records will be retained and the client can be restored later.` : `Restore ${props.client.display_name} to the active caseload?`; if (!window.confirm(message)) return; archiveSaving.value = true; archiveError.value = ''; try { const updated = await setClientArchived({ clientId: props.client.id, archived: archiving }); emit('client-updated', updated); } catch (error) { console.error('Failed to change client archive state:', { code: error?.code || 'ARCHIVE_CHANGE_FAILED' }); archiveError.value = archiving ? 'Could not archive this client.' : 'Could not restore this client.'; } finally { archiveSaving.value = false; } }
const openSession = async () => {
  if (props.client.archived || openingSession.value) return;
  openingSession.value = true; sessionOpenError.value = '';
  try { const { session } = await createOrResumeSession(props.client.id); await router.push({ name: 'SessionWorkspace', params: { clientId: props.client.id, sessionId: session.id } }); }
  catch (error) { console.error('Failed to open session workspace', { code: error?.code || 'UNKNOWN' }); sessionOpenError.value = error?.code === 'CLIENT_ARCHIVED' ? 'Restore this client before opening a session.' : 'Couldn’t open the session workspace. Please try again.'; }
  finally { openingSession.value = false; }
};
async function joinMeeting() {
  if (!props.nextAppointment?.id || !props.nextAppointment?.zoom_meeting_id || joiningMeeting.value) return;
  joiningMeeting.value = true; meetingError.value = '';
  const popup = window.open('', '_blank');
  if (popup) popup.opener = null;
  try {
    const response = await authenticatedFetch('/api/zoom/join-appointment', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clientId: props.client.id, appointmentId: props.nextAppointment.id }) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.startUrl) throw new Error(data.error || 'Unable to open the Zoom appointment.');
    if (popup) popup.location.replace(data.startUrl); else window.open(data.startUrl, '_blank', 'noopener,noreferrer');
  } catch (error) { if (popup) popup.close(); meetingError.value = error?.message || 'Unable to open the Zoom appointment.'; }
  finally { joiningMeeting.value = false; }
}
const videoLabel = computed(() => videoProviderService.getVideoActionLabel({ videoProvider: 'zoom', meetingUrl: props.nextAppointment?.zoom_meeting_id ? 'available' : null, status: 'Scheduled' }));
const archiveDate = computed(() => props.client.archived_at ? new Date(props.client.archived_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '');
const clientInitials = computed(() => props.client.display_name ? props.client.display_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : '??');
const nextAppointmentLabel = computed(() => props.nextAppointment?.starts_at ? new Date(props.nextAppointment.starts_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Not scheduled');
</script>
