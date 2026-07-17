<template>
  <div class="max-w-3xl mx-auto py-6 sm:py-10 px-4 sm:px-6 w-full overflow-x-hidden">
    <header class="mb-8 sm:mb-10">
      <h1 class="text-xl sm:text-2xl font-semibold text-[#1a2b3b]">Settings</h1>
    </header>

    <!-- Calendar & Video Section -->
    <section class="mb-12">
      <h2 class="text-[12px] sm:text-[13px] font-semibold uppercase tracking-wider text-slate-500 mb-4 px-1">
        Calendar & Video
      </h2>
      
      <div class="bg-white border border-[#e2e8f0] rounded-xl overflow-hidden shadow-sm">
        <!-- Google Calendar -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between p-4 border-b border-[#f1f5f9] gap-4">
          <div class="flex items-start sm:items-center gap-4">
            <div class="flex-shrink-0 w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center border border-[#f1f5f9]">
              <span class="text-xl">📅</span>
            </div>
            <div class="min-w-0 flex-1">
              <div class="text-[15px] font-medium text-[#2c3e50] break-words">Google Calendar</div>
              <div class="text-[13px] break-words" :class="googleStatus === 'Connected' ? 'text-green-600' : 'text-slate-400'">
                <template v-if="isLoadingStatus">
                  <span class="text-slate-400 animate-pulse">Checking status...</span>
                </template>
                <template v-else-if="googleStatus === 'Connected'">
                  <div class="flex flex-col mt-1">
                    <span class="font-medium text-green-600">✓ Connected</span>
                    <span class="text-slate-400 text-[11px] leading-tight">Last synced: {{ lastSyncedGoogle }}</span>
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
              <button @click="disconnectGoogle" class="w-full sm:w-auto min-h-[44px] sm:min-h-0 px-4 py-2 sm:py-1.5 text-[13px] font-medium text-slate-500 hover:text-red-500 transition text-center">
                Disconnect
              </button>
            </template>
            <template v-else>
              <button 
                @click="connectGoogle" 
                :disabled="isConnectingGoogle"
                class="w-full sm:w-auto min-h-[44px] sm:min-h-0 px-4 py-2 sm:py-1.5 text-[13px] font-medium text-[#2563eb] hover:bg-[#eff6ff] rounded-md transition border border-transparent hover:border-[#dbeafe] disabled:opacity-50 text-center"
              >
                {{ isConnectingGoogle ? 'Connecting...' : 'Connect' }}
              </button>
            </template>
          </div>
        </div>

        <!-- Zoom -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between p-4 border-b border-[#f1f5f9] gap-4">
          <div class="flex items-start sm:items-center gap-4">
            <div class="flex-shrink-0 w-10 h-10 rounded-lg bg-[#f0f7ff] flex items-center justify-center border border-[#e0efff]">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M15 13.5V10C15 8.89543 14.1046 8 13 8H5C3.89543 8 3 8.89543 3 10V16C3 17.1046 3.89543 18 5 18H13C14.1046 18 15 17.1046 15 16V14.5L19.5 18V10L15 13.5Z" fill="#2D8CFF"/>
              </svg>
            </div>
            <div class="min-w-0 flex-1">
              <div class="text-[15px] font-medium text-[#2c3e50] break-words">Zoom</div>
              <div class="text-[13px] break-words" :class="zoomStatus === 'Connected' ? 'text-green-600' : 'text-slate-400'">
                {{ zoomStatus }}
              </div>
            </div>
          </div>
          <div class="flex items-center gap-2 w-full sm:w-auto">
            <template v-if="zoomStatus === 'Connected'">
              <button @click="disconnectZoom" class="w-full sm:w-auto min-h-[44px] sm:min-h-0 px-4 py-2 sm:py-1.5 text-[13px] font-medium text-slate-500 hover:text-red-500 transition text-center">
                Disconnect
              </button>
            </template>
            <template v-else>
              <button 
                @click="connectZoom" 
                :disabled="isConnecting"
                class="w-full sm:w-auto min-h-[44px] sm:min-h-0 px-4 py-2 sm:py-1.5 text-[13px] font-medium text-[#2563eb] hover:bg-[#eff6ff] rounded-md transition border border-transparent hover:border-[#dbeafe] disabled:opacity-50 text-center"
              >
                {{ isConnecting ? 'Connecting...' : 'Connect' }}
              </button>
            </template>
          </div>
        </div>

        <!-- Outlook Calendar -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-4">
          <div class="flex items-start sm:items-center gap-4">
            <div class="flex-shrink-0 w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center border border-[#f1f5f9]">
              <span class="text-xl">📧</span>
            </div>
            <div class="min-w-0 flex-1">
              <div class="text-[15px] font-medium text-[#2c3e50] break-words">Outlook Calendar</div>
              <div class="text-[13px] text-slate-400 break-words">Not connected</div>
            </div>
          </div>
          <button class="w-full sm:w-auto min-h-[44px] sm:min-h-0 px-4 py-2 sm:py-1.5 text-[13px] font-medium text-[#2563eb] hover:bg-[#eff6ff] rounded-md transition border border-transparent hover:border-[#dbeafe] text-center">
            Connect
          </button>
        </div>
      </div>
    </section>

    <section class="mb-12">
      <h2 class="text-[12px] sm:text-[13px] font-semibold uppercase tracking-wider text-slate-500 mb-4 px-1">
        Account
      </h2>
      <div class="bg-white border border-[#e2e8f0] rounded-xl p-4 shadow-sm flex items-center justify-between gap-4">
        <div>
          <div class="text-[15px] font-medium text-[#2c3e50]">Therapist account</div>
          <div class="text-[13px] text-slate-400">Secure Supabase session</div>
        </div>
        <button
          @click="signOut"
          class="px-4 py-2 text-[13px] font-medium text-red-600 hover:bg-red-50 rounded-md transition"
        >
          Sign out
        </button>
      </div>
    </section>

    <!-- Future categories placeholder -->
    <div class="space-y-12 opacity-40 select-none pointer-events-none">
      <section>
        <h2 class="text-[13px] font-semibold uppercase tracking-wider text-slate-500 mb-4 px-1">Notifications</h2>
        <div class="h-20 bg-white border border-[#e2e8f0] rounded-xl border-dashed"></div>
      </section>
      <section>
        <h2 class="text-[13px] font-semibold uppercase tracking-wider text-slate-500 mb-4 px-1">AI Settings</h2>
        <div class="h-20 bg-white border border-[#e2e8f0] rounded-xl border-dashed"></div>
      </section>
    </div>

    <transition name="fade">
      <div v-if="showSuccess" class="fixed bottom-8 left-1/2 transform -translate-x-1/2 bg-slate-900 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 z-50">
        <span class="text-green-400">✓</span>
        <span class="text-[14px] font-medium">{{ successMessage }}</span>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { authenticatedFetch } from '../lib/api.js'
import { supabase } from '../lib/supabase.js'

const zoomStatus = ref('Not connected')
const isConnecting = ref(false)
const googleStatus = ref('Not connected')
const googleEmail = ref('')
const lastSyncedGoogle = ref('Never')
const isConnectingGoogle = ref(false)
const isLoadingStatus = ref(true)
const showSuccess = ref(false)
const successMessage = ref('')

onMounted(async () => {
  // Check if we returned from OAuth with success
  const params = new URLSearchParams(window.location.search)

  if (params.get('google') === 'complete' && params.get('state')) {
    try {
      const response = await authenticatedFetch('/api/google/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state: params.get('state') })
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Unable to complete Google connection')
      successMessage.value = 'Google Calendar connected successfully'
      showSuccess.value = true
    } catch (error) {
      successMessage.value = ''
      alert(error.message)
    } finally {
      cleanupUrl()
    }
  }

  await fetchGoogleStatus()
  
  // Zoom check
  if (params.get('zoom') === 'success') {
    zoomStatus.value = 'Connected'
    successMessage.value = 'Zoom connected successfully'
    showSuccess.value = true
    cleanupUrl()
  }
  
  if (params.get('google') === 'error') {
    alert(params.get('message') || 'Google connection failed')
    cleanupUrl()
  }
})

const fetchGoogleStatus = async () => {
  isLoadingStatus.value = true
  try {
    const response = await authenticatedFetch('/api/google/status')
    if (response.ok) {
      const data = await response.json()
      if (data.connected) {
        googleStatus.value = 'Connected'
        lastSyncedGoogle.value = data.last_synced_at 
          ? new Date(data.last_synced_at).toLocaleString() 
          : 'Unknown'
      } else {
        googleStatus.value = 'Not connected'
      }
    }
  } catch (err) {
    console.error('Failed to fetch Google status:', err)
  } finally {
    isLoadingStatus.value = false
  }
}

const cleanupUrl = () => {
  // Clean up URL
  window.history.replaceState({}, document.title, window.location.pathname)
  
  setTimeout(() => {
    showSuccess.value = false
  }, 3000)
}

const connectZoom = () => {
  isConnecting.value = true
  window.location.href = '/api/zoom/authorize'
}

const disconnectZoom = async () => {
  if (confirm('Disconnect Zoom?')) {
    zoomStatus.value = 'Not connected'
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
      lastSyncedGoogle.value = 'Never'
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
