<template>
  <div class="flex h-screen bg-surface-canvas text-ink overflow-hidden">
    <!-- Left Sidebar: Desktop (Fixed) / Mobile (Drawer) -->
    <Transition duration-standard ease-out name="slide">
      <LeftSidebar
          v-if="isSidebarOpen || isDesktop"
          class="fixed md:relative z-50 md:z-40 shrink-0 w-64 bg-surface border-r border-border h-full shadow-overlay md:shadow-none"
          :selected-nav="selectedNav"
          @update:selected-nav="handleNavChange"
          :clients="clients"
          :selected-client="selectedClient"
          :is-in-session="isInSession"
          :is-syncing="isSyncing"
          :active-template="activeTemplate"
          @select-client="handleSelectClient"
          @open-session="openSession"
          @end-session="endSession"
          @sync-transcript="syncTranscript"
          @open-tool="openTool"
          @open-reflection="openReflection"
          @add-client="handleAddClient"
          :resources="resources"
          @add-resource="handleAddResource"
          @close-sidebar="isSidebarOpen = false"
      />
    </Transition>

    <!-- Sidebar Backdrop for Mobile -->
    <div
        v-if="!isDesktop && isSidebarOpen"
        class="fixed inset-0 bg-backdrop backdrop-blur-sm z-40 md:hidden"
        @click="isSidebarOpen = false"
    ></div>

    <!-- Main Content Area -->
    <div class="flex flex-col flex-1 min-w-0 h-full overflow-hidden w-full">

      <!-- Persistent Global Top Bar -->
      <header
          class="h-14 flex items-center justify-between gap-3 px-4 border-b border-border bg-surface shrink-0"
      >
        <!-- Workspace identity -->
        <div class="flex items-center gap-2 md:gap-3 min-w-0">
          <!-- Mobile Menu Button -->
          <button
              class="md:hidden p-2 -ml-2 text-ink-secondary rounded-control interaction-control focus-visible:outline-none"
              @click="isSidebarOpen = true"
              aria-label="Open menu"
          >
            <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                aria-hidden="true"
            >
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <div
              class="flex items-center gap-1 md:gap-2 type-h3 tracking-tight text-ink truncate"
          >
            <span class="truncate">Therapist Workspace</span>

            <template v-if="isInSession">
              <span
                  class="text-ink-subtle mx-0.5 md:mx-1 shrink-0"
                  aria-hidden="true"
              >
                ·
              </span>

              <span
                  class="flex items-center gap-1 type-caption text-ink-muted shrink-0"
              >
                <span
                    class="inline-block h-2 w-2 rounded-pill bg-state-success"
                    aria-hidden="true"
                ></span>
                In session
              </span>
            </template>
          </div>
        </div>

        <!-- Global actions -->
        <div class="flex items-center gap-1.5 md:gap-3 shrink-0">

          <!-- Next session countdown -->
          <button
              v-if="nextMatchedAppointment && !isInSession"
              type="button"
              class="hidden md:flex items-center gap-2.5 rounded-control border px-2.5 py-1.5 transition-colors focus-visible:outline-none"
              :class="nextSessionClasses"
              :aria-label="nextSessionAriaLabel"
              @click="openAppointmentPreparation(nextMatchedAppointment)"
          >
            <!-- Clock -->
            <span
                class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors"
                :class="nextSessionClockClasses"
                aria-hidden="true"
            >
              <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.8"
                  stroke-linecap="round"
                  stroke-linejoin="round"
              >
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v5l3 2" />
              </svg>
            </span>

            <span class="flex flex-col items-start leading-none">
              <span class="type-caption text-ink-muted">
                Next session
              </span>

              <span
                  class="mt-1 type-body-sm font-semibold tabular-nums"
                  aria-live="polite"
              >
                {{ nextSessionCountdown }}
              </span>
            </span>
          </button>

          <!-- Client Context -->
          <button
              class="hidden sm:block type-body-sm px-3 py-1.5 rounded-control border border-border interaction-control focus-visible:outline-none"
              :class="
              showClientDrawer
                ? 'state-selected text-ink border-border-strong'
                : 'text-ink-secondary bg-surface-elevated'
            "
              :disabled="!selectedClient"
              @click="showClientDrawer = !showClientDrawer"
              aria-label="Client Context"
              :aria-expanded="showClientDrawer"
              aria-controls="client-context-drawer"
          >
            {{ selectedClient?.name || 'No client selected' }}
          </button>

          <!-- Mobile client icon button -->
          <button
              class="sm:hidden h-9 w-9 flex items-center justify-center rounded-control border border-border text-ink-secondary interaction-control type-body focus-visible:outline-none"
              :class="{ 'state-selected border-border-strong': showClientDrawer }"
              :disabled="!selectedClient"
              @click="showClientDrawer = !showClientDrawer"
              aria-label="Client Context"
          >
            👤
          </button>

          <!-- Calendar -->
          <button
              class="h-9 w-9 flex items-center justify-center rounded-control border border-border text-ink-secondary interaction-control type-body focus-visible:outline-none"
              aria-label="Calendar"
              @click="selectedNav = 'Today'"
          >
            🗓
          </button>

          <!-- Settings -->
          <button
              class="h-9 w-9 flex items-center justify-center rounded-control border border-border text-ink-secondary interaction-control type-body focus-visible:outline-none"
              :class="{
              'state-selected font-semibold border-border-strong':
                selectedNav === 'Settings'
            }"
              @click="selectedNav = 'Settings'"
              aria-label="Settings"
          >
            ⚙️
          </button>
        </div>
      </header>

      <!-- Workspace with Centre and Right Sidebar -->
      <div class="flex flex-1 overflow-hidden">
        <!-- Flexible Centre Workspace -->
        <main
            class="flex-1 overflow-auto page-layout relative scroll-smooth bg-surface-canvas"
            @scroll="handleScroll"
        >
          <section
              v-if="selectedNav === 'Today'"
              class="today-workspace"
          >
            <header class="today-workspace-heading">
              <div>
                <p class="today-eyebrow type-overline">
                  Today
                </p>

                <h1 class="type-h1">
                  Your clinical day
                </h1>

                <p class="type-body">
                  Start with the next person you need to hold in mind.
                </p>
              </div>
            </header>

            <NextSessionPreparation
                :appointment="nextMatchedAppointment"
                :client="nextMatchedClient"
                @prepare="openAppointmentPreparation"
            />

            <section class="today-calendar">
              <CalendarSchedule
                  :clients="clients"
                  reference-view
                  @open-settings="selectedNav = 'Settings'"
                  @select-appointment="openAppointmentPreparation"
                  @next-appointment="nextMatchedAppointment = $event"
              />
            </section>
          </section>

          <NeedsAttention
              v-else-if="selectedNav === 'Inbox' && !queuedTranscriptId"
              :clients="clients"
              @open-settings="selectedNav = 'Settings'"
              @open-transcript="openTranscriptFromQueue"
              @open-session="openSessionFromQueue"
              @select-appointment="openAppointmentPreparation"
          />

          <ClientDirectory
              v-else-if="selectedNav === 'Clients'"
              :clients="clients"
              :selected-client="selectedClient"
              @select-client="handleSelectClient"
              @add-client="handleAddClient"
          />

          <TranscriptInbox
              v-else-if="selectedNav === 'Inbox'"
              :clients="clients"
              :open-transcript-id="queuedTranscriptId"
          />

          <ReflectionWorkspace
              v-else-if="selectedNav === 'Reflections'"
              :clients="clients"
              :view="reflectionView"
              @update:view="reflectionView = $event"
          />

          <Settings
              v-else-if="selectedNav === 'Settings'"
          />

          <MainCanvas
              ref="clientWorkspace"
              v-else
              :selected-client="selectedClient"
              @update-focus="handleUpdateClientFocus"
          />
        </main>
      </div>
    </div>

    <!-- AI Insight Drawer -->
    <AIInsightDrawer
        :open="showAIDrawer"
        :input="aiInput"
        @close="showAIDrawer = false"
        @save-insight="handleSaveInsight"
    />

    <!-- Client Context Drawer -->
    <ClientContextDrawer
        id="client-context-drawer"
        :open="showClientDrawer"
        :client="selectedClient"
        @close="showClientDrawer = false"
        @open-record="openClientRecord"
        @start-session="startClientSession"
    />
  </div>
