import { readonly, ref } from 'vue'
import { authenticatedFetch } from '../lib/api.js'

const isPanelOpen = ref(false)
const isExpanded = ref(false)
const panelWidth = ref(440)
const messages = ref([])
const conversations = ref([])
const activeConversationId = ref(null)

const STORAGE_KEY = 'helios-ask-prefs'

// Preferences Persistence (Non-sensitive)
function loadPrefs() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const prefs = JSON.parse(saved)
      panelWidth.value = prefs.width || 440
      isExpanded.value = prefs.isExpanded || false
    }
  } catch (e) {
    console.warn('Failed to load Ask Helios prefs', e)
  }
}

function savePrefs() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      width: panelWidth.value,
      isExpanded: isExpanded.value
    }))
  } catch (e) {
    console.warn('Failed to save Ask Helios prefs', e)
  }
}

loadPrefs()

export function useAskHelios() {
  async function fetchConversations() {
    try {
      const resp = await authenticatedFetch('/api/ai/conversations')
      const data = await resp.json()
      if (data.success) {
        conversations.value = data.conversations
      }
    } catch (e) {
      console.error('Failed to fetch conversations', e)
    }
  }

  async function selectConversation(id) {
    if (!id) {
      activeConversationId.value = null
      messages.value = []
      return
    }
    try {
      const resp = await authenticatedFetch(`/api/ai/conversations?id=${id}`)
      const data = await resp.json()
      if (data.success) {
        activeConversationId.value = id
        messages.value = data.messages.map(m => ({
          ...m,
          references: m.citation_metadata
        }))
      }
    } catch (e) {
      console.error('Failed to load conversation', e)
    }
  }

  async function deleteConversation(id) {
    try {
      const resp = await authenticatedFetch(`/api/ai/conversations?id=${id}`, { method: 'DELETE' })
      if (resp.ok) {
        conversations.value = conversations.value.filter(c => c.id !== id)
        if (activeConversationId.value === id) {
          selectConversation(null)
        }
      }
    } catch (e) {
      console.error('Failed to delete conversation', e)
    }
  }

  function togglePanel() {
    isPanelOpen.value = !isPanelOpen.value
    if (isPanelOpen.value && conversations.value.length === 0) {
      fetchConversations()
    }
  }

  function openPanel() {
    isPanelOpen.value = true
    fetchConversations()
  }

  function closePanel() {
    isPanelOpen.value = false
  }

  function setWidth(width) {
    panelWidth.value = Math.max(320, Math.min(width, window.innerWidth - 100))
    savePrefs()
  }

  function toggleExpand() {
    isExpanded.value = !isExpanded.value
    savePrefs()
  }

  function addMessage(message) {
    messages.value.push(message)
  }

  function clearConversation() {
    activeConversationId.value = null
    messages.value = []
  }

  return {
    isPanelOpen: readonly(isPanelOpen),
    isExpanded: readonly(isExpanded),
    panelWidth: readonly(panelWidth),
    messages: readonly(messages),
    conversations: readonly(conversations),
    activeConversationId: readonly(activeConversationId),
    togglePanel,
    openPanel,
    closePanel,
    setWidth,
    toggleExpand,
    addMessage,
    clearConversation,
    fetchConversations,
    selectConversation,
    deleteConversation
  }
}
