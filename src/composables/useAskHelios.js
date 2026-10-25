import { readonly, ref } from 'vue'
import { authenticatedFetch } from '../lib/api.js'
import { supabase } from '../lib/supabase.js'

export const ASK_HELIOS_MODES = Object.freeze(['workspace', 'research', 'reflect'])
const isPanelOpen = ref(false)
const isExpanded = ref(false)
const panelWidth = ref(440)
const mode = ref('workspace')
const messages = ref([])
const conversations = ref([])
const activeConversationId = ref(null)
const clients = ref([])
const selectedClientId = ref(null)
const isRestoring = ref(false)
const restoreError = ref('')
const STORAGE_KEY = 'helios-ask-prefs'
const ACTIVE_PREFIX = 'helios-ask-active:'
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
let lastUserId = null
let identityKnown = false
let stateVersion = 0
let restoreTarget = null
let preparePromise = null

function loadPrefs() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
    if (Number.isFinite(saved.width)) panelWidth.value = Math.min(820, Math.max(320, saved.width))
    isExpanded.value = saved.isExpanded === true
    if (ASK_HELIOS_MODES.includes(saved.mode)) mode.value = saved.mode
  } catch { /* Preference storage is optional. */ }
}
function savePrefs() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ width: panelWidth.value, isExpanded: isExpanded.value, mode: mode.value }))
  } catch { /* Preference storage is optional. */ }
}
function rememberConversation(id) {
  // A per-account, per-tab pointer only. Never store chat text, titles, client
  // details or search filters in browser storage. The API rechecks ownership.
  if (!lastUserId) return
  try {
    const key = ACTIVE_PREFIX + lastUserId
    if (typeof id === 'string' && UUID.test(id)) sessionStorage.setItem(key, id)
    else sessionStorage.removeItem(key)
  } catch { /* History selection remains available without session storage. */ }
}
function rememberedConversation() {
  if (!lastUserId) return null
  try {
    const id = sessionStorage.getItem(ACTIVE_PREFIX + lastUserId)
    return typeof id === 'string' && UUID.test(id) ? id : null
  } catch { return null }
}
function resetConversation({ forget = true } = {}) {
  stateVersion++ // invalidates all in-flight responses for the previous task
  if (forget) rememberConversation(null)
  activeConversationId.value = null
  selectedClientId.value = null
  messages.value = []
  restoreTarget = null
  restoreError.value = ''
  isRestoring.value = false
}
function changeIdentity(userId, event = '') {
  const changed = identityKnown && userId !== lastUserId
  if (changed || event === 'SIGNED_OUT') {
    resetConversation()
    conversations.value = []
    clients.value = []
    isPanelOpen.value = false
  }
  lastUserId = userId
  identityKnown = true
}
if (supabase?.auth?.onAuthStateChange) {
  // Keep auth callbacks synchronous; no nested auth/network call under its lock.
  supabase.auth.onAuthStateChange((event, session) => changeIdentity(session?.user?.id || null, event))
}
loadPrefs()

function modeFromTitle(title) {
  if (String(title || '').startsWith('[Workspace]')) return 'workspace'
  if (String(title || '').startsWith('[Reflect]')) return 'reflect'
  return 'research'
}

