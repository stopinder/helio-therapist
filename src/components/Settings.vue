<template>
  <div class="max-w-3xl mx-auto py-10 px-6">
    <header class="mb-10">
      <h1 class="text-2xl font-semibold text-[#1a2b3b]">Settings</h1>
    </header>

    <!-- Calendar & Video Section -->
    <section class="mb-12">
      <h2 class="text-[13px] font-semibold uppercase tracking-wider text-slate-500 mb-4 px-1">
        Calendar & Video
      </h2>
      
      <div class="bg-white border border-[#e2e8f0] rounded-xl overflow-hidden shadow-sm">
        <!-- Google Calendar -->
        <div class="flex items-center justify-between p-4 border-b border-[#f1f5f9]">
          <div class="flex items-center gap-4">
            <div class="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center border border-[#f1f5f9]">
              <span class="text-xl">📅</span>
            </div>
            <div>
              <div class="text-[15px] font-medium text-[#2c3e50]">Google Calendar</div>
              <div class="text-[13px] text-slate-400">Not connected</div>
            </div>
          </div>
          <button class="px-4 py-1.5 text-[13px] font-medium text-[#2563eb] hover:bg-[#eff6ff] rounded-md transition border border-transparent hover:border-[#dbeafe]">
            Connect
          </button>
        </div>

        <!-- Zoom -->
        <div class="flex items-center justify-between p-4 border-b border-[#f1f5f9]">
          <div class="flex items-center gap-4">
            <div class="w-10 h-10 rounded-lg bg-[#f0f7ff] flex items-center justify-center border border-[#e0efff]">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M15 13.5V10C15 8.89543 14.1046 8 13 8H5C3.89543 8 3 8.89543 3 10V16C3 17.1046 3.89543 18 5 18H13C14.1046 18 15 17.1046 15 16V14.5L19.5 18V10L15 13.5Z" fill="#2D8CFF"/>
              </svg>
            </div>
            <div>
              <div class="text-[15px] font-medium text-[#2c3e50]">Zoom</div>
              <div class="text-[13px]" :class="zoomStatus === 'Connected' ? 'text-green-600' : 'text-slate-400'">
                {{ zoomStatus }}
              </div>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <template v-if="zoomStatus === 'Connected'">
              <button @click="disconnectZoom" class="px-4 py-1.5 text-[13px] font-medium text-slate-500 hover:text-red-500 transition">
                Disconnect
              </button>
            </template>
            <template v-else>
              <button 
                @click="connectZoom" 
                :disabled="isConnecting"
                class="px-4 py-1.5 text-[13px] font-medium text-[#2563eb] hover:bg-[#eff6ff] rounded-md transition border border-transparent hover:border-[#dbeafe] disabled:opacity-50"
              >
                {{ isConnecting ? 'Connecting...' : 'Connect' }}
              </button>
            </template>
          </div>
        </div>

        <!-- Outlook Calendar -->
        <div class="flex items-center justify-between p-4">
          <div class="flex items-center gap-4">
            <div class="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center border border-[#f1f5f9]">
              <span class="text-xl">📧</span>
            </div>
            <div>
              <div class="text-[15px] font-medium text-[#2c3e50]">Outlook Calendar</div>
              <div class="text-[13px] text-slate-400">Not connected</div>
            </div>
          </div>
          <button class="px-4 py-1.5 text-[13px] font-medium text-[#2563eb] hover:bg-[#eff6ff] rounded-md transition border border-transparent hover:border-[#dbeafe]">
            Connect
          </button>
        </div>
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

    <!-- Success Feedback Overlay -->
    <transition name="fade">
      <div v-if="showSuccess" class="fixed bottom-8 left-1/2 transform -translate-x-1/2 bg-slate-900 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 z-50">
        <span class="text-green-400">✓</span>
        <span class="text-[14px] font-medium">Zoom connected successfully</span>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const zoomStatus = ref('Not connected')
const isConnecting = ref(false)
const showSuccess = ref(false)

onMounted(() => {
  // Check if we returned from OAuth with success
  const params = new URLSearchParams(window.location.search)
  if (params.get('zoom') === 'success') {
    zoomStatus.value = 'Connected'
    showSuccess.value = true
    
    // Clean up URL
    window.history.replaceState({}, document.title, window.location.pathname)
    
    setTimeout(() => {
      showSuccess.value = false
    }, 3000)
  }
})

const connectZoom = () => {
  isConnecting.value = true
  // In a real flow, this redirects to the backend authorize endpoint
  window.location.href = '/api/zoom/authorize'
}

const disconnectZoom = async () => {
  if (confirm('Disconnect Zoom?')) {
    zoomStatus.value = 'Not connected'
    // Logic to call /api/zoom/disconnect would go here
  }
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
