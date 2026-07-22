<!-- src/components/RightPanel.vue -->
<template>
  <transition-colors duration-standard ease-out name="panel-slide-fade">
    <aside
        v-if="open"
        class="fixed inset-y-0 right-0 w-80 md:w-96 bg-surface-elevated border-l border-border
             shadow-overlay z-50 flex flex-col transform rounded-l-xl md:rounded-none"
    >
      <!-- Header -->
      <div
          class="flex items-center justify-between px-4 py-3 border-b border-border-muted
               bg-surface-subtle sticky top-0 z-10"
      >
        <div class="flex items-center gap-3">
          <div
              class="h-10 w-10 rounded-pill bg-avatar flex items-center justify-center
                   text-body font-semibold text-ink"
          >
            {{ initials }}
          </div>
          <div class="flex flex-col leading-tight">
            <span class="text-body font-semibold text-ink">
              {{ selectedClient?.name || "No client selected" }}
            </span>
            <span class="text-body-sm text-ink-muted truncate">
              {{ selectedClient?.note || "—" }}
            </span>
          </div>
        </div>

        <!-- Close -->
        <button
            @click="$emit('close')"
            class="text-ink-muted hover:text-ink text-h3 font-semibold"
            aria-label="Close client context"
        >
          ✕
        </button>
      </div>

      <!-- Scrollable content -->
      <div class="flex-1 overflow-auto p-4 space-y-6 text-ink transition-shadow duration-standard ease-out">

        <!-- Alerts -->
        <section>
          <h3 class="text-body-sm font-semibold uppercase tracking-wide text-ink-muted mb-2">Alerts</h3>
          <div v-if="alerts.length" class="space-y-2">
            <div
                v-for="(alert, i) in alerts"
                :key="i"
                class="bg-state-warning-surface border-l-4 border-state-warning text-body-sm p-2 rounded flex justify-between"
            >
              <span class="flex-1 pr-2">{{ alert }}</span>
              <button
                  @click="removeAlert(i)"
                  class="text-ink-subtle hover:text-state-danger text-caption font-semibold"
                  aria-label="Remove alert"
              >✕</button>
            </div>
          </div>
          <div v-else class="text-body-sm text-ink-subtle italic">No alerts yet.</div>

          <div class="mt-3 space-y-2">
            <textarea
                v-model="newAlert"
                placeholder="Add a new alert..."
                rows="2"
                class="w-full text-body-sm border border-border rounded-control p-2 resize-none
                     focus:ring-1 focus:ring-state-focus-ring focus:outline-none"
            ></textarea>
            <div class="flex justify-end">
              <button
                  @click="addAlert"
                  :disabled="!newAlert.trim()"
                  class="text-body-sm px-3 py-1 rounded-control bg-action-link text-on-action
                       hover:bg-action-link-hover transition-colors duration-standard ease-out disabled:opacity-50 disabled:cursor-not-allowed"
              >Add Alert</button>
            </div>
          </div>
        </section>

        <!-- Tags -->
        <section>
          <h3 class="text-body-sm font-semibold uppercase tracking-wide text-ink-muted mb-2">Tags</h3>
          <div class="flex flex-wrap gap-2">
            <div
                v-for="(tag, i) in tags"
                :key="i"
                class="flex items-center bg-surface-muted rounded-control px-2 py-1 text-caption"
            >
              <span>{{ tag }}</span>
              <button
                  @click="removeTag(i)"
                  class="ml-1 text-ink-subtle hover:text-state-danger text-overline"
                  aria-label="Remove tag"
              >✕</button>
            </div>
            <input
                v-model="newTag"
                @keyup.enter="addTag"
                placeholder="+ Add tag"
                class="text-caption px-2 py-1 border border-transparent focus:border-action-link
                     rounded-control outline-none bg-surface-subtle w-24"
            />
          </div>
        </section>

        <!-- Client summary -->
        <section v-if="summary.length">
          <h3 class="text-body-sm font-semibold uppercase tracking-wide text-ink-muted mb-2">
            Client Summary
          </h3>
          <ul class="text-body-sm space-y-2">
            <li v-for="(item, i) in summary" :key="i" class="border-b border-border-muted pb-1">
              <strong>{{ item.label }}:</strong>
              <span class="text-ink-secondary">{{ item.text }}</span>
            </li>
          </ul>
        </section>

        <!-- Session context -->
        <section>
          <h3 class="text-body-sm font-semibold uppercase tracking-wide text-ink-muted mb-2">Session Context</h3>
          <ul class="text-body-sm space-y-2">
            <li><strong>Last session:</strong> <span class="text-ink-secondary">21 Nov 2025 — Explored relationship parts.</span></li>
            <li><strong>Next session:</strong> <span class="text-ink-secondary">6 Dec 2025 at 10:00 AM</span></li>
            <li><strong>Current focus:</strong> <span class="text-ink-secondary">Self-leadership and relational boundaries.</span></li>
          </ul>
        </section>

        <!-- Actions -->
        <section>
          <h3 class="text-body-sm font-semibold uppercase tracking-wide text-ink-muted mb-2">Actions</h3>
          <div class="space-y-2">
            <button class="w-full py-2 text-body-sm rounded-control bg-action-link text-on-action hover:bg-action-link-hover transition-colors duration-standard ease-out">
              Schedule / Reschedule Session
            </button>
            <button class="w-full py-2 text-body-sm rounded-control border border-border bg-surface-elevated text-ink hover:bg-surface-subtle transition-colors duration-standard ease-out">
              Export Session Summary (PDF)
            </button>
            <button class="w-full py-2 text-body-sm rounded-control border border-border bg-surface-elevated text-ink hover:bg-surface-subtle transition-colors duration-standard ease-out">
              View Full Record
            </button>
            <button
                @click="$emit('view-map', selectedClient)"
                class="w-full py-2 text-body-sm rounded-control border border-border bg-surface-elevated text-ink
                     hover:bg-surface-subtle transition-colors duration-standard ease-out"
            >🗺 View Map</button>
          </div>
        </section>

        <!-- Zoom / AI -->
        <section>
          <h3 class="text-body-sm font-semibold uppercase tracking-wide text-ink-muted mb-2">Zoom / AI Tools</h3>
          <div class="space-y-2">
            <button
                @click="generateAISummary"
                class="w-full py-2 text-body-sm rounded-control border border-border
                     bg-surface-elevated text-ink-secondary hover:bg-surface-subtle transition-colors duration-standard ease-out"
            >Generate AI Summary</button>
            <button
                class="w-full py-2 text-body-sm rounded-control border border-border
                     bg-surface-elevated text-ink-secondary hover:bg-surface-subtle transition-colors duration-standard ease-out"
            >View Transcript Highlights</button>
          </div>
        </section>
      </div>
    </aside>
  </transition-colors duration-standard ease-out>
