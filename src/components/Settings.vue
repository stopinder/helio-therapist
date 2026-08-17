<template>
  <div class="max-w-3xl mx-auto py-6 sm:py-10 px-4 sm:px-6 w-full overflow-x-hidden">
    <header class="mb-8 sm:mb-10"><h1 class="text-h2 sm:text-h1 font-semibold text-ink">Settings</h1></header>

    <section class="mb-12">
      <h2 class="text-caption sm:text-body-sm font-semibold uppercase tracking-wider text-ink-muted mb-4 px-1">Integrations</h2>
      <div class="bg-surface-elevated border border-border-muted rounded-panel overflow-hidden">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between p-4 border-b border-border-muted gap-4">
          <div class="flex items-start sm:items-center gap-4">
            <div class="flex-shrink-0 w-10 h-10 rounded-panel bg-surface-subtle flex items-center justify-center border border-border-muted"><span class="text-h2">📅</span></div>
            <div class="min-w-0 flex-1">
              <div class="text-body font-medium text-ink break-words">Google Calendar</div>
              <div class="text-body-sm break-words" :class="googleStatus === 'Connected' ? 'text-state-success' : 'text-ink-subtle'">
                <span v-if="isLoadingStatus" class="text-ink-subtle animate-pulse">Checking status...</span>
                <div v-else-if="googleStatus === 'Connected' || googleStatus === 'Reconnect Required'" class="flex flex-col mt-1">
                  <span class="font-medium" :class="googleStatus === 'Connected' ? 'text-state-success' : 'text-state-warning'">{{ googleStatus === 'Connected' ? '✓ Connected' : '⚠ Reconnect Required' }}</span>
                  <span v-if="googleEmail" class="text-ink text-body-sm">{{ googleEmail }}</span>
                  <span class="text-ink-subtle text-overline leading-tight">{{ lastSyncedGoogle }}</span>
                </div>
                <span v-else>Not connected</span>
              </div>
            </div>
          </div>
          <div class="flex items-center gap-2 w-full sm:w-auto">
            <details v-if="googleStatus === 'Connected'" class="relative">
              <summary class="list-none cursor-pointer min-h-touch sm:min-h-0 px-3 py-2 sm:py-1.5 text-body-sm font-medium text-ink-muted hover:bg-surface-subtle rounded-control">•••</summary>
              <div class="absolute right-0 mt-1 z-10 w-48 bg-surface-elevated border border-border-muted rounded-control shadow-overlay p-1"><button @click="disconnectGoogle" class="w-full text-left px-3 py-2 text-body-sm text-state-danger hover:bg-state-danger-surface rounded">Disconnect Google Calendar</button></div>
            </details>
            <button v-else @click="connectGoogle" :disabled="isConnectingGoogle" class="w-full sm:w-auto min-h-touch sm:min-h-0 px-4 py-2 sm:py-1.5 text-body-sm font-medium text-action-link hover:bg-state-selected rounded-control border border-transparent hover:border-state-selected disabled:opacity-50">{{ isConnectingGoogle ? 'Connecting...' : googleStatus === 'Reconnect Required' ? 'Reconnect' : 'Connect' }}</button>
          </div>
        </div>

        <div class="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-4">
          <div class="flex items-start sm:items-center gap-4">
            <div class="flex-shrink-0 w-10 h-10 rounded-panel bg-surface-subtle flex items-center justify-center border border-border-muted"><span class="text-h2">🎥</span></div>
            <div class="min-w-0 flex-1">
              <div class="text-body font-medium text-ink break-words">Zoom</div>
              <div class="text-body-sm" :class="zoomStatus === 'Connected' ? 'text-state-success' : 'text-ink-subtle'">
                <span v-if="isLoadingZoomStatus" class="text-ink-subtle animate-pulse">Checking status...</span>
                <span v-else-if="zoomStatus === 'Connected'" class="font-medium">✓ Connected</span>
                <span v-else>Not connected</span>
              </div>
            </div>
          </div>
          <div class="flex items-center gap-2 w-full sm:w-auto">
            <details v-if="zoomStatus === 'Connected'" class="relative">
              <summary class="list-none cursor-pointer min-h-touch sm:min-h-0 px-3 py-2 sm:py-1.5 text-body-sm font-medium text-ink-muted hover:bg-surface-subtle rounded-control">•••</summary>
              <div class="absolute right-0 mt-1 z-10 w-48 bg-surface-elevated border border-border-muted rounded-control shadow-overlay p-1"><button @click="disconnectZoom" class="w-full text-left px-3 py-2 text-body-sm text-state-danger hover:bg-state-danger-surface rounded">Disconnect Zoom</button></div>
            </details>
            <button v-else @click="connectZoom" :disabled="isConnectingZoom" class="w-full sm:w-auto min-h-touch sm:min-h-0 px-4 py-2 sm:py-1.5 text-body-sm font-medium text-action-link hover:bg-state-selected rounded-control border border-transparent hover:border-state-selected disabled:opacity-50">{{ isConnectingZoom ? 'Connecting...' : 'Connect' }}</button>
          </div>
        </div>
      </div>
      <p class="mt-3 px-1 text-caption text-ink-subtle">Only integrations with a supported Helio workflow are shown here. Video links are chosen when scheduling or working with an appointment rather than stored as a separate default setting.</p>
    </section>

    <section class="mb-12">
      <h2 class="text-caption sm:text-body-sm font-semibold uppercase tracking-wider text-ink-muted mb-4 px-1">Account</h2>
      <div class="bg-surface-elevated border border-border-muted rounded-panel p-4 flex items-center justify-between gap-4">
        <div><div class="text-body font-medium text-ink">Therapist account</div><div class="text-body-sm text-ink-subtle">Secure Supabase session</div></div>
        <button @click="signOut" class="px-4 py-2 text-body-sm font-medium text-state-danger hover:bg-state-danger-surface rounded-control">Sign out</button>
      </div>
    </section>

    <Transition name="fade">
      <div v-if="showSuccess" class="fixed bottom-8 left-1/2 transform -translate-x-1/2 bg-ink text-on-action px-6 py-3 rounded-pill shadow-overlay flex items-center gap-3 z-50"><span class="text-state-success">✓</span><span class="text-body font-medium">{{ successMessage }}</span></div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
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
const showSuccess = ref(false)
const successMessage = ref('')