</template>

<script setup>
import {
  ref,
  computed,
  onMounted,
  onUnmounted,
  watch,
  nextTick
} from "vue"

import AIInsightDrawer from "./components/AIInsightDrawer.vue"
import ClientContextDrawer from "./components/tools/ClientContextDrawer.vue"
import EMDRToolLoader from "./components/tools/EMDRToolLoader.vue"
import IFSToolLoader from "./components/tools/IFSToolLoader.vue"
import LeftSidebar from "./components/tools/LeftSidebar.vue"
import RightPanel from "./components/tools/RightPanel.vue"
import MainCanvas from "./components/tools/MainCanvas.vue"
import CbtToolLoader from "./components/tools/CBTToolLoader.vue"
import ReflectiveJournal from "./components/reflective/ReflectiveJournal.vue"
import PastReflections from "./components/reflective/PastReflections.vue"
import TherapistMap from "./components/tools/TherapistMap.vue"
import Settings from "./components/Settings.vue"
import ReflectionWorkspace from "./components/ReflectionWorkspace.vue"
import NeedsAttention from "./components/NeedsAttention.vue"
import ClientDirectory from "./components/ClientDirectory.vue"
import TranscriptInbox from "./components/TranscriptInbox.vue"
import CalendarSchedule from "./components/CalendarSchedule.vue"
import NextSessionPreparation from "./components/NextSessionPreparation.vue"
import { supabase } from "./lib/supabase.js"
import {
  listClients,
  createClient as createClientHelper
} from "./lib/clients.js"