</template>

<script setup>
import { ref, computed, watch } from "vue"

const props = defineProps({
  selectedClient: Object,
  open: Boolean
})

// Therapist initials
const initials = computed(() =>
    props.selectedClient?.name
        ? props.selectedClient.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()
        : "CR"
)

// --- Alerts and tags (persist per client) ---
const alerts = ref([])
const tags = ref([])
const newAlert = ref("")
const newTag = ref("")

function addAlert() {
  const v = newAlert.value.trim()
  if (!v) return
  alerts.value.push(v)
  newAlert.value = ""
}

function removeAlert(i) {
  alerts.value.splice(i, 1)
}

function addTag() {
  const v = newTag.value.trim()
  if (!v || tags.value.includes(v)) return
  tags.value.push(v)
  newTag.value = ""
}

function removeTag(i) {
  tags.value.splice(i, 1)
}

// Persist and reload alerts/tags per client
watch([alerts, tags], () => {
  const cid = props.selectedClient?.id
  if (!cid) return
  localStorage.setItem(`helio_client_${cid}_meta`, JSON.stringify({
    alerts: alerts.value,
    tags: tags.value
  }))
}, { deep: true })

watch(() => props.selectedClient, (client) => {
  if (!client) return
  const stored = JSON.parse(localStorage.getItem(`helio_client_${client.id}_meta`)) || {}
  alerts.value = stored.alerts || []
  tags.value = stored.tags || []
}, { immediate: true })

// --- Client summary from saved tools ---
const summary = ref([])

watch(
    () => props.selectedClient,
    (client) => {
      if (!client) return (summary.value = [])
      const all = JSON.parse(localStorage.getItem("helio_toolData")) || {}
      const cid = client.id
      summary.value = Object.entries(all)
          .filter(([k]) => k.startsWith(`${cid}_`))
          .map(([key, data]) => ({
            label: key.split("_")[1].replace(/-/g, " ").replace(/\b\w/g, l => l.toUpperCase()),
            text:
                Array.isArray(data.parts) ? `${data.parts.length} parts mapped` :
                    Array.isArray(data.targets) ? `${data.targets.length} EMDR targets` :
                        data.interweaves ? `${data.interweaves.length} interweaves` :
                            data.balancedThought ? "Recent CBT Thought Record" :
                                "Saved tool data"
          }))
    },
    { immediate: true }
)

// --- Placeholder AI handler ---
function generateAISummary() {
  alert("AI summary generation coming soon.")
}
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
