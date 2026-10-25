import { readonly, ref } from 'vue'
import { authenticatedFetch } from '../lib/api.js'
import { supabase } from '../lib/supabase.js'

export const ASK_HELIOS_MODES = Object.freeze(['workspace', 'research', 'reflect'])
const isPanelOpen = ref(false)
const isExpanded = ref(false)
const panelWidth = ref(440)
// Practice management is the safest starting mode; research must be intentional.
const mode = ref('workspace')
const messages = ref([])
const conversations = ref([])
const activeConversationId = ref(null)
const clients = ref([])
const selectedClientId = ref(null)
const STORAGE_KEY = 'helios-ask-prefs'

function loadPrefs() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
    if (Number.isFinite(saved.width)) panelWidth.value = Math.min(820, Math.max(320, saved.width))
    isExpanded.value = saved.isExpanded === true
    if (ASK_HELIOS_MODES.includes(saved.mode)) mode.value = saved.mode
  } catch {
    // The panel works normally if non-sensitive local preferences are absent.
  }
}
function savePrefs() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      width: panelWidth.value, isExpanded: isExpanded.value, mode: mode.value
    }))
  } catch {
    // Non-sensitive preference persistence is optional.
  }
}
function clearPrivateState() {
  messages.value = []
  conversations.value = []
  activeConversationId.value = null
  clients.value = []
  selectedClientId.value = null
  isPanelOpen.value = false
}
// The composable is module-scoped: protect user A's in-memory conversation if
// the shared browser signs out or changes to another therapist's account.
let lastUserId = null
if (supabase?.auth?.onAuthStateChange) {
  supabase.auth.onAuthStateChange((_event, session) => {
    const next = session?.user?.id || null
    if (lastUserId && next !== lastUserId) clearPrivateState()
    if (!next) clearPrivateState()
    lastUserId = next
  })
}
loadPrefs()

function modeFromTitle(title) {
  if (String(title || '').startsWith('[Workspace]')) return 'workspace'
  if (String(title || '').startsWith('[Reflect]')) return 'reflect'
  return 'research'
}

export function useAskHelios() {
  async function fetchConversations() {
    try {
      const resp = await authenticatedFetch('/api/ai/conversations')
      if (!resp.ok) return
      const data = await resp.json()
      if (data.success) conversations.value = Array.isArray(data.conversations) ? data.conversations : []
    } catch {
      // Do not print potentially sensitive server payloads.
    }
  }

  async function loadClients() {
    try {
      const resp = await authenticatedFetch('/api/ai/workspace-clients')
      if (!resp.ok) { clients.value = []; return }
      const data = await resp.json()
      clients.value = Array.isArray(data.clients) ? data.clients : []
    } catch { clients.value = [] }
  }

  async function selectConversation(id) {
    if (!id) {
      activeConversationId.value = null
      messages.value = []
      selectedClientId.value = null
      return
    }
    try {
      const resp = await authenticatedFetch('/api/ai/conversations?id=' + encodeURIComponent(id))
      if (!resp.ok) return
      const data = await resp.json()
      if (data.success) {
        activeConversationId.value = id
        mode.value = modeFromTitle(data.conversation?.title)
        messages.value = (data.messages || []).map(m => ({
          ...m, references: Array.isArray(m.citation_metadata) ? m.citation_metadata : []
        }))
        selectedClientId.value = null
        savePrefs()
        if (mode.value === 'workspace') await loadClients()
      }
    } catch { /* Keep current conversation if loading fails. */ }
  }

  async function deleteConversation(id) {
    try {
      const resp = await authenticatedFetch('/api/ai/conversations?id=' + encodeURIComponent(id), { method: 'DELETE' })
      if (resp.ok) {
        conversations.value = conversations.value.filter(c => c.id !== id)
        if (activeConversationId.value === id) await selectConversation(null)
      }
    } catch { /* No local deletion when server deletion fails. */ }
  }

  function clearConversation() {
    activeConversationId.value = null
    messages.value = []
  }

  function setMode(next) {
    if (!ASK_HELIOS_MODES.includes(next) || next === mode.value) return
    mode.value = next
    clearConversation()
    selectedClientId.value = null
    savePrefs()
    if (next === 'workspace') loadClients()
  }

  function togglePanel() {
    isPanelOpen.value = !isPanelOpen.value
    if (isPanelOpen.value) {
      fetchConversations()
      if (mode.value === 'workspace') loadClients()
    }
  }
  function openPanel() {
    isPanelOpen.value = true
    fetchConversations()
    if (mode.value === 'workspace') loadClients()
  }
  function closePanel() { isPanelOpen.value = false }
  function setWidth(width) {
    panelWidth.value = Math.max(320, Math.min(width, window.innerWidth - 100))
    savePrefs()
  }
  function toggleExpand() {
    isExpanded.value = !isExpanded.value
    savePrefs()
  }
  function addMessage(message) { messages.value.push(message) }
  function patchMessage(index, changes) {
    if (Number.isInteger(index) && messages.value[index]) Object.assign(messages.value[index], changes)
  }
  function assignConversationId(id) {
    if (typeof id === 'string' && id) activeConversationId.value = id
  }
  function setSelectedClient(id) {
    selectedClientId.value = clients.value.some(c => c.id === id) ? id : null
  }

  return {
    isPanelOpen: readonly(isPanelOpen),
    isExpanded: readonly(isExpanded),
    panelWidth: readonly(panelWidth),
    mode: readonly(mode),
    messages: readonly(messages),
    conversations: readonly(conversations),
    activeConversationId: readonly(activeConversationId),
    clients: readonly(clients),
    selectedClientId: readonly(selectedClientId),
    togglePanel, openPanel, closePanel, setWidth, toggleExpand, addMessage,
    assignConversationId, patchMessage, setMode, setSelectedClient,
    clearConversation, fetchConversations, selectConversation, deleteConversation, loadClients
  }
}
