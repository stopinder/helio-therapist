<template>
  <div class="max-w-3xl mx-auto py-6 sm:py-10 px-4 sm:px-6 w-full overflow-x-hidden">
    <header class="mb-8 sm:mb-10">
      <h1 class="text-h2 sm:text-h1 font-semibold text-ink">Settings</h1>
    </header>

    <!-- Configuration only: routine calendar recovery happens in the workspace. -->
    <section class="mb-12">
      <h2 class="text-caption sm:text-body-sm font-semibold uppercase tracking-wider text-ink-muted mb-4 px-1">
        Scheduling
      </h2>
      
      <div class="bg-surface-elevated border border-border-muted rounded-panel overflow-hidden ">
        <!-- Google Calendar -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between p-4 border-b border-border-muted gap-4">
          <div class="flex items-start sm:items-center gap-4">
            <div class="flex-shrink-0 w-10 h-10 rounded-panel bg-surface-subtle flex items-center justify-center border border-border-muted">
              <span class="text-h2">📅</span>
            </div>
            <div class="min-w-0 flex-1">
              <div class="text-body font-medium text-ink break-words">Google Calendar</div>
              <div class="text-body-sm break-words" :class="googleStatus === 'Connected' ? 'text-state-success' : 'text-ink-subtle'">
                <template v-if="isLoadingStatus">
                  <span class="text-ink-subtle animate-pulse">Checking status...</span>
                </template>
                <template v-else-if="googleStatus === 'Connected' || googleStatus === 'Reconnect Required'">
                  <div class="flex flex-col mt-1">
                    <span class="font-medium" :class="googleStatus === 'Connected' ? 'text-state-success' : 'text-state-warning'">
                      {{ googleStatus === 'Connected' ? '✓ Connected' : '⚠ Reconnect Required' }}
                    </span>
                    <span v-if="googleEmail" class="text-ink text-body-sm">{{ googleEmail }}</span>
                    <span class="text-ink-subtle text-overline leading-tight">{{ lastSyncedGoogle }}</span>
                  </div>
                </template>
                <template v-else>
                  Not connected
                </template>
              </div>
            </div>
          </div>
          <div class="flex items-center gap-2 w-full sm:w-auto">
            <template v-if="googleStatus === 'Connected'">
              <details class="relative">
                <summary class="list-none cursor-pointer min-h-touch sm:min-h-0 px-3 py-2 sm:py-1.5 text-body-sm font-medium text-ink-muted hover:bg-surface-subtle rounded-control">•••</summary>
                <div class="absolute right-0 mt-1 z-10 w-48 bg-surface-elevated border border-border-muted rounded-control shadow-overlay p-1">
                  <button @click="disconnectGoogle" class="w-full text-left px-3 py-2 text-body-sm text-state-danger hover:bg-state-danger-surface rounded">Disconnect Google Calendar</button>
                </div>
              </details>
            </template>
            <template v-else-if="googleStatus === 'Reconnect Required'">
              <button 
                @click="connectGoogle" 
                :disabled="isConnectingGoogle"
                class="w-full sm:w-auto min-h-touch sm:min-h-0 px-4 py-2 sm:py-1.5 text-body-sm font-medium text-action-link hover:bg-state-selected rounded-control transition-colors duration-standard ease-out border border-transparent hover:border-state-selected disabled:opacity-50 text-center"
              >
                {{ isConnectingGoogle ? 'Connecting...' : 'Reconnect' }}
              </button>
            </template>
            <template v-else>
              <button 
                @click="connectGoogle" 
                :disabled="isConnectingGoogle"
                class="w-full sm:w-auto min-h-touch sm:min-h-0 px-4 py-2 sm:py-1.5 text-body-sm font-medium text-action-link hover:bg-state-selected rounded-control transition-colors duration-standard ease-out border border-transparent hover:border-state-selected disabled:opacity-50 text-center"
              >
                {{ isConnectingGoogle ? 'Connecting...' : 'Connect' }}
              </button>
            </template>
          </div>
        </div>

        <!-- Microsoft Teams (Mock) -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between p-4 border-b border-border-muted gap-4">
          <div class="flex items-start sm:items-center gap-4">
            <div class="flex-shrink-0 w-10 h-10 rounded-panel bg-surface-subtle flex items-center justify-center border border-border-muted">
              <span class="text-h2" aria-hidden="true">👥</span>
            </div>
            <div class="min-w-0 flex-1">
              <div class="text-body font-medium text-ink break-words">Microsoft Teams</div>
              <div class="text-body-sm text-ink-subtle break-words">Not connected</div>
            </div>
          </div>
          <button class="w-full sm:w-auto min-h-touch sm:min-h-0 px-4 py-2 sm:py-1.5 text-body-sm font-medium text-action-link hover:bg-state-selected rounded-control transition-colors duration-standard ease-out border border-transparent hover:border-state-selected text-center" aria-label="Connect Microsoft Teams">
            Connect
          </button>
        </div>

        <!-- Google Meet (Mock) -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between p-4 border-b border-border-muted gap-4">
          <div class="flex items-start sm:items-center gap-4">
            <div class="flex-shrink-0 w-10 h-10 rounded-panel bg-surface-subtle flex items-center justify-center border border-border-muted">
              <span class="text-h2" aria-hidden="true">🎥</span>
            </div>
            <div class="min-w-0 flex-1">
              <div class="text-body font-medium text-ink break-words">Google Meet</div>
              <div class="text-body-sm text-ink-subtle break-words">Not connected</div>
            </div>
          </div>
          <button class="w-full sm:w-auto min-h-touch sm:min-h-0 px-4 py-2 sm:py-1.5 text-body-sm font-medium text-action-link hover:bg-state-selected rounded-control transition-colors duration-standard ease-out border border-transparent hover:border-state-selected text-center" aria-label="Connect Google Meet">
            Connect
          </button>
        </div>

        <!-- Outlook Calendar -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-4">
          <div class="flex items-start sm:items-center gap-4">
            <div class="flex-shrink-0 w-10 h-10 rounded-panel bg-surface-subtle flex items-center justify-center border border-border-muted">
              <span class="text-h2">📧</span>
            </div>
            <div class="min-w-0 flex-1">
              <div class="text-body font-medium text-ink break-words">Outlook Calendar</div>
              <div class="text-body-sm text-ink-subtle break-words">Not connected</div>
            </div>
          </div>
          <button class="w-full sm:w-auto min-h-touch sm:min-h-0 px-4 py-2 sm:py-1.5 text-body-sm font-medium text-action-link hover:bg-state-selected rounded-control transition-colors duration-standard ease-out border border-transparent hover:border-state-selected text-center">
            Connect
          </button>
        </div>
      </div>
    </section>

    <section class="mb-12">
      <h2 class="text-caption sm:text-body-sm font-semibold uppercase tracking-wider text-ink-muted mb-4 px-1">
        Video Consultation
      </h2>
      <div class="bg-surface-elevated border border-border-muted rounded-panel p-6">
        <div class="max-w-md">
          <label for="default-video-provider" class="block text-body-sm font-medium text-ink-secondary mb-2">
            Default Video Provider
          </label>
          <select 
            id="default-video-provider"
            v-model="defaultVideoProvider"
            class="w-full min-h-touch rounded-panel border border-border px-3 text-body outline-none focus:ring-2 focus:ring-state-focus-ring focus:border-action-link bg-surface"
          >
            <option value="zoom">Zoom</option>
            <option value="microsoft_teams">Microsoft Teams</option>
            <option value="google_meet">Google Meet</option>
            <option value="custom">Custom meeting link</option>
            <option value="in_person">In person</option>
          </select>

          <div v-if="defaultVideoProvider === 'custom'" class="mt-4">
            <label for="default-meeting-link" class="block text-body-sm font-medium text-ink-secondary mb-2">
              Default Meeting Link
            </label>
            <input 
              id="default-meeting-link"
              type="url"
              v-model="defaultMeetingLink"
              placeholder="https://..."
              class="w-full min-h-touch rounded-panel border border-border px-3 text-body outline-none focus:ring-2 focus:ring-state-focus-ring focus:border-action-link"
            />
          </div>

          <div class="mt-6 p-4 bg-surface-subtle border border-border-muted rounded-panel">
            <p class="text-body-sm text-ink-muted italic">
              "These settings are stored only in local demonstration state."
            </p>
          </div>

          <div class="mt-4 space-y-3">
            <p class="text-caption text-ink-subtle">Future integration notices:</p>
            <ul class="text-caption text-ink-subtle list-disc list-inside space-y-1">
              <li>Microsoft Teams may later connect through Microsoft 365 / Outlook.</li>
              <li>Google Meet may later connect through Google Workspace.</li>
              <li>Zoom may later connect through Zoom OAuth.</li>
              <li>Custom links may be entered manually.</li>
            </ul>
          </div>
        </div>
      </div>
    </section>

    <section class="mb-12">
      <h2 class="text-caption sm:text-body-sm font-semibold uppercase tracking-wider text-ink-muted mb-4 px-1">
        Account
      </h2>
      <div class="bg-surface-elevated border border-border-muted rounded-panel p-4  flex items-center justify-between gap-4">
        <div>
          <div class="text-body font-medium text-ink">Therapist account</div>
          <div class="text-body-sm text-ink-subtle">Secure Supabase session</div>
        </div>
        <button
          @click="signOut"
          class="px-4 py-2 text-body-sm font-medium text-state-danger hover:bg-state-danger-surface rounded-control transition-colors duration-standard ease-out"
        >
          Sign out
        </button>
      </div>
    </section>

    <!-- Future categories placeholder -->
    <div class="space-y-12 opacity-40 select-none pointer-events-none">
      <section>
        <h2 class="text-body-sm font-semibold uppercase tracking-wider text-ink-muted mb-4 px-1">Notifications</h2>
        <div class="h-20 bg-surface-elevated border border-border-muted rounded-panel border-dashed"></div>
      </section>
      <section>
        <h2 class="text-body-sm font-semibold uppercase tracking-wider text-ink-muted mb-4 px-1">AI Settings</h2>
        <div class="h-20 bg-surface-elevated border border-border-muted rounded-panel border-dashed"></div>
      </section>
    </div>

    <div
      v-if="showCalendlyToken"
      class="fixed inset-0 z-50 bg-backdrop flex items-end sm:items-center justify-center p-0 sm:p-4"
      @click.self="closeCalendlyToken"
    >
      <form
        class="w-full sm:max-w-lg bg-surface-elevated rounded-t-2xl sm:rounded-panel shadow-overlay p-5 sm:p-6"
        @submit.prevent="saveCalendlyToken"
      >
        <div class="flex items-start justify-between gap-4 mb-5">
          <div>
            <h2 class="text-h3 font-semibold text-ink">Connect Calendly</h2>
            <p class="text-body-sm text-ink-muted mt-1">
              Paste your personal access token. It is stored securely and will not be shown again.
            </p>
          </div>
          <button type="button" class="text-h1 leading-none text-ink-subtle" aria-label="Close" @click="closeCalendlyToken">×</button>
        </div>

        <label for="calendly-token" class="block text-body-sm font-medium text-ink-secondary mb-2">
          Personal access token
        </label>
        <div class="relative">
          <input
            id="calendly-token"
            v-model="calendlyToken"
            :type="showCalendlyTokenValue ? 'text' : 'password'"
            name="calendly-token"
            autocomplete="off"
            autocapitalize="none"
            spellcheck="false"
            required
            class="w-full min-h-touch rounded-panel border border-border px-3 pr-20 text-body outline-none focus:ring-2 focus:ring-state-focus-ring focus:border-action-link"
          />
          <button
            type="button"
            class="absolute inset-y-0 right-0 px-3 text-body-sm font-medium text-action-link"
            @click="showCalendlyTokenValue = !showCalendlyTokenValue"
          >
            {{ showCalendlyTokenValue ? 'Hide' : 'Reveal' }}
          </button>
        </div>

        <div class="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 mt-6">
          <button type="button" class="min-h-touch px-4 rounded-panel text-body font-medium text-ink-secondary hover:bg-surface-muted" @click="closeCalendlyToken">
            Cancel
          </button>
          <button
            type="submit"
            :disabled="isConnectingCalendly || !calendlyToken.trim()"
            class="min-h-touch px-5 rounded-panel text-body font-medium bg-action-link text-on-action hover:bg-action-link-hover disabled:opacity-50"
          >
            {{ isConnectingCalendly ? 'Verifying…' : 'Connect securely' }}
          </button>
        </div>
      </form>
    </div>

    <Transition duration-standard ease-out name="fade">
      <div v-if="showSuccess" class="fixed bottom-8 left-1/2 transform -translate-x-1/2 bg-ink text-on-action px-6 py-3 rounded-pill shadow-overlay flex items-center gap-3 z-50">
        <span class="text-state-success">✓</span>
        <span class="text-body font-medium">{{ successMessage }}</span>
      </div>
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
const calendlyStatus = ref('Not connected')
const isConnectingCalendly = ref(false)
const isLoadingCalendlyStatus = ref(true)
const showCalendlyToken = ref(false)
const showCalendlyTokenValue = ref(false)
const calendlyToken = ref('')
const showSuccess = ref(false)
const successMessage = ref('')