export function useAskHelios() {
  async function establishIdentity() {
    if (identityKnown || !supabase?.auth?.getSession) return
    const { data, error } = await supabase.auth.getSession()
    if (error) throw error
    changeIdentity(data?.session?.user?.id || null)
  }

  async function fetchConversations() {
    const version = stateVersion
    const userId = lastUserId
    try {
      const resp = await authenticatedFetch('/api/ai/conversations')
      if (!resp.ok) return
      const data = await resp.json()
      if (version !== stateVersion || userId !== lastUserId) return
      if (data.success) conversations.value = Array.isArray(data.conversations) ? data.conversations : []
    } catch { /* Do not log sensitive server payloads. */ }
  }

  async function loadClients() {
    const version = stateVersion
    const userId = lastUserId
    try {
      const resp = await authenticatedFetch('/api/ai/workspace-clients')
      const data = resp.ok ? await resp.json() : null
      if (version !== stateVersion || userId !== lastUserId) return
      clients.value = Array.isArray(data?.clients) ? data.clients : []
    } catch { if (version === stateVersion) clients.value = [] }
  }

  async function loadConversation(id) {
    const version = ++stateVersion
    const userId = lastUserId
    restoreTarget = id
    isRestoring.value = true
    restoreError.value = ''
    activeConversationId.value = null
    messages.value = []
    selectedClientId.value = null
    try {
      const resp = await authenticatedFetch('/api/ai/conversations?id=' + encodeURIComponent(id))
      if (!resp.ok) throw new Error('History unavailable')
      const data = await resp.json()
      if (version !== stateVersion || userId !== lastUserId) return false
      if (!data.success || !data.conversation || !Array.isArray(data.messages)) throw new Error('Incomplete history')
      if (data.conversation.id && data.conversation.id !== id) throw new Error('Conversation mismatch')
      activeConversationId.value = id
      mode.value = modeFromTitle(data.conversation.title)
      messages.value = data.messages.map(m => ({
        ...m, references: Array.isArray(m.citation_metadata) ? m.citation_metadata : []
      }))
      rememberConversation(id)
      restoreTarget = null
      savePrefs()
      if (mode.value === 'workspace') void loadClients()
      return true
    } catch {
      if (version === stateVersion && userId === lastUserId) {
        restoreError.value = 'Your saved conversation could not be restored. Retry, select it from history, or deliberately start a new chat.'
      }
      return false
    } finally {
      if (version === stateVersion) isRestoring.value = false
    }
  }

  async function ensureConversationReady({ retry = false } = {}) {
    if (preparePromise) return preparePromise
    if (isRestoring.value) return false // a manually selected history item is still loading
    if (restoreError.value && !retry) return false
    const version = stateVersion
    isRestoring.value = true
    const job = (async () => {
      try {
        await establishIdentity()
        if (version !== stateVersion) return false
        if (activeConversationId.value) return true
        const id = restoreTarget || rememberedConversation()
        if (!id) return true
        return await loadConversation(id)
      } catch {
        if (version === stateVersion) restoreError.value = 'Unable to check your saved conversation. Please retry.'
        return false
      }
    })()
    preparePromise = job
    try { return await job } finally {
      if (preparePromise === job) {
        preparePromise = null
        // A newer history selection may still be loading; only its own
        // completion is allowed to re-enable the composer.
        if (version === stateVersion) isRestoring.value = false
      }
    }
  }

  async function selectConversation(id) {
    if (!id) { resetConversation(); return true }
    // Prevent a submit while the selected account/history is still loading.
    isRestoring.value = true
    try { await establishIdentity() } catch {
      restoreTarget = id
      restoreError.value = 'Unable to load conversation history. Please retry.'
      isRestoring.value = false
      return false
    }
    return loadConversation(id)
  }

  async function deleteConversation(id) {
    const version = stateVersion
    try {
      const resp = await authenticatedFetch('/api/ai/conversations?id=' + encodeURIComponent(id), { method: 'DELETE' })
      if (resp.ok && version === stateVersion) {
        conversations.value = conversations.value.filter(c => c.id !== id)
        if (activeConversationId.value === id || rememberedConversation() === id) resetConversation()
      }
    } catch { /* Keep history until deletion is confirmed by the API. */ }
  }

  function clearConversation() { resetConversation() }
  function setMode(next) {
    if (!ASK_HELIOS_MODES.includes(next) || next === mode.value) return
    mode.value = next
    resetConversation()
    savePrefs()
    if (next === 'workspace') void loadClients()
  }
  async function initialisePanel() {
    const ready = await ensureConversationReady()
    if (isPanelOpen.value) {
      await fetchConversations()
      if (mode.value === 'workspace') await loadClients()
    }
    return ready
  }
  function togglePanel() {
    isPanelOpen.value = !isPanelOpen.value
    return isPanelOpen.value ? initialisePanel() : Promise.resolve(true)
  }
  function openPanel() { isPanelOpen.value = true; return initialisePanel() }
  function closePanel() { isPanelOpen.value = false }
  function setWidth(width) {
    panelWidth.value = Math.max(320, Math.min(width, window.innerWidth - 100)); savePrefs()
  }
  function toggleExpand() { isExpanded.value = !isExpanded.value; savePrefs() }
  function addMessage(message) { messages.value.push(message) }
  function patchMessage(index, changes) {
    if (Number.isInteger(index) && messages.value[index]) Object.assign(messages.value[index], changes)
  }
  function assignConversationId(id) {
    if (typeof id === 'string' && id) { activeConversationId.value = id; rememberConversation(id) }
  }
  function setSelectedClient(id) { selectedClientId.value = clients.value.some(c => c.id === id) ? id : null }

  return {
    isPanelOpen: readonly(isPanelOpen), isExpanded: readonly(isExpanded), panelWidth: readonly(panelWidth),
    mode: readonly(mode), messages: readonly(messages), conversations: readonly(conversations),
    activeConversationId: readonly(activeConversationId), clients: readonly(clients), selectedClientId: readonly(selectedClientId),
    isRestoring: readonly(isRestoring), restoreError: readonly(restoreError),
    togglePanel, openPanel, closePanel, setWidth, toggleExpand, addMessage, assignConversationId, patchMessage,
    setMode, setSelectedClient, clearConversation, fetchConversations, selectConversation, deleteConversation, loadClients,
    ensureConversationReady, retryRestore: () => ensureConversationReady({ retry: true }),
    getContextVersion: () => stateVersion, isContextCurrent: version => version === stateVersion
  }
}