// --- State ---
const isSidebarOpen = ref(true)
const isRightPanelOpen = ref(true)
const isDesktop = ref(true)
const isInSession = ref(false)
const isSyncing = ref(false)
const activeView = ref("main")
const selectedNav = ref("Today")
const queuedTranscriptId = ref(null)
const nextMatchedAppointment = ref(null)
const activeTool = ref(null)
const activeTemplate = ref(null)
const reflectionMode = ref("new")
const reflectionView = ref("main")

// --- Global next-session countdown ---
const currentTime = ref(Date.now())
let countdownInterval = null

const appointmentStart = computed(() => {
  const appointment = nextMatchedAppointment.value

  if (!appointment) return null

  const rawStart =
      appointment.start?.dateTime ||
      appointment.start?.date ||
      appointment.startTime ||
      appointment.start ||
      appointment.dateTime

  if (!rawStart) return null

  const timestamp = new Date(rawStart).getTime()

  return Number.isNaN(timestamp)
      ? null
      : timestamp
})

const minutesUntilNextSession = computed(() => {
  if (!appointmentStart.value) return null

  return Math.ceil(
      (appointmentStart.value - currentTime.value) / 60000
  )
})

const nextSessionCountdown = computed(() => {
  const minutes = minutesUntilNextSession.value

  if (minutes === null) {
    return ""
  }

  if (minutes === 0) {
    return "Starting now"
  }

  if (minutes < 0 && minutes > -60) {
    return "In progress"
  }

  if (minutes <= -60) {
    return "Session time passed"
  }

  if (minutes < 60) {
    return `${minutes} min`
  }

  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60

  if (remainingMinutes === 0) {
    return `${hours} hr`
  }

  return `${hours} hr ${remainingMinutes} min`
})

const nextSessionState = computed(() => {
  const minutes = minutesUntilNextSession.value

  if (minutes === null) {
    return "neutral"
  }

  if (minutes <= 5) {
    return "imminent"
  }

  if (minutes <= 15) {
    return "soon"
  }

  if (minutes <= 30) {
    return "approaching"
  }

  return "neutral"
})

const nextSessionClasses = computed(() => {
  switch (nextSessionState.value) {
    case "imminent":
      return "border-state-danger bg-surface-elevated text-state-danger"

    case "soon":
      return "border-state-warning bg-surface-elevated text-state-warning"

    case "approaching":
      return "border-border-strong bg-surface-elevated text-ink"

    default:
      return "border-border bg-surface-elevated text-ink-secondary"
  }
})

const nextSessionClockClasses = computed(() => {
  switch (nextSessionState.value) {
    case "imminent":
      return "bg-state-danger text-surface"

    case "soon":
      return "bg-state-warning text-surface"

    case "approaching":
      return "bg-surface-muted text-ink"

    default:
      return "bg-surface-muted text-ink-muted"
  }
})

const nextSessionAriaLabel = computed(() => {
  if (!nextSessionCountdown.value) {
    return "Next session"
  }

  return `Next session, ${nextSessionCountdown.value}`
})