// Provider-neutral video consultation settings (Local state only)
const defaultVideoProvider = ref('zoom')
const defaultMeetingLink = ref('')

onMounted(async () => {
  // Check if we returned from OAuth with success
  const params = new URLSearchParams(window.location.search)

  if (params.get('google') === 'success') {
    successMessage.value = 'Google Calendar connected successfully'
    showSuccess.value = true
    cleanupUrl()
  }

  await fetchGoogleStatus()
  
  if (params.get('video') === 'success') {
    successMessage.value = 'Video provider connected successfully'
    showSuccess.value = true
    cleanupUrl()
  }

  if (params.get('video') === 'error') {
    alert(params.get('message') || 'Video connection failed')
    cleanupUrl()
  }
  
  if (params.get('google') === 'error') {
    alert(params.get('message') || 'Google connection failed')
    cleanupUrl()
  }
})

const formatSyncTime = (value) => {
  if (!value) return 'Not synced yet'
  const date = new Date(value)
  const elapsed = Date.now() - date.getTime()
  if (elapsed >= 0 && elapsed < 60 * 1000) return 'Synced just now'
  if (elapsed >= 0 && elapsed < 60 * 60 * 1000) return `Last synced ${Math.floor(elapsed / 60000)}m ago`
  return `Last synced ${date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`
}