onMounted(async () => {
  const params = new URLSearchParams(window.location.search)
  if (params.get('google') === 'success') { successMessage.value = 'Google Calendar connected successfully'; showSuccess.value = true; cleanupUrl() }
  if (params.get('zoom') === 'success') { successMessage.value = 'Zoom connected successfully'; showSuccess.value = true; cleanupUrl() }
  if (params.get('google') === 'error') { alert(params.get('message') || 'Google connection failed'); cleanupUrl() }
  if (params.get('zoom') === 'error') { alert(params.get('message') || 'Zoom connection failed'); cleanupUrl() }
  await Promise.all([fetchGoogleStatus(), fetchZoomStatus()])
})

const formatSyncTime = (value) => {
  if (!value) return 'Not synced yet'
  const date = new Date(value), elapsed = Date.now() - date.getTime()
  if (elapsed >= 0 && elapsed < 60000) return 'Synced just now'
  if (elapsed >= 0 && elapsed < 3600000) return `Last synced ${Math.floor(elapsed / 60000)}m ago`
  return `Last synced ${date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`
}
const cleanupUrl = () => { window.history.replaceState({}, document.title, window.location.pathname); setTimeout(() => { showSuccess.value = false }, 3000) }
const fetchGoogleStatus = async () => { isLoadingStatus.value = true; try { const response = await authenticatedFetch('/api/google/status'); if (response.ok) { const data = await response.json(); if (data.connected) { googleEmail.value = data.email || ''; googleStatus.value = ['GOOGLE_TOKEN_EXPIRED','GOOGLE_REVOKED','GOOGLE_TOKEN_MISSING'].includes(data.error) ? 'Reconnect Required' : 'Connected'; lastSyncedGoogle.value = formatSyncTime(data.last_synced_at) } else { googleStatus.value = 'Not connected'; googleEmail.value = '' } } } catch (err) { console.error('Failed to fetch Google status:', err) } finally { isLoadingStatus.value = false } }
const fetchZoomStatus = async () => { isLoadingZoomStatus.value = true; try { const response = await authenticatedFetch('/api/zoom/status'); const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Unable to check Zoom connection'); zoomStatus.value = data.connected ? 'Connected' : 'Not connected' } catch (error) { console.error('Failed to fetch Zoom status:', error); zoomStatus.value = 'Not connected' } finally { isLoadingZoomStatus.value = false } }
const connectGoogle = async () => { isConnectingGoogle.value = true; try { const response = await authenticatedFetch('/api/google/authorize', { method:'POST' }); const data = await response.json(); if (!response.ok || !data.url) throw new Error(data.error || 'Unable to start Google connection'); window.location.href = data.url } catch (error) { alert(error.message); isConnectingGoogle.value = false } }
const disconnectGoogle = async () => { if (!confirm('Disconnect Google Calendar?')) return; try { const response = await authenticatedFetch('/api/google/disconnect', { method:'POST' }); const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Unable to disconnect Google Calendar'); googleStatus.value='Not connected'; googleEmail.value=''; lastSyncedGoogle.value='Not synced yet'; successMessage.value='Google Calendar disconnected'; showSuccess.value=true; setTimeout(()=>showSuccess.value=false,3000) } catch (err) { console.error('Failed to disconnect Google:',err); alert('Failed to disconnect Google Calendar') } }
const connectZoom = async () => { isConnectingZoom.value=true; try { const response=await authenticatedFetch('/api/zoom/authorize',{method:'POST'}); const data=await response.json(); if(!response.ok||!data.url)throw new Error(data.error||'Unable to start Zoom connection'); window.location.href=data.url } catch(error){ alert(error.message); isConnectingZoom.value=false } }
const disconnectZoom = async () => { if(!confirm('Disconnect Zoom? Helio will no longer retrieve future Zoom transcripts.'))return; try { const response=await authenticatedFetch('/api/zoom/disconnect',{method:'POST'}); const data=await response.json(); if(!response.ok)throw new Error(data.error||'Unable to disconnect Zoom'); zoomStatus.value='Not connected'; successMessage.value='Zoom disconnected'; showSuccess.value=true; setTimeout(()=>showSuccess.value=false,3000) } catch(error){ console.error('Failed to disconnect Zoom:',error); alert(error.message) } }
const signOut = async () => { await supabase.auth.signOut() }
</script>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s ease, transform 0.3s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; transform: translate(-50%, 20px); }
</style>