// --- AI Drawer ---
const showAIDrawer = ref(false)
const showClientDrawer = ref(false)
const aiInput = ref(null)
const feedbackMessage = ref("")

const handleGenerateInsight = (data) => {
  aiInput.value = data
  showAIDrawer.value = true
}

// --- Clients ---
const clients = ref([])

const nextMatchedClient = computed(() => {
  return matchedClientForAppointment(
      nextMatchedAppointment.value
  )
})

const matchedClientForAppointment = (appointment) => {
  const summary = String(
      appointment?.summary || ""
  )
      .trim()
      .toLowerCase()

  const matches = clients.value.filter((client) => {
    const name = String(client.name || "")
        .trim()
        .toLowerCase()

    return (
        name &&
        (summary === name || summary.includes(name))
    )
  })

  return matches.length === 1
      ? matches[0]
      : null
}

watch(
    clients,
    (newClients) => {
      localStorage.setItem(
          "helio_clients",
          JSON.stringify(newClients)
      )
    },
    { deep: true }
)

const loadClients = async () => {
  try {
    clients.value = await listClients()

    const storedId =
        JSON.parse(
            localStorage.getItem("helio_selectedClient") ||
            "null"
        )?.id

    selectedClient.value =
        clients.value.find(
            (client) => client.id === storedId
        ) ||
        clients.value[0] ||
        null
  } catch (error) {
    console.error(
        "Unable to load clients:",
        error.message
    )

    feedbackMessage.value =
        "Unable to load clients"
  }
}

const handleAddClient = async (newClientData) => {
  if (isSyncing.value) return

  isSyncing.value = true

  try {
    const newClient =
        await createClientHelper({
          name:
              newClientData?.name ||
              "New Client",
          email: newClientData?.email,
          note: newClientData?.note
        })

    clients.value.push(newClient)

    clients.value.sort((a, b) =>
        a.display_name.localeCompare(
            b.display_name
        )
    )

    selectedClient.value = newClient

    localStorage.setItem(
        "helio_selectedClient",
        JSON.stringify(newClient)
    )

    feedbackMessage.value =
        "✅ Client added"

    setTimeout(
        () =>
            (feedbackMessage.value = ""),
        2000
    )
  } catch (error) {
    feedbackMessage.value =
        `Unable to add client: ${error.message}`
  } finally {
    isSyncing.value = false
  }
}

async function handleUpdateClientFocus(note) {
  if (!selectedClient.value || !supabase) {
    return
  }

  const { data, error } = await supabase
      .from("clients")
      .update({
        current_focus: note || null
      })
      .eq("id", selectedClient.value.id)
      .select()
      .single()

  if (error) {
    feedbackMessage.value =
        `Unable to save focus: ${error.message}`

    return
  }

  const updated = {
    ...data,
    name: data.display_name,
    note: data.current_focus
  }

  clients.value = clients.value.map(
      (client) =>
          client.id === updated.id
              ? updated
              : client
  )

  selectedClient.value = updated

  localStorage.setItem(
      "helio_selectedClient",
      JSON.stringify(updated)
  )

  feedbackMessage.value =
      "Current focus saved"

  setTimeout(
      () =>
          (feedbackMessage.value = ""),
      2000
  )
}

// --- Resources ---
const resources = ref(
    JSON.parse(
        localStorage.getItem("helio_resources")
    ) || [
      {
        id: 1,
        title: "Safe Calm Place (Audio)",
        type: "audio",
        url: ""
      },
      {
        id: 2,
        title: "Sensing Exercise (PDF)",
        type: "pdf",
        url: ""
      }
    ]
)

watch(
    resources,
    (newResources) => {
      localStorage.setItem(
          "helio_resources",
          JSON.stringify(newResources)
      )
    },
    { deep: true }
)

const handleAddResource = (
    newResourceData
) => {
  const newResource = {
    id: Date.now(),
    title:
        newResourceData.title?.trim() ||
        "Untitled Resource",
    type:
        newResourceData.type ||
        "link",
    url:
        newResourceData.url ||
        "",
    includeInExport: false,
    createdAt: new Date().toISOString()
  }

  resources.value.push(newResource)
}

// --- Reflections ---
const reflections = ref(
    JSON.parse(
        localStorage.getItem(
            "helio_reflections"
        )
    ) || []
)

