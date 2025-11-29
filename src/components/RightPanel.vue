<template>
  <transition name="panel-slide-fade">
    <aside
        v-if="open"
        class="fixed inset-y-0 right-0 w-80 md:w-96 bg-white border-l border-[#d9dce1] shadow-xl z-50 flex flex-col transform"
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
            class="text-gray-500 hover:text-gray-800 text-lg font-semibold"
            aria-label="Close client context"
        >
          ✕
        </button>
      </div>

      <!-- Content -->
      <div class="flex-1 overflow-auto p-4 space-y-6 text-[#2c3e50]">
        <!-- Alerts -->
        <section>
          <h3 class="text-[13px] font-semibold uppercase tracking-wide text-slate-500 mb-2">
            Alerts
          </h3>

          <!-- Existing alerts -->
          <div v-if="alerts.length" class="space-y-2">
            <div
                v-for="(alert, index) in alerts"
                :key="index"
                class="bg-yellow-50 border-l-4 border-yellow-400 text-[13px] p-2 rounded flex justify-between items-start"
            >
              <span class="flex-1 pr-2">{{ alert }}</span>
              <button
                  @click="removeAlert(index)"
                  class="text-slate-400 hover:text-red-500 text-[12px] font-semibold"
                  aria-label="Remove alert"
              >
                ✕
              </button>
            </div>
          </div>
          <div v-else class="text-[13px] text-slate-400 italic">No alerts yet.</div>

          <!-- Add new alert -->
          <div class="mt-3 space-y-2">
    <textarea
        v-model="newAlert"
        placeholder="Add a new alert..."
        rows="2"
        class="w-full text-[13px] border border-[#d9dce1] rounded-md p-2 resize-none focus:ring-1 focus:ring-[#2563eb] focus:outline-none"
    ></textarea>
            <div class="flex justify-end">
              <button
                  @click="addAlert"
                  :disabled="!newAlert.trim()"
                  class="text-[13px] px-3 py-1 rounded-md bg-[#2563eb] text-white hover:bg-[#1d4ed8] transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add Alert
              </button>
            </div>
          </div>
        </section>


        <!-- Tags -->
        <section>
          <h3 class="text-[13px] font-semibold uppercase tracking-wide text-slate-500 mb-2">
            Tags
          </h3>
          <div class="flex flex-wrap gap-2">
            <span class="px-2 py-1 text-[12px] bg-slate-100 rounded-md">
              Parts work
            </span>
            <span class="px-2 py-1 text-[12px] bg-slate-100 rounded-md">
              Relationship stress
            </span>
            <span class="px-2 py-1 text-[12px] bg-slate-100 rounded-md">
              Attachment
            </span>
          </div>
        </section>

        <!-- Background -->
        <section>
          <h3 class="text-[13px] font-semibold uppercase tracking-wide text-slate-500 mb-2">
            Background
          </h3>
          <ul class="text-[13px] space-y-1">
            <li><strong>GP:</strong> Dr. A. Coleman</li>
            <li><strong>Referred by:</strong> Self</li>
            <li><strong>Last session:</strong> 21 Nov 2025</li>
            <li><strong>Next session:</strong> 6 Dec 2025, 10:00 AM</li>
          </ul>
        </section>

        <!-- Actions -->
        <section>
          <h3 class="text-[13px] font-semibold uppercase tracking-wide text-slate-500 mb-2">
            Actions
          </h3>
          <div class="space-y-2">
            <button
                class="w-full py-2 text-[13px] rounded-md bg-[#2563eb] text-white hover:bg-[#1d4ed8] transition"
            >
              Schedule / Reschedule Session
            </button>
            <button
                class="w-full py-2 text-[13px] rounded-md border border-[#d9dce1] bg-white text-[#2c3e50] hover:bg-[#f7f8fa] transition"
            >
              Export Session Summary (PDF)
            </button>
            <button
                class="w-full py-2 text-[13px] rounded-md border border-[#d9dce1] bg-white text-[#2c3e50] hover:bg-[#f7f8fa] transition"
            >
              View Full Record
            </button>
          </div>
        </section>

        <!-- Zoom / AI -->
        <section>
          <h3 class="text-[13px] font-semibold uppercase tracking-wide text-slate-500 mb-2">
            Zoom / AI Tools
          </h3>
          <div class="space-y-2">
            <button
                class="w-full py-2 text-[13px] rounded-md border border-[#d9dce1] bg-white text-[#3f4754] hover:bg-[#f7f8fa] transition"
            >
              Generate AI Summary
            </button>
            <button
                class="w-full py-2 text-[13px] rounded-md border border-[#d9dce1] bg-white text-[#3f4754] hover:bg-[#f7f8fa] transition"
            >
              View Transcript Highlights
            </button>
          </div>
        </section>
      </div>
    </aside>
  </transition>
</template>

<script setup>
import { ref, computed } from "vue";

const props = defineProps({
  selectedClient: Object,
  open: Boolean
});

// Therapist initials
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

// ---- Alerts (local for now, Supabase-ready later) ----
const alerts = ref([
  "Watch for activation when exploring relationship themes.",
  "Ground before moving into deeper parts work."
]);

const newAlert = ref("");

const addAlert = () => {
  const value = newAlert.value.trim();
  if (!value) return;
  alerts.value.push(value);
  newAlert.value = "";
  // 🧠 Later: Supabase insert (supabase.from('alerts').insert({ client_id, text: value }))
};

const removeAlert = (index) => {
  alerts.value.splice(index, 1);
  // 🧠 Later: Supabase delete (supabase.from('alerts').delete().eq('id', alertId))
};
</script>

<style scoped>
.panel-slide-fade-enter-active,
.panel-slide-fade-leave-active {
  transition: all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1);
}
.panel-slide-fade-enter-from,
.panel-slide-fade-leave-to {
  opacity: 0;
  transform: translateX(100%);
}
.panel-slide-fade-enter-to,
.panel-slide-fade-leave-from {
  opacity: 1;
  transform: translateX(0);
}
</style>