const fetchGoogleStatus = async () => {
  isLoadingStatus.value = true
  try {
    const response = await authenticatedFetch('/api/google/status')
    if (response.ok) {
      const data = await response.json()
      if (data.connected) {
        googleEmail.value = data.email || ''
        if (data.error === 'GOOGLE_TOKEN_EXPIRED' || data.error === 'GOOGLE_REVOKED') {
          googleStatus.value = 'Reconnect Required'
        } else {
          googleStatus.value = 'Connected'
        }
        lastSyncedGoogle.value = formatSyncTime(data.last_synced_at)
      } else {
        googleStatus.value = 'Not connected'
        googleEmail.value = ''
      }
    }
  } catch (err) {
    console.error('Failed to fetch Google status:', err)
  } finally {
    isLoadingStatus.value = false
  }
}

const fetchCalendlyStatus = async () => {
  return // Calendly removed per instructions
}

const cleanupUrl = () => {
  // Clean up URL
  window.history.replaceState({}, document.title, window.location.pathname)
  
  setTimeout(() => {
    showSuccess.value = false
  }, 3000)
}

const fetchZoomStatus = async () => {
  try {
    const response = await authenticatedFetch('/api/zoom/status')
    const data = await response.json()
    if (!response.ok) throw new Error(data.error || 'Unable to check Zoom connection')
    zoomStatus.value = data.connected ? 'Connected' : 'Not connected'
  } catch (error) {
    console.error('Failed to fetch Zoom status:', error)
    zoomStatus.value = 'Not connected'
  }
}

