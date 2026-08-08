<template>
  <div class="max-w-3xl mx-auto py-6 sm:py-10 px-4 sm:px-6 w-full overflow-x-hidden">
    <header class="mb-8 sm:mb-10">
      <h1 class="text-h2 sm:text-h1 font-semibold text-ink">Settings</h1>
    </header>

    <section class="mb-12">
      <h2 class="text-caption sm:text-body-sm font-semibold uppercase tracking-wider text-ink-muted mb-4 px-1">Integrations</h2>
      <div class="bg-surface-elevated border border-border-muted rounded-panel overflow-hidden">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between p-4 border-b border-border-muted gap-4">
          <div class="flex items-start sm:items-center gap-4">
            <div class="flex-shrink-0 w-10 h-10 rounded-panel bg-surface-subtle flex items-center justify-center border border-border-muted"><span class="text-h2">📅</span></div>
            <div class="min-w-0 flex-1">
              <div class="text-body font-medium text-ink break-words">Google Calendar</div>
              <div class="text-body-sm break-words" :class="googleStatus === 'Connected' ? 'text-state-success' : 'text-ink-subtle'">
                <template v-if="isLoadingStatus"><span class="text-ink-subtle animate-pulse">Checking status...</span></template>
                <template v-else-if="googleStatus === 'Connected' || googleStatus === 'Reconnect Required'">
                  <div class="flex flex-col mt-1">
                    <span class="font-medium" :class="googleStatus === 'Connected' ? 'text-state-success' : 'text-state-warning'">{{ googleStatus === 'Connected' ? '✓ Connected' : '⚠ Reconnect Required' }}</span>
                    <span v-if="googleEmail" class="text-ink text-body-sm">{{ googleEmail }}</span>
                    <span class="text-ink-subtle text-overline leading-tight">{{ lastSyncedGoogle }}</span>
                  </div>
                </template>
                <template v-else>Not connected</template>
              </div>
            </div>
          </div>
          <div class="flex items-center gap-2 w-full sm:w-auto">
            <template v-if="googleStatus === 'Connected'">
              <details class="relative"><summary class="list-none cursor-pointer min-h-touch sm:min-h-0 px-3 py-2 sm:py-1.5 text-body-sm font-medium text-ink-muted hover:bg-surface-subtle rounded-control">•••</summary><div class="absolute right-0 mt-1 z-10 w-48 bg-surface-elevated border border-border-muted rounded-control shadow-overlay p-1"><button @click="disconnectGoogle" class="w-full text-left px-3 py-2 text-body-sm text-state-danger hover:bg-state-danger-surface rounded">Disconnect Google Calendar</button></div></details>
            </template>
            <template v-else-if="googleStatus === 'Reconnect Required'"><button @click="connectGoogle" :disabled="isConnectingGoogle" class="w-full sm:w-auto min-h-touch sm:min-h-0 px-4 py-2 sm:py-1.5 text-body-sm font-medium text-action-link hover:bg-state-selected rounded-control border border-transparent hover:border-state-selected disabled:opacity-50">{{ isConnectingGoogle ? 'Connecting...' : 'Reconnect' }}</button></template>
            <template v-else><button @click="connectGoogle" :disabled="isConnectingGoogle" class="w-full sm:w-auto min-h-touch sm:min-h-0 px-4 py-2 sm:py-1.5 text-body-sm font-medium text-action-link hover:bg-state-selected rounded-control border border-transparent hover:border-state-selected disabled:opacity-50">{{ isConnectingGoogle ? 'Connecting...' : 'Connect' }}</button></template>
          </div>
        </div>

        <div class="flex flex-col sm:flex-row sm:items-center justify-between p-4 border-b border-border-muted gap-4">
          <div class="flex items-start sm:items-center gap-4">
            <div class="flex-shrink-0 w-10 h-10 rounded-panel bg-surface-subtle flex items-center justify-center border border-border-muted"><span class="text-h2">🎥</span></div>
            <div class="min-w-0 flex-1"><div class="text-body font-medium text-ink break-words">Zoom</div><div class="text-body-sm" :class="zoomStatus === 'Connected' ? 'text-state-success' : 'text-ink-subtle'"><template v-if="isLoadingZoomStatus"><span class="text-ink-subtle animate-pulse">Checking status...</span></template><template v-else-if="zoomStatus === 'Connected'"><span class="font-medium">✓ Connected</span></template><template v-else>Not connected</template></div></div>
          </div>
          <div class="flex items-center gap-2 w-full sm:w-auto">
            <template v-if="zoomStatus === 'Connected'"><details class="relative"><summary class="list-none cursor-pointer min-h-touch sm:min-h-0 px-3 py-2 sm:py-1.5 text-body-sm font-medium text-ink-muted hover:bg-surface-subtle rounded-control">•••</summary><div class="absolute right-0 mt-1 z-10 w-48 bg-surface-elevated border border-border-muted rounded-control shadow-overlay p-1"><button @click="disconnectZoom" class="w-full text-left px-3 py-2 text-body-sm text-state-danger hover:bg-state-danger-surface rounded">Disconnect Zoom</button></div></details></template>
            <template v-else><button @click="connectZoom" :disabled="isConnectingZoom" class="w-full sm:w-auto min-h-touch sm:min-h-0 px-4 py-2 sm:py-1.5 text-body-sm font-medium text-action-link hover:bg-state-selected rounded-control border border-transparent hover:border-state-selected disabled:opacity-50">{{ isConnectingZoom ? 'Connecting...' : 'Connect' }}</button></template>
          </div>
        </div>

        <div v-if="zoomStatus === 'Connected'" class="p-4 bg-surface-subtle">
          <div class="flex flex-col gap-3">
            <div><div class="text-body-sm font-medium text-ink">Zoom Scheduler diagnostic</div><div class="text-caption text-ink-subtle">Temporary preview-only checks. No Helio client or clinical session is created.</div></div>
            <div class="flex flex-col sm:flex-row gap-2">
              <button type="button" :disabled="busyZoomDiagnostic" class="min-h-touch sm:min-h-0 px-4 py-2 text-body-sm font-medium text-action-link border border-border rounded-control hover:bg-surface-muted disabled:opacity-50" @click="checkZoomScheduler">{{ isCheckingZoomScheduler ? 'Checking…' : 'Check Zoom Scheduler' }}</button>
              <button type="button" :disabled="busyZoomDiagnostic" class="min-h-touch sm:min-h-0 px-4 py-2 text-body-sm font-medium text-action-link border border-border rounded-control hover:bg-surface-muted disabled:opacity-50" @click="runZoomSchedulerBookingTest">{{ isTestingZoomSchedulerBooking ? 'Testing booking…' : 'Run test booking' }}</button>
              <button type="button" :disabled="busyZoomDiagnostic" class="min-h-touch sm:min-h-0 px-4 py-2 text-body-sm font-medium text-action-link border border-border rounded-control hover:bg-surface-muted disabled:opacity-50" @click="generateZoomSchedulerSingleUseLink">{{ isGeneratingZoomSchedulerLink ? 'Generating link…' : 'Generate test booking link' }}</button>
            </div>
          </div>

          <div v-if="zoomSchedulerProbe" class="mt-3 p-3 rounded-control border text-body-sm" :class="zoomSchedulerProbe.ok ? 'border-state-success text-state-success bg-surface' : 'border-state-danger text-state-danger bg-surface'">
            <template v-if="zoomSchedulerProbe.ok">✓ Scheduler available · {{ zoomSchedulerProbe.scheduleCount }} schedule(s) · {{ zoomSchedulerProbe.availableSlotCount }} available slot(s)</template>
            <template v-else>Scheduler check failed: {{ zoomSchedulerProbe.message }}</template>
          </div>

          <div v-if="zoomSchedulerBookingTest" class="mt-3 p-3 rounded-control border text-body-sm" :class="zoomSchedulerBookingTest.ok ? 'border-state-success text-state-success bg-surface' : 'border-state-danger text-state-danger bg-surface'">
            <template v-if="zoomSchedulerBookingTest.ok">✓ Test booking created and cancelled · Zoom meeting {{ zoomSchedulerBookingTest.zoomMeetingPresent ? 'confirmed' : 'not reported by API' }}</template>
            <template v-else>Test booking failed: {{ zoomSchedulerBookingTest.message }}</template>
          </div>

          <div v-if="zoomSchedulerSingleUseLink" class="mt-3 p-3 rounded-control border text-body-sm" :class="zoomSchedulerSingleUseLink.ok ? 'border-state-success text-state-success bg-surface' : 'border-state-danger text-state-danger bg-surface'">
            <template v-if="zoomSchedulerSingleUseLink.ok">
              <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <span>✓ Single-use booking link created</span>
                <a :href="zoomSchedulerSingleUseLink.link" target="_blank" rel="noopener noreferrer" class="inline-flex justify-center min-h-touch sm:min-h-0 px-4 py-2 text-body-sm font-medium text-action-link border border-border rounded-control hover:bg-surface-muted">Open test booking link</a>
              </div>
            </template>
            <template v-else>Single-use link failed: {{ zoomSchedulerSingleUseLink.message }}</template>
          </div>
        </div>
      </div>
    </section>

    <section class="mb-12"><h2 class="text-caption sm:text-body-sm font-semibold uppercase tracking-wider text-ink-muted mb-4 px-1">Video Consultation</h2><div class="bg-surface-elevated border border-border-muted rounded-panel p-6"><div class="max-w-md"><label for="default-video-provider" class="block text-body-sm font-medium text-ink-secondary mb-2">Default Video Provider</label><select id="default-video-provider" v-model="defaultVideoProvider" class="w-full min-h-touch rounded-panel border border-border px-3 text-body outline-none focus:ring-2 focus:ring-state-focus-ring focus:border-action-link bg-surface"><option value="zoom">Zoom</option><option value="microsoft_teams">Microsoft Teams</option><option value="google_meet">Google Meet</option><option value="custom">Custom meeting link</option><option value="in_person">In person</option></select><div v-if="defaultVideoProvider === 'custom'" class="mt-4"><label for="default-meeting-link" class="block text-body-sm font-medium text-ink-secondary mb-2">Default Meeting Link</label><input id="default-meeting-link" type="url" v-model="defaultMeetingLink" placeholder="https://..." class="w-full min-h-touch rounded-panel border border-border px-3 text-body outline-none focus:ring-2 focus:ring-state-focus-ring focus:border-action-link" /></div><div class="mt-6 p-4 bg-surface-subtle border border-border-muted rounded-panel"><p class="text-body-sm text-ink-muted italic">"These settings are stored only in local demonstration state."</p></div><div class="mt-4 space-y-3"><p class="text-caption text-ink-subtle">Integration status:</p><ul class="text-caption text-ink-subtle list-disc list-inside space-y-1"><li>Google Meet connects through Google Workspace.</li><li>Zoom connects through Zoom OAuth.</li><li>Custom links may be entered manually.</li></ul></div></div></div></section>

    <section class="mb-12"><h2 class="text-caption sm:text-body-sm font-semibold uppercase tracking-wider text-ink-muted mb-4 px-1">Account</h2><div class="bg-surface-elevated border border-border-muted rounded-panel p-4 flex items-center justify-between gap-4"><div><div class="text-body font-medium text-ink">Therapist account</div><div class="text-body-sm text-ink-subtle">Secure Supabase session</div></div><button @click="signOut" class="px-4 py-2 text-body-sm font-medium text-state-danger hover:bg-state-danger-surface rounded-control">Sign out</button></div></section>
  </div>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue'
