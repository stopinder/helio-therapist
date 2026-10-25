<template>
  <Transition name="slide-right">
    <div
      v-if="isPanelOpen"
      class="fixed bottom-0 right-0 z-40 flex flex-col border-l border-border bg-surface shadow-overlay transition-all duration-300 ease-in-out"
      :class="isExpanded ? 'inset-x-0 top-16 md:left-64' : 'top-16'"
      :style="!isExpanded ? { width: 'min(100vw, ' + panelWidth + 'px)' } : {}"
    >
      <div v-if="!isExpanded" class="absolute inset-y-0 left-0 w-1 cursor-col-resize hover:bg-accent/30 active:bg-accent/50" @mousedown="startResizing"></div>
      <header class="flex h-12 shrink-0 items-center justify-between border-b border-border-muted bg-surface-subtle px-4">
        <div class="flex items-center gap-2">
          <Sparkles class="h-5 w-5 text-accent" />
          <h2 class="type-body-medium font-semibold text-ink">Ask Helios</h2>
        </div>
        <div class="flex items-center gap-1">
          <button type="button" class="rounded-control p-1.5 text-ink-secondary hover:bg-surface-muted"
            :title="showHistory ? 'Back to chat' : 'Conversation history'" @click="showHistory = !showHistory">
            <History v-if="!showHistory" class="h-4 w-4" />
            <MessageSquare v-else class="h-4 w-4" />
          </button>
          <button type="button" class="rounded-control p-1.5 text-ink-secondary hover:bg-surface-muted"
            :title="isExpanded ? 'Restore size' : 'Expand to workspace'" @click="toggleExpand">
            <Maximize2 v-if="!isExpanded" class="h-4 w-4" />
            <Minimize2 v-else class="h-4 w-4" />
          </button>
          <button type="button" class="rounded-control p-1.5 text-ink-secondary hover:bg-surface-muted"
            title="Close panel" @click="closePanel"><X class="h-4 w-4" />
          </button>
        </div>
      </header>

      <div class="grid grid-cols-3 gap-1 border-b border-border-muted p-2" role="tablist" aria-label="Ask Helios mode">
        <button v-for="tab in tabs" :key="tab.id" type="button" role="tab"
          class="rounded-control px-2 py-2 text-xs font-medium transition-colors"
          :class="mode === tab.id ? 'bg-accent/10 text-accent border border-accent/20' : 'text-ink-secondary hover:bg-surface-muted'"
          :aria-selected="mode === tab.id" :disabled="isLoading"
          @click="changeMode(tab.id)">{{ tab.label }}</button>
      </div>

      <div v-if="modeNotice" role="status" class="border-b border-border-muted bg-accent/10 px-4 py-2 text-xs text-ink-secondary">{{ modeNotice }}</div>

      <div v-if="isRestoring" role="status" class="border-b border-border-muted px-4 py-2 text-xs text-ink-secondary">Restoring your saved conversation...</div>
      <div v-if="restoreError" role="alert" class="border-b border-border-muted px-4 py-3 text-xs text-state-danger">
        <p>{{ restoreError }}</p>
        <div class="mt-2 flex gap-3">
          <button type="button" class="font-medium underline" :disabled="isRestoring" @click="retryRestore">Retry restoration</button>
          <button type="button" class="font-medium underline" @click="clearConversation">Start a new chat</button>
        </div>
      </div>

      <div v-if="showHistory" class="min-h-0 flex-1 overflow-y-auto p-4">
        <h3 class="type-body-small font-bold uppercase tracking-wider text-ink-muted mb-4">Past Conversations</h3>
        <div v-if="conversations.length === 0" class="text-center py-8 text-ink-subtle italic">
          No previous conversations found.
        </div>
        <div class="space-y-2">
          <div v-for="conv in conversations" :key="conv.id"
            class="group flex items-center justify-between rounded-control border border-border-muted p-3 hover:bg-surface-muted cursor-pointer"
            :class="{ 'border-accent bg-accent/5': activeConversationId === conv.id }"
            @click="handleSelectConversation(conv.id)">
            <div class="flex-1 min-w-0 mr-2">
              <div class="type-body-small font-medium text-ink truncate">{{ conv.title }}</div>
              <div class="text-[10px] text-ink-subtle">{{ new Date(conv.updated_at).toLocaleDateString() }}</div>
            </div>
            <button type="button" class="opacity-0 group-hover:opacity-100 p-1 text-ink-muted hover:text-state-danger"
              title="Delete conversation" @click.stop="deleteConversation(conv.id)"><Trash2 class="h-4 w-4" /></button>
          </div>
        </div>
        <button type="button" class="mt-6 w-full py-2 type-body-small font-medium text-accent border border-accent/20 rounded-control hover:bg-accent/5"
          @click="handleSelectConversation(null)">Start New Conversation</button>
      </div>

      <div v-else ref="scrollContainer" class="min-h-0 flex-1 overflow-y-auto p-4 space-y-4" aria-live="polite">
        <div v-if="messages.length === 0" class="flex h-full flex-col items-center justify-center text-center p-5">
          <div class="mb-4 rounded-full bg-accent/10 p-4"><Sparkles class="h-8 w-8 text-accent" /></div>
          <h3 class="type-body-large font-semibold text-ink">{{ currentTab.heading }}</h3>
          <p class="mt-2 text-sm text-ink-muted max-w-xs">{{ currentTab.description }}</p>
          <div class="mt-5 grid w-full gap-2">
            <button v-for="example in currentTab.examples" :key="example" type="button"
              class="rounded-control border border-border-muted bg-surface-subtle p-2 text-xs text-left text-ink-secondary hover:border-accent"
              @click="input = example">{{ example }}</button>
          </div>
        </div>
        <div v-for="(msg, index) in messages" :key="index" class="flex flex-col"
          :data-ask-message-index="index" :class="msg.role === 'user' ? 'items-end' : 'items-start'">
          <div class="max-w-[92%] rounded-2xl px-4 py-2.5 text-sm"
            :class="msg.role === 'user'
              ? 'bg-action-primary text-on-action rounded-tr-none'
              : 'bg-surface-subtle text-ink rounded-tl-none border border-border-muted'">
            <div class="whitespace-pre-wrap">{{ msg.content }}</div>
            <div v-if="msg.references?.length" class="mt-3 pt-3 border-t border-border-muted/30">
              <h4 class="text-[10px] font-bold uppercase tracking-wider text-ink-muted mb-1.5">
                {{ mode === 'workspace' ? 'Workspace records' : 'References' }}
              </h4>
              <ul class="space-y-1.5">
                <li v-for="(reference, rIndex) in msg.references" :key="rIndex" class="text-xs">
                  <router-link v-if="reference.url?.startsWith('/')"
                    :to="reference.url" class="text-accent hover:underline" @click="closePanel">{{ reference.title }}</router-link>
                  <a v-else :href="reference.url" target="_blank" rel="noopener noreferrer"
                    class="text-accent hover:underline inline-flex items-center gap-1">
                    {{ reference.title }} <ExternalLink class="h-3 w-3" aria-hidden="true" />
                  </a>
                  <div class="text-[10px] text-ink-subtle mt-0.5">{{ reference.citation }}</div>
                </li>
              </ul>
            </div>
            <p v-if="msg.warning" class="mt-2 text-xs text-state-danger">{{ msg.warning }}</p>
            <div v-if="mode === 'workspace' && msg.documentSearch?.hasMore" class="mt-3 border-t border-border-muted pt-2">
              <button type="button" class="rounded-control border border-border-muted px-3 py-2 text-xs font-medium text-accent"
                :disabled="isLoading" @click="sendMessage('Show more documents')">Show next {{ Math.min(8, Math.max(0, msg.documentSearch.total - msg.documentSearch.shown)) }} documents</button>
            </div>
            <div v-if="msg.proposedAction?.type === 'create_reminder'" class="mt-3 border-t border-border-muted pt-2">
              <p class="text-xs text-ink-muted mb-2">Approve this change to your Today reminders?</p>
              <div class="flex flex-wrap gap-2">
                <button type="button" class="rounded-control bg-action-primary px-3 py-2 text-xs text-on-action disabled:opacity-50"
                  :disabled="isSavingAction" @click="confirmAction(index, msg)">Create reminder</button>
                <button type="button" class="rounded-control border border-border-muted px-3 py-2 text-xs"
                  :disabled="isSavingAction" @click="patchMessage(index, { proposedAction: null, actionStatus: 'Not created.' })">Cancel</button>
              </div>
            </div>
            <p v-if="msg.actionStatus" class="mt-2 text-xs text-ink-secondary">{{ msg.actionStatus }}</p>
            <div v-if="mode === 'reflect' && msg.role === 'assistant' && !msg.reflectionSaved" class="mt-3 border-t border-border-muted pt-2">
              <button v-if="typeof msg.reflectionDraft !== 'string'" type="button"
                class="text-xs font-medium text-accent hover:underline" @click="beginReflectionDraft(index, msg)">
                Save my reflection to CPD
              </button>
              <div v-else class="space-y-2">
                <label :for="'ask-helios-reflection-' + index" class="block text-xs font-medium text-ink-secondary">
                  Edit the text you want to save privately
                </label>
                <textarea :id="'ask-helios-reflection-' + index" :value="msg.reflectionDraft"
                  @input="patchMessage(index, { reflectionDraft: $event.target.value })"
                  maxlength="4000" rows="4"
                  class="w-full rounded-control border border-border-muted bg-surface p-2 text-xs text-ink"></textarea>
                <p class="text-[11px] text-ink-muted">Only your edited text will be saved to professional reflections; no AI answer or client record is saved.</p>
                <div class="flex gap-2">
                  <button type="button" class="rounded-control bg-action-primary px-3 py-2 text-xs text-on-action disabled:opacity-50"
                    :disabled="isSavingAction || msg.reflectionDraft.trim().length < 10" @click="confirmReflection(index, msg)">
                    Save private reflection
                  </button>
                  <button type="button" class="rounded-control border border-border-muted px-3 py-2 text-xs"
                    :disabled="isSavingAction" @click="patchMessage(index, { reflectionDraft: null })">Cancel</button>
                </div>
              </div>
            </div>
          </div>
          <span class="mt-1 px-1 text-[10px] text-ink-subtle">{{ msg.role === 'user' ? 'You' : 'Helios' }}</span>
        </div>
        <div v-if="isLoading" class="flex flex-col items-start">
          <div class="bg-surface-subtle text-ink rounded-2xl rounded-tl-none border border-border-muted px-4 py-2.5">
            <div class="flex gap-1">
              <span class="h-1.5 w-1.5 animate-bounce rounded-full bg-ink-muted"></span>
              <span class="h-1.5 w-1.5 animate-bounce rounded-full bg-ink-muted [animation-delay:0.2s]"></span>
              <span class="h-1.5 w-1.5 animate-bounce rounded-full bg-ink-muted [animation-delay:0.4s]"></span>
            </div>
          </div>
        </div>
      </div>

      <footer class="shrink-0 border-t border-border-muted p-3">
        <div v-if="mode === 'workspace'" class="mb-2">
          <label for="ask-helios-client" class="mb-1 block text-[11px] font-medium text-ink-secondary">
            Client for session preparation (optional)
          </label>
          <select id="ask-helios-client" :value="selectedClientId || ''"
            class="w-full rounded-control border border-border-muted bg-surface px-2 py-1.5 text-xs text-ink"
            :disabled="isLoading" @change="setSelectedClient($event.target.value)">
            <option value="">No client selected — general workspace</option>
            <option v-for="client in clients" :key="client.id" :value="client.id">{{ client.display_name }}</option>
          </select>
        </div>
        <form class="relative flex items-end gap-2" @submit.prevent="sendMessage">
          <textarea v-model="input" rows="2" maxlength="1200"
            class="block w-full resize-none rounded-control border border-border-muted bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-subtle focus:border-accent focus:ring-1 focus:ring-accent"
            :placeholder="currentTab.placeholder" :disabled="isLoading || isRestoring || !!restoreError" @keydown.enter.exact.prevent="sendMessage"></textarea>
          <button type="submit" title="Send to Ask Helios"
            class="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-action-primary text-on-action shadow-sm hover:bg-action-primary-hover disabled:opacity-50"
            :disabled="!input.trim() || isLoading || isRestoring || !!restoreError"><Send class="h-4 w-4" /></button>
        </form>
        <div class="mt-2 flex justify-between items-center px-1">
          <span class="text-[10px] text-ink-subtle">{{ currentTab.footer }}</span>
          <button v-if="messages.length" type="button"
            class="text-[10px] text-ink-muted hover:text-state-danger" :disabled="isLoading"
            @click="clearConversation">New chat</button>
        </div>
      </footer>
    </div>
  </Transition>
