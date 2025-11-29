<template>
  <transition name="slide-right">
    <aside
        v-if="open"
        class="fixed inset-y-0 right-0 w-80 bg-white border-l border-[#d9dce1] shadow-xl z-40 flex flex-col transform transition-transform duration-300 ease-in-out md:w-96"
    >
      <!-- Header -->
      <div class="flex items-center justify-between px-4 py-3 border-b border-[#e2e5ea] bg-[#fafbfc] sticky top-0 z-10">
        <div class="flex items-center gap-3">
          <div class="h-10 w-10 rounded-full bg-[#e2dcd4] flex items-center justify-center text-[15px] font-semibold text-[#2c3e50]">
            {{ initials }}
          </div>
          <div class="flex flex-col leading-tight">
            <span class="text-[15px] font-semibold text-[#2c3e50]">
              {{ selectedClient?.name || "No client selected" }}
            </span>
            <span class="text-[13px] text-slate-500 truncate">
              {{ selectedClient?.note || "—" }}
            </span>
          </div>
        </div>

        <!-- Close button -->
        <button
            @click="$emit('close')"
            class="text-gray-500 hover:text-gray-800 md:hidden"
            aria-label="Close client context"
        >
          ✕
        </button>
      </div>

      <!-- Content -->
      <div class="flex-1 overflow-auto p-4 space-y-6">
        <!-- Alerts -->
        <section>
          <h3 class="text-[13px] font-semibold uppercase tracking-wide text-slate-500 mb-2">Alerts</h3>
          <div class="space-y-2">
            <div class="bg-yellow-50 border-l-4 border-yellow-400 text-[13px] p-2 rounded">
              Watch for activation when exploring relationship themes.
            </div>
            <div class="bg-yellow-50 border-l-4 border-yellow-400 text-[13px] p-2 rounded">
              Ground before moving into deeper parts work.
            </div>
          </div>
        </section>

        <!-- Tags -->
        <section>
          <h3 class="text-[13px] font-semibold uppercase tracking-wide text-slate-500 mb-2">Tags</h3>
          <div class="flex flex-wrap gap-2">
            <span class="px-2 py-1 text-[12px] bg-slate-100 rounded-md">Parts work</span>
            <span class="px-2 py-1 text-[12px] bg-slate-100 rounded-md">Relationship stress</span>
            <span class="px-2 py-1 text-[12px] bg-slate-100 rounded-md">Attachment</span>
          </div>
        </section>

        <!-- Background -->
        <section>
          <h3 class="text-[13px] font-semibold uppercase tracking-wide text-slate-500 mb-2">Background</h3>
          <ul class="text-[13px] space-y-1">
            <li><strong>GP:</strong> Dr. A. Coleman</li>
            <li><strong>Referred by:</strong> Self</li>
            <li><strong>Last session:</strong> 21 Nov 2025</li>
            <li><strong>Next session:</strong> 6 Dec 2025, 10:00 AM</li>
          </ul>
        </section>

        <!-- Actions -->
        <section>
          <h3 class="text-[13px] font-semibold uppercase tracking-wide text-slate-500 mb-2">Actions</h3>
          <div class="space-y-2">
            <button class="w-full py-2 text-[13px] rounded-md bg-[#2563eb] text-white hover:bg-[#1d4ed8] transition">Schedule / Reschedule Session</button>
            <button class="w-full py-2 text-[13px] rounded-md border border-[#d9dce1] bg-white text-[#2c3e50] hover:bg-[#f7f8fa] transition">Export Session Summary (PDF)</button>
            <button class="w-full py-2 text-[13px] rounded-md border border-[#d9dce1] bg-white text-[#2c3e50] hover:bg-[#f7f8fa] transition">View Full Record</button>
          </div>
        </section>

        <!-- Zoom / AI Summary placeholder -->
        <section>
          <h3 class="text-[13px] font-semibold uppercase tracking-wide text-slate-500 mb-2">Zoom / AI Tools</h3>
          <div class="space-y-2">
            <button class="w-full py-2 text-[13px] rounded-md border border-[#d9dce1] bg-white text-[#3f4754] hover:bg-[#f7f8fa] transition">Generate AI Summary</button>
            <button class="w-full py-2 text-[13px] rounded-md border border-[#d9dce1] bg-white text-[#3f4754] hover:bg-[#f7f8fa] transition">View Transcript Highlights</button>
          </div>
        </section>
      </div>
    </aside>
  </transition>
</template>

<script setup>
import { computed } from "vue";   // 👈 add this line

const props = defineProps({
  selectedClient: Object,
  open: Boolean
});


const initials = computed(() =>
    props.selectedClient?.name
        ? props.selectedClient.name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .slice(0, 2)
            .toUpperCase()
        : "CR"
);

</script>

<style scoped>
.slide-right-enter-active,
.slide-right-leave-active {
  transition: transform 0.25s ease;
}
.slide-right-enter-from,
.slide-right-leave-to {
  transform: translateX(100%);
}
</style>