import { authenticatedFetch } from '../lib/api.js'
import { supabase } from '../lib/supabase.js'

const googleStatus = ref('Not connected')
const googleEmail = ref('')
const lastSyncedGoogle = ref('Not synced yet')
const isConnectingGoogle = ref(false)
const isLoadingStatus = ref(true)
const zoomStatus = ref('Not connected')
const isConnectingZoom = ref(false)
const isLoadingZoomStatus = ref(true)
const isCheckingZoomScheduler = ref(false)
const zoomSchedulerProbe = ref(null)
const isTestingZoomSchedulerBooking = ref(false)
const zoomSchedulerBookingTest = ref(null)
const isGeneratingZoomSchedulerLink = ref(false)
const zoomSchedulerSingleUseLink = ref(null)
const defaultVideoProvider = ref('zoom')
const defaultMeetingLink = ref('')
const showSuccess = ref(false)
const successMessage = ref('')
const busyZoomDiagnostic = computed(() => isCheckingZoomScheduler.value || isTestingZoomSchedulerBooking.value || isGeneratingZoomSchedulerLink.value)

onMounted(async () => {
  const params = new URLSearchParams(window.location.search)
  if (params.get('google') === 'success') { successMessage.value = 'Google Calendar connected successfully'; showSuccess.value = true; cleanupUrl() }
  if (params.get('zoom') === 'success') { successMessage.value = 'Zoom connected successfully'; showSuccess.value = true; cleanupUrl() }
  if (params.get('google') === 'error') { alert(params.get('message') || 'Google connection failed'); cleanupUrl() }
  if (params.get('zoom') === 'error') { alert(params.get('message') || 'Zoom connection failed'); cleanupUrl() }
  await Promise.all([fetchGoogleStatus(), fetchZoomStatus()])
})

