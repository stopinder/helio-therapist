<template>
  <div class="max-w-4xl mx-auto py-8 px-4">
    <h1 class="text-2xl font-bold mb-8 text-[#2c3e50]">Settings</h1>

    <section class="mb-12">
      <h2 class="text-lg font-semibold mb-4 text-[#2c3e50] border-b pb-2 border-[#e5e7eb]">
        Calendar & Video
      </h2>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Zoom Connection Card -->
        <div class="bg-white border border-[#d1d5db] rounded-lg p-6 shadow-sm">
          <div class="flex items-start justify-between mb-4">
            <div class="flex items-center gap-3">
              <div class="bg-[#2D8CFF] rounded-lg p-2">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M15 13.5V10C15 8.89543 14.1046 8 13 8H5C3.89543 8 3 8.89543 3 10V16C3 17.1046 3.89543 18 5 18H13C14.1046 18 15 17.1046 15 16V14.5L19.5 18V10L15 13.5Z" fill="white"/>
                  <path d="M13 3H5C3.89543 3 3 3.89543 3 5V6.5L13 6.5V3Z" fill="white" fill-opacity="0.4"/>
                </svg>
              </div>
              <h3 class="text-lg font-bold text-[#2c3e50]">Zoom</h3>
            </div>
            <span class="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
              Not connected
            </span>
          </div>

          <p class="text-sm text-slate-600 mb-6 leading-relaxed">
            Connect Zoom to show your meetings and join links in Today’s Schedule.
          </p>

          <button
            disabled
            class="w-full flex items-center justify-center px-4 py-2.5 bg-[#f3f4f6] text-[#9ca3af] font-semibold rounded-md border border-[#d1d5db] cursor-not-allowed transition"
          >
            Zoom setup required
          </button>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
// Phase 1: Frontend-only settings interface
</script>