</template>

<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { Sparkles, X, Maximize2, Minimize2, Send, ExternalLink, History, MessageSquare, Trash2 } from '@lucide/vue'
import { useAskHelios } from '../../composables/useAskHelios.js'
import { resolveAskHeliosMode } from '../../lib/askHeliosIntent.js'
import { authenticatedFetch } from '../../lib/api.js'

const tabs = [
  {
    id: 'workspace', label: 'Workspace', heading: 'Your practice, easier to navigate',
    description: 'Find appointments, unfinished work, documents and reminders. Select a client to prepare for a session.',
    placeholder: 'What needs my attention this week?',
    footer: 'Your records only · Read-only unless you approve a reminder',
    examples: ['What needs my attention this week?', 'Show my unfinished sessions', 'Find my documents']
  },
  {
    id: 'research', label: 'Research', heading: 'Clinical research with real sources',
    description: 'Investigate therapeutic approaches and review published evidence, with links to actual publications.',
    placeholder: 'What does the evidence say about…?',
    footer: 'PubMed + Europe PMC · AI allowance applies',
    examples: ['What do systematic reviews say about ERP for OCD?', 'Compare evidence for CBT and psychodynamic therapy']
  },
  {
    id: 'reflect', label: 'Reflect', heading: 'A space to think',
    description: 'Explore a difficult interaction, a professional question or uncertainty. Avoid identifying clients.',
    placeholder: 'What would you like to reflect on?',
    footer: 'Private conversation · Not supervision · AI allowance applies',
    examples: ['Help me think about a difficult therapeutic interaction', 'Explore my uncertainty about a clinical boundary']
  }
]