const formatSyncTime = (value) => { if (!value) return 'Not synced yet'; const date = new Date(value); const elapsed = Date.now() - date.getTime(); if (elapsed >= 0 && elapsed < 60000) return 'Synced just now'; if (elapsed >= 0 && elapsed < 3600000) return `Last synced ${Math.floor(elapsed / 60000)}m ago`; return `Last synced ${date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}` }
const cleanupUrl = () => { window.history.replaceState({}, document.title, window.location.pathname); setTimeout(() => { showSuccess.value = false }, 3000) }

const fetchGoogleStatus = async () => { isLoadingStatus.value = true; try { const response = await authenticatedFetch('/api/google/status'); if (response.ok) { const data = await response.json(); if (data.connected) { googleEmail.value = data.email || ''; googleStatus.value = ['GOOGLE_TOKEN_EXPIRED','GOOGLE_REVOKED','GOOGLE_TOKEN_MISSING'].includes(data.error) ? 'Reconnect Required' : 'Connected'; lastSyncedGoogle.value = formatSyncTime(data.last_synced_at) } else { googleStatus.value = 'Not connected'; googleEmail.value = '' } } } catch (err) { console.error('Failed to fetch Google status:', err) } finally { isLoadingStatus.value = false } }
const fetchZoomStatus = async () => { isLoadingZoomStatus.value = true; try { const response = await authenticatedFetch('/api/zoom/status'); const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Unable to check Zoom connection'); zoomStatus.value = data.connected ? 'Connected' : 'Not connected' } catch (error) { console.error('Failed to fetch Zoom status:', error); zoomStatus.value = 'Not connected' } finally { isLoadingZoomStatus.value = false } }

const checkZoomScheduler = async () => { isCheckingZoomScheduler.value = true; zoomSchedulerProbe.value = null; try { const response = await authenticatedFetch('/api/zoom/scheduler/probe'); const data = await response.json().catch(() => ({})); if (!response.ok) throw new Error(data.error || 'Unable to check Zoom Scheduler'); zoomSchedulerProbe.value = { ok: Boolean(data.schedulerAvailable), scheduleCount: Number(data.scheduleCount || 0), availableSlotCount: Number(data.availableSlotCount || 0), message: '' } } catch (error) { zoomSchedulerProbe.value = { ok: false, scheduleCount: 0, availableSlotCount: 0, message: error.message } } finally { isCheckingZoomScheduler.value = false } }
const runZoomSchedulerBookingTest = async () => { isTestingZoomSchedulerBooking.value = true; zoomSchedulerBookingTest.value = null; try { const response = await authenticatedFetch('/api/zoom/scheduler/test-booking', { method: 'POST' }); const data = await response.json().catch(() => ({})); if (!response.ok) throw new Error(data.error || 'Zoom Scheduler booking test failed'); zoomSchedulerBookingTest.value = { ok: Boolean(data.created && data.cancelled), zoomMeetingPresent: Boolean(data.zoomMeetingPresent), message: '' } } catch (error) { zoomSchedulerBookingTest.value = { ok: false, zoomMeetingPresent: false, message: error.message } } finally { isTestingZoomSchedulerBooking.value = false } }
const generateZoomSchedulerSingleUseLink = async () => { isGeneratingZoomSchedulerLink.value = true; zoomSchedulerSingleUseLink.value = null; try { const response = await authenticatedFetch('/api/zoom/scheduler/test-single-use-link', { method: 'POST' }); const data = await response.json().catch(() => ({})); if (!response.ok) throw new Error(data.error || 'Unable to create single-use booking link'); zoomSchedulerSingleUseLink.value = { ok: Boolean(data.created && data.link), link: data.link || '', message: '' } } catch (error) { zoomSchedulerSingleUseLink.value = { ok: false, link: '', message: error.message } } finally { isGeneratingZoomSchedulerLink.value = false } }

const connectZoom = async () => { isConnectingZoom.value = true; try { const response = await authenticatedFetch('/api/zoom/authorize', { method: 'POST' }); const data = await response.json(); if (!response.ok || !data.url) throw new Error(data.error || 'Unable to start Zoom connection'); window.location.href = data.url } catch (error) { alert(error.message); isConnectingZoom.value = false } }
const disconnectZoom = async () => { if (!confirm('Disconnect Zoom? Helio will no longer retrieve future Zoom transcripts.')) return; try { const response = await authenticatedFetch('/api/zoom/disconnect', { method: 'POST' }); const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Unable to disconnect Zoom'); zoomStatus.value = 'Not connected'; zoomSchedulerProbe.value = null; zoomSchedulerBookingTest.value = null; zoomSchedulerSingleUseLink.value = null; successMessage.value = 'Zoom disconnected'; showSuccess.value = true; setTimeout(() => showSuccess.value = false, 3000) } catch (error) { console.error('Failed to disconnect Zoom:', error); alert(error.message) } }
const connectGoogle = async () => { isConnectingGoogle.value = true; try { const response = await authenticatedFetch('/api/google/authorize', { method: 'POST' }); const data = await response.json(); if (!response.ok || !data.url) throw new Error(data.error || 'Unable to start Google connection'); window.location.href = data.url } catch (error) { alert(error.message); isConnectingGoogle.value = false } }
const disconnectGoogle = async () => { if (!confirm('Disconnect Google Calendar?')) return; try { const response = await authenticatedFetch('/api/google/disconnect', { method: 'POST' }); const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Unable to disconnect Google Calendar'); googleStatus.value = 'Not connected'; googleEmail.value = ''; lastSyncedGoogle.value = 'Not synced yet' } catch (err) { console.error('Failed to disconnect Google:', err); alert('Failed to disconnect Google Calendar') } }
const signOut = async () => { await supabase.auth.signOut() }
</script>