const connectZoom = async () => {
  isConnecting.value = true
  try {
    const response = await authenticatedFetch('/api/zoom/authorize', {
      method: 'POST'
    })
    const data = await response.json()
    if (!response.ok || !data.url) {
      throw new Error(data.error || 'Unable to start Zoom connection')
    }
    window.location.href = data.url
  } catch (error) {
    alert(error.message)
    isConnecting.value = false
  }
}

const disconnectZoom = async () => {
  if (!confirm('Disconnect Zoom? Helio will no longer retrieve future Zoom transcripts.')) return

  try {
    const response = await authenticatedFetch('/api/zoom/disconnect', {
      method: 'POST'
    })
    const data = await response.json()
    if (!response.ok) throw new Error(data.error || 'Unable to disconnect Zoom')

    zoomStatus.value = 'Not connected'
    successMessage.value = 'Zoom disconnected'
    showSuccess.value = true
    setTimeout(() => showSuccess.value = false, 3000)
  } catch (error) {
    console.error('Failed to disconnect Zoom:', error)
    alert(error.message)
  }
}

const connectCalendly = () => {
  calendlyToken.value = ''
  showCalendlyTokenValue.value = false
  showCalendlyToken.value = true
}

const closeCalendlyToken = () => {
  if (isConnectingCalendly.value) return
  calendlyToken.value = ''
  showCalendlyTokenValue.value = false
  showCalendlyToken.value = false
}