watch(
    reflections,
    (newVal) => {
      localStorage.setItem(
          "helio_reflections",
          JSON.stringify(newVal)
      )
    },
    { deep: true }
)

const handleSaveReflection = (entry) => {
  if (!entry?.text?.trim()) return

  const newReflection = {
    id: Date.now(),
    ...entry,
    date: new Date().toISOString()
  }

  reflections.value.push(newReflection)

  feedbackMessage.value =
      "✅ Reflection saved"

  setTimeout(
      () =>
          (feedbackMessage.value = ""),
      3000
  )
}

const handleArchiveReflection = (
    id,
    value
) => {
  const r =
      reflections.value.find(
          (x) => x.id === id
      )

  if (r) {
    r.archived = !!value
  }
}

const handleSaveInsight = ({
                             clientId,
                             text
                           }) => {
  if (!clientId || !text) return

  const now =
      new Date().toISOString()

  let reflection =
      reflections.value
          .filter(
              (r) =>
                  r.clientId === clientId
          )
          .sort(
              (a, b) =>
                  new Date(b.createdAt) -
                  new Date(a.createdAt)
          )[0]

  if (!reflection) {
    reflection = {
      id: Date.now(),
      clientId,
      title: "New Reflection",
      text: "",
      createdAt: now,
      updatedAt: now,
      aiSummary: text
    }

    reflections.value.push(
        reflection
    )
  } else {
    reflection.aiSummary = text
    reflection.updatedAt = now
  }

  feedbackMessage.value =
      "✅ Insight saved to reflection"

  setTimeout(
      () =>
          (feedbackMessage.value = ""),
      3000
  )
}

// --- Reflection management ---
const handleDeleteReflection = (id) => {
  reflections.value =
      reflections.value.filter(
          (x) => x.id !== id
      )
}

const handleExportAllReflections = () => {
  alert(
      "Exporting all reflections... (PDF export coming soon)"
  )
}

// --- View management ---
const openReflection = (mode) => {
  reflectionMode.value = mode

  if (mode === "new") {
    activeView.value =
        "reflection"
  } else if (mode === "past") {
    activeView.value =
        "past-reflections"
  } else if (mode === "map") {
    activeView.value =
        "therapist-map"
  }
}

const storedClient =
    JSON.parse(
        localStorage.getItem(
            "helio_selectedClient"
        ) || "null"
    )

const selectedClient = ref(
    clients.value.find(
        (client) =>
            client.id === storedClient?.id
    ) || null
)

const clientWorkspace = ref(null)

const handleSelectClient = (client) => {
  selectedClient.value = client

  localStorage.setItem(
      "helio_selectedClient",
      JSON.stringify(client)
  )

  activeView.value = "main"
  selectedNav.value =
      "Client Workspace"
  showClientDrawer.value = true
  isSidebarOpen.value = false
}

const openTranscriptFromQueue = (
    item
) => {
  queuedTranscriptId.value =
      item.transcriptId

  selectedNav.value = "Inbox"
}

const openSessionFromQueue = async (
    item
) => {
  const client =
      clients.value.find(
          (candidate) =>
              String(candidate.id) ===
              String(item.clientId)
      )

  if (!client) return

  handleSelectClient(client)

  await nextTick()

  window.dispatchEvent(
      new CustomEvent(
          "helio:open-session",
          {
            detail: {
              sessionId: item.sessionId,
              clientId: item.clientId
            }
          }
      )
  )
}

const openAppointmentPreparation =
    async (appointment) => {
      const summary = String(
          appointment?.summary || ""
      )
          .trim()
          .toLowerCase()

      const matches =
          clients.value.filter(
              (client) => {
                const name = String(
                    client.name || ""
                )
                    .trim()
                    .toLowerCase()

                return (
                    name &&
                    (summary === name ||
                        summary.includes(name))
                )
              }
          )

      if (matches.length !== 1) {
        return
      }

      handleSelectClient(matches[0])

      await nextTick()

      window.dispatchEvent(
          new CustomEvent(
              "helio:prepare-session",
              {
                detail: {
                  clientId:
                  matches[0].id,
                  appointment
                }
              }
          )
      )
    }

const openClientRecord = () => {
  selectedNav.value =
      "Client Workspace"

  activeView.value = "main"
  showClientDrawer.value = false
}

