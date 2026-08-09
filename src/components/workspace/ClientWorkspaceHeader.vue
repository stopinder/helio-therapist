<template>
  <header class="bg-surface border-b border-border-muted px-inline-lg py-stack-md">
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-stack-md">
      <div class="flex items-center gap-inline-md"><div class="h-10 w-10 rounded-pill bg-avatar flex items-center justify-center text-h3 font-semibold text-ink shrink-0">{{ clientInitials }}</div><div class="flex flex-col min-w-0"><div class="flex items-center gap-inline-sm flex-wrap"><h1 class="text-h2 font-semibold text-ink truncate">{{ client.display_name }}</h1><StatusBadge :status="client?.status || 'unknown'" /></div><div class="flex flex-wrap items-center gap-x-inline-md gap-y-0 text-caption text-ink-muted"><span>Next: {{ client.next_appointment }}</span><span>Therapist: {{ client.primary_therapist }}</span></div></div></div>
      <div class="flex items-center gap-inline-sm flex-wrap"><button @click="openSupervisionPicker" class="px-inline-md py-stack-xs bg-surface-elevated border border-border text-caption font-medium text-ink-secondary rounded-control hover:bg-surface-subtle transition-colors">Add to Supervision</button><button @click="documentComposerOpen = true" class="px-inline-md py-stack-xs bg-surface-elevated border border-border text-body-sm font-medium text-ink rounded-control hover:bg-surface-subtle transition-colors" data-testid="create-client-document">Create Document</button><button @click="joinMeeting" class="px-inline-md py-stack-xs bg-surface-elevated border border-border text-caption font-medium text-ink-secondary rounded-control hover:bg-surface-subtle transition-colors"><span>{{ videoLabel }}</span></button><button v-if="!isSessionWorkspace" @click="openSession" class="px-inline-md py-stack-xs bg-action-link text-body-sm font-medium text-on-action rounded-control hover:bg-action-link-hover transition-colors shadow-sm">Open Session Workspace</button></div>
    </div>
    <div v-if="supervisionSuccess" role="status" aria-live="polite" class="mt-stack-sm inline-flex flex-wrap items-center gap-inline-sm rounded-control border border-state-success/20 bg-state-success-surface px-inline-md py-stack-xs text-body-sm font-medium text-state-success"><span aria-hidden="true">✓</span><span>{{ supervisionSuccess }}</span><button @click="router.push('/supervision/workspace')" class="ml-inline-xs font-semibold underline underline-offset-2 hover:no-underline">View Supervision Workspace</button></div>
    <ClientSupervisionPicker v-if="supervisionPickerOpen" :client-name="client.display_name" :reflections="supervisionReflections" :sessions="supervisionSessions" :loading="supervisionLoading" :saving="supervisionSaving" :error="supervisionError" @close="closeSupervisionPicker" @confirm="addSelectedToSupervision" />
    <ClientDocumentComposer v-if="documentComposerOpen" :client="client" @close="documentComposerOpen = false" @saved="documentSaved" />
  </header>
</template>
<script setup>
import { computed, ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import StatusBadge from './StatusBadge.vue';
import ClientSupervisionPicker from './ClientSupervisionPicker.vue';
import ClientDocumentComposer from './ClientDocumentComposer.vue';
import { listSessions, createOrResumeSession } from '../../lib/sessions.js';
import { getPrivateReflectionsForClient } from '../../lib/clientSupervision.js';
import { setReflectionSupervisionSelection } from '../../lib/reflections.js';
import { videoProviderService } from '../../lib/videoProvider.js';
const props = defineProps({ client: { type: Object, required: true } });
const emit = defineEmits(['document-saved']);
const router = useRouter(); const route = useRoute(); const isSessionWorkspace = computed(() => route.name === 'SessionWorkspace');
const documentComposerOpen = ref(false);
const supervisionPickerOpen = ref(false); const supervisionReflections = ref([]); const supervisionSessions = ref([]); const supervisionLoading = ref(false); const supervisionSaving = ref(false); const supervisionError = ref(''); const supervisionSuccess = ref('');
let supervisionSuccessTimer;
function documentSaved(document) { emit('document-saved', document); }
async function openSupervisionPicker() { supervisionPickerOpen.value = true; supervisionLoading.value = true; supervisionError.value = ''; supervisionSuccess.value = ''; clearTimeout(supervisionSuccessTimer); try { [supervisionReflections.value, supervisionSessions.value] = await Promise.all([getPrivateReflectionsForClient({ clientId: props.client.id }), listSessions({ clientId: props.client.id })]); } catch (error) { console.error('Failed to load supervision choices:', error); supervisionError.value = 'Could not load private reflections for supervision.'; } finally { supervisionLoading.value = false; } }
function closeSupervisionPicker() { if (!supervisionSaving.value) supervisionPickerOpen.value = false; }
async function addSelectedToSupervision(ids) { supervisionSaving.value = true; supervisionError.value = ''; supervisionSuccess.value = ''; clearTimeout(supervisionSuccessTimer); try { const selected = supervisionReflections.value.filter(r => ids.includes(r.id) && !r.included_in_supervision); const updated = await Promise.all(selected.map(r => setReflectionSupervisionSelection({ reflectionId: r.id, included: true }))); const byId = new Map(updated.map(r => [r.id, r])); supervisionReflections.value = supervisionReflections.value.map(r => byId.get(r.id) || r); supervisionPickerOpen.value = false; if (updated.length) { supervisionSuccess.value = updated.length === 1 ? 'Saved to supervision.' : `${updated.length} reflections saved to supervision.`; supervisionSuccessTimer = setTimeout(() => { supervisionSuccess.value = ''; }, 8000); } } catch (error) { console.error('Failed to add supervision choices:', error); supervisionError.value = 'Could not add the selected reflection to supervision.'; } finally { supervisionSaving.value = false; } }
const openSession = async () => { try { const { session } = await createOrResumeSession(props.client.id); router.push({ name: 'SessionWorkspace', params: { clientId: props.client.id, sessionId: session.id } }); } catch (error) { console.error('Failed to open session workspace:', error); } };
const joinMeeting = () => videoProviderService.openMeeting({ videoProvider: 'zoom', meetingUrl: 'https://zoom.us/j/123456789' });
const videoLabel = computed(() => videoProviderService.getVideoActionLabel({ videoProvider: 'zoom', meetingUrl: 'https://zoom.us/j/123456789', status: 'Scheduled' }));
const clientInitials = computed(() => props.client.display_name ? props.client.display_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : '??');
</script>