const saveCalendlyToken = async () => {
  if (!calendlyToken.value.trim()) return

  isConnectingCalendly.value = true
  try {
    const response = await authenticatedFetch('/api/calendly/connect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: calendlyToken.value.trim() })
    })
    const data = await response.json()
    if (!response.ok) throw new Error(data.error || 'Unable to connect Calendly')

    calendlyStatus.value = 'Connected'
    successMessage.value = 'Calendly connected successfully'
    showSuccess.value = true
    calendlyToken.value = ''
    showCalendlyTokenValue.value = false
    showCalendlyToken.value = false
    setTimeout(() => showSuccess.value = false, 3000)
  } catch (error) {
    alert(error.message)
  } finally {
    isConnectingCalendly.value = false
  }
}

const disconnectCalendly = async () => {
  if (!confirm('Disconnect Calendly? Existing appointments will not be deleted.')) return

  try {
    const response = await authenticatedFetch('/api/calendly/disconnect', {
      method: 'POST'
    })
    const data = await response.json()
    if (!response.ok) throw new Error(data.error || 'Unable to disconnect Calendly')

    calendlyStatus.value = 'Not connected'
    successMessage.value = 'Calendly disconnected'
    showSuccess.value = true
    setTimeout(() => showSuccess.value = false, 3000)
  } catch (error) {
    console.error('Failed to disconnect Calendly:', error)
    alert(error.message)
  }
}

const connectGoogle = async () => {
  isConnectingGoogle.value = true
  try {
    const response = await authenticatedFetch('/api/google/authorize', {
      method: 'POST'
    })
    const data = await response.json()
    if (!response.ok || !data.url) {
      throw new Error(data.error || 'Unable to start Google connection')
    }
    window.location.href = data.url
  } catch (error) {
    alert(error.message)
    isConnectingGoogle.value = false
  }
}

const disconnectGoogle = async () => {
  if (confirm('Disconnect Google Calendar?')) {
    try {
      const response = await authenticatedFetch('/api/google/disconnect', {
        method: 'POST'
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Unable to disconnect Google Calendar')
      
      googleStatus.value = 'Not connected'
      googleEmail.value = ''
      lastSyncedGoogle.value = 'Not synced yet'
      successMessage.value = 'Google Calendar disconnected'
      showSuccess.value = true
      setTimeout(() => showSuccess.value = false, 3000)
    } catch (err) {
      console.error('Failed to disconnect Google:', err)
      alert('Failed to disconnect Google Calendar')
    }
  }
}

const signOut = async () => {
  await supabase.auth.signOut()
}
</script>

<style scoped>
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
  transform: translate(-50%, 20px);
}
</style>