const {
  isPanelOpen, isExpanded, panelWidth, mode, messages, conversations,
  activeConversationId, clients, selectedClientId,
  closePanel, setWidth, toggleExpand, addMessage, clearConversation,
  selectConversation, deleteConversation, fetchConversations,
  setMode, assignConversationId, setSelectedClient, patchMessage,
  isRestoring, restoreError, ensureConversationReady, retryRestore, getContextVersion, isContextCurrent
} = useAskHelios()
const currentTab = computed(() => tabs.find(t => t.id === mode.value) || tabs[0])
const input = ref('')
const isLoading = ref(false)
const isSavingAction = ref(false)
const scrollContainer = ref(null)
const showHistory = ref(false)
const modeNotice = ref('')

function changeMode(next) {
  setMode(next)
  modeNotice.value = ''
  showHistory.value = false
  input.value = ''
}
function startResizing(e) {
  e.preventDefault()
  const startX = e.clientX
  const original = panelWidth.value
  const onMove = event => setWidth(original + startX - event.clientX)
  const onUp = () => {
    document.removeEventListener('mousemove', onMove)
    document.removeEventListener('mouseup', onUp)
  }
  document.addEventListener('mousemove', onMove)
  document.addEventListener('mouseup', onUp)
}
async function scrollToMessageStart(index) {
  const targetMessage = messages.value[index]
  await nextTick()
  // A pending render must not scroll a closed panel or a different/restoring
  // conversation. Only the chat pane moves, never the surrounding workspace.
  if (!isPanelOpen.value || showHistory.value || isRestoring.value || restoreError.value ||
      !targetMessage || messages.value[index] !== targetMessage) return
  const container = scrollContainer.value
  const message = container?.querySelector('[data-ask-message-index="' + index + '"]')
  if (!container || !message) return
  container.scrollTop += message.getBoundingClientRect().top - container.getBoundingClientRect().top
}
async function scrollToLatestAnswer() {
  const index = messages.value.findLastIndex(m => m.role === 'assistant')
  if (index >= 0) await scrollToMessageStart(index)
  else if (messages.value.length) await scrollToMessageStart(messages.value.length - 1)
}
// Opening precedes async restoration. Position the latest answer only after
// restoration and rendering finish, including a return from the history list.
// Do not watch messages deeply: background metadata updates must not interrupt
// someone deliberately scrolling up to read an earlier answer.
watch(
  [isPanelOpen, showHistory, isRestoring, activeConversationId, restoreError],
  ([open, history, restoring, , error]) => {
    if (open && !history && !restoring && !error) void scrollToLatestAnswer()
  },
  { flush: 'post', immediate: true }
)
async function handleSelectConversation(id) {
  await selectConversation(id)
  showHistory.value = false
}
async function confirmAction(index, msg) {
  if (isSavingAction.value || msg.proposedAction?.type !== 'create_reminder') return
  isSavingAction.value = true
  const action = msg.proposedAction
  try {
    const resp = await authenticatedFetch('/api/ai/actions', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...action, confirmed: true })
    })
    if (!resp.ok) throw new Error('Reminder was not saved')
    patchMessage(index, { proposedAction: null, actionStatus: 'Reminder created. Open Today to see it.' })
  } catch {
    patchMessage(index, { actionStatus: 'The reminder could not be saved. You may retry.' })
  } finally { isSavingAction.value = false }
}
function beginReflectionDraft(index, msg) {
  const authored = [...messages.value.slice(0, index)].reverse().find(m => m.role === 'user')
  patchMessage(index, { reflectionDraft: (authored?.content || '').slice(0, 4000) })
}
async function confirmReflection(index, msg) {
  const body = typeof msg.reflectionDraft === 'string' ? msg.reflectionDraft.trim() : ''
  if (isSavingAction.value || body.length < 10 || body.length > 4000) return
  isSavingAction.value = true
  try {
    const resp = await authenticatedFetch('/api/ai/actions', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'save_private_reflection', body, confirmed: true })
    })
    if (!resp.ok) throw new Error('Unable to save private reflection')
    patchMessage(index, { reflectionDraft: null, reflectionSaved: true, actionStatus: 'Saved to your private professional reflections.' })
  } catch {
    patchMessage(index, { actionStatus: 'Unable to save reflection. Review the text and retry.' })
  } finally { isSavingAction.value = false }
}
async function sendMessage(override = null) {
  // Vue passes an event object for submit handlers; only a deliberate string
  // argument is a programmatic follow-up search.
  const text = typeof override === 'string' ? override.trim() : input.value.trim()
  if (!text || isLoading.value || isRestoring.value || restoreError.value) return
  // Wait for the owned conversation ID/history before deciding the destination.
  // A failed restore must never become an implicit new document search.
  if (!(await ensureConversationReady())) return
  if (isLoading.value) return
  // Natural-language questions about the practice must never accidentally
  // become a PubMed search simply because Research was previously selected.
  const lastWorkspaceTask = mode.value === 'workspace' && messages.value.at(-1)?.documentSearch ? 'documents' : null
  const sentMode = resolveAskHeliosMode(text, mode.value, { lastWorkspaceTask })
  if (sentMode !== mode.value) {
    setMode(sentMode) // starts a fresh, correctly scoped conversation
    showHistory.value = false
    modeNotice.value = sentMode === 'workspace'
      ? 'Switched to Workspace: this question concerns your practice, not published research.'
      : 'Switched to Research: this question requests published evidence.'
  } else {
    modeNotice.value = ''
  }
  const existingId = activeConversationId.value
  const requestVersion = getContextVersion()
  // Document task context is recovered by the authenticated API from the
  // persisted conversation, including after browser refresh or reopening.
  const history = messages.value.filter(m => ['user', 'assistant'].includes(m.role))
    .slice(-6).map(m => ({ role: m.role, content: m.content }))
  input.value = ''
  addMessage({ role: 'user', content: text })
  isLoading.value = true
  await scrollToMessageStart(messages.value.length - 1)
  try {
    const route = sentMode === 'research' ? '/api/ai/research' : '/api/ai/assist'
    const resp = await authenticatedFetch(route, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: sentMode, query: text, conversationId: existingId, history,
        clientId: sentMode === 'workspace' ? selectedClientId.value : null,
        // The server reconstructs trusted Workspace context from the saved transcript.
      })
    })
    const data = await resp.json()
    if (!isContextCurrent(requestVersion)) return
    if (!resp.ok) {
      const message = typeof data.error === 'string' ? data.error : data.error?.message
      throw new Error(message || 'Ask Helios is temporarily unavailable.')
    }
    addMessage({
      role: 'assistant', content: data.answer, references: data.references || [],
      proposedAction: data.proposedAction || null, warning: data.warning,
      documentSearch: data.documentSearch || null
    })
    if (data.saved !== false && data.conversationId) {
      assignConversationId(data.conversationId)
      fetchConversations()
    }
    await scrollToMessageStart(messages.value.length - 1)
  } catch (error) {
    if (!isContextCurrent(requestVersion)) return
    addMessage({ role: 'assistant', content: 'I could not complete that request. ' + error.message })
    await scrollToMessageStart(messages.value.length - 1)
  } finally { isLoading.value = false }
}
</script>

<style scoped>
.slide-right-enter-active,
.slide-right-leave-active { transition: transform 0.3s ease-in-out, opacity 0.3s ease-in-out; }
.slide-right-enter-from,
.slide-right-leave-to { transform: translateX(100%); opacity: 0; }
</style>