const startClientSession = () => {
  if (!selectedClient.value) {
    return
  }

  if (
      selectedNav.value ===
      "Client Workspace" &&
      clientWorkspace.value
  ) {
    showClientDrawer.value = false

    clientWorkspace.value.startSession()

    return
  }

  openClientRecord()

  nextTick(() =>
      clientWorkspace.value?.startSession()
  )
}

const handleNavChange = (nav) => {
  selectedNav.value = nav

  if (nav !== "Inbox") {
    queuedTranscriptId.value = null
  }

  isSidebarOpen.value = false
}

const openTool = (payload) => {
  if (payload.group === "cbt") {
    activeTool.value = "cbt"
    activeTemplate.value =
        payload.template
    activeView.value = "cbt"
  } else if (
      payload.group === "ifs"
  ) {
    activeTool.value = "ifs"
    activeTemplate.value =
        payload.template
    activeView.value = "ifs"
  } else if (
      payload.group === "emdr"
  ) {
    activeTool.value = "emdr"
    activeTemplate.value =
        payload.template
    activeView.value = "emdr"
  } else {
    activeView.value = "main"
  }
}

const openSession = () => {
  isInSession.value = true
}

const endSession = () => {
  isInSession.value = false
}

const syncTranscript = async () => {
  if (!isInSession.value) return

  isSyncing.value = true

  try {
    await new Promise(
        (resolve) =>
            setTimeout(resolve, 1000)
    )
  } finally {
    isSyncing.value = false
  }
}

const activeViewLabel = computed(() => {
  switch (activeView.value) {
    case "cbt":
      return "CBT Tool"

    case "ifs":
      return "IFS Tool"

    case "emdr":
      return "EMDR Tool"

    case "reflection":
      return "Reflection"

    case "past-reflections":
      return "Past Reflections"

    case "therapist-map":
      return "Therapist Map"

    default:
      return "Session Notes"
  }
})

const headerOpacity = ref(1)

function handleScroll(e) {
  const scrollY = e.target.scrollTop

  headerOpacity.value =
      scrollY > 10
          ? 0.85
          : 1
}

const sessionDate = computed(() =>
    new Date().toLocaleDateString(
        undefined,
        {
          weekday: "short",
          month: "short",
          day: "numeric"
        }
    )
)

const toggleRightPanel = () => {
  isRightPanelOpen.value =
      !isRightPanelOpen.value
}

const showClientMap = () => {
  activeView.value = "main"
}

const updateScreen = () => {
  isDesktop.value =
      window.innerWidth >= 768

  if (isDesktop.value) {
    isSidebarOpen.value = true
  } else if (
      !isDesktop.value &&
      isSidebarOpen.value
  ) {
    isSidebarOpen.value = false
  }
}

const handleToolSaved = () => {
  isRightPanelOpen.value = false

  nextTick(() => {
    isRightPanelOpen.value = true
  })
}

onMounted(() => {
  loadClients()
  updateScreen()

  currentTime.value = Date.now()

  countdownInterval =
      window.setInterval(() => {
        currentTime.value = Date.now()
      }, 30000)

  window.addEventListener(
      "resize",
      updateScreen
  )

  window.addEventListener(
      "tool-saved",
      handleToolSaved
  )
})

onUnmounted(() => {
  if (countdownInterval) {
    window.clearInterval(
        countdownInterval
    )
  }

  window.removeEventListener(
      "resize",
      updateScreen
  )

  window.removeEventListener(
      "tool-saved",
      handleToolSaved
  )
})
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-enter-active,
.slide-leave-active {
  transition: transform 0.25s ease;
}

.slide-enter-from,
.slide-leave-to {
  transform: translateX(-100%);
}

.today-workspace {
  max-width: 68rem;
  margin: 0 auto;
  color: var(--text-primary);
}

.today-workspace-heading {
  margin-bottom: var(--space-stack-xl);
}

.today-workspace-heading h1 {
  margin: 0;
}

.today-workspace-heading p:not(.today-eyebrow) {
  margin: var(--space-stack-xs) 0 0;
  color: var(--text-muted);
}

.today-eyebrow {
  margin: 0 0 var(--space-stack-xs);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-muted);
}

.today-calendar {
  margin-top: var(--space-stack-2xl);
  padding-top: var(--space-stack-2xl);
  border-top: 1px solid var(--border-muted);
}
</style>