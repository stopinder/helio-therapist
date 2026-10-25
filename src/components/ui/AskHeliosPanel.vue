<template>
  <Transition name="slide-right">
    <div
      v-if="isPanelOpen"
      class="fixed bottom-0 right-0 z-40 flex flex-col border-l border-border bg-surface shadow-overlay transition-all duration-300 ease-in-out"
      :class="isExpanded ? 'inset-x-0 top-16 md:left-64' : 'top-16'"
      :style="!isExpanded ? { width: `${panelWidth}px` } : {}"
    >
      <!-- Resize Handle -->
      <div
        v-if="!isExpanded"
        class="absolute inset-y-0 left-0 w-1 cursor-col-resize hover:bg-accent/30 active:bg-accent/50"
        @mousedown="startResizing"
      ></div>

      <!-- Header -->
      <header class="flex h-12 shrink-0 items-center justify-between border-b border-border-muted bg-surface-subtle px-4">
        <div class="flex items-center gap-2">
          <Sparkles class="h-5 w-5 text-accent" />
          <h2 class="type-body-medium font-semibold text-ink">Ask Helios</h2>
        </div>
        <div class="flex items-center gap-1">
          <button
            type="button"
            class="rounded-control p-1.5 text-ink-secondary hover:bg-surface-muted transition-colors"
            :title="showHistory ? 'Back to chat' : 'Conversation history'"
            @click="showHistory = !showHistory"
          >
            <History v-if="!showHistory" class="h-4 w-4" />
            <MessageSquare v-else class="h-4 w-4" />
          </button>
          <button
            type="button"
            class="rounded-control p-1.5 text-ink-secondary hover:bg-surface-muted transition-colors"
            :title="isExpanded ? 'Restore size' : 'Expand to workspace'"
            @click="toggleExpand"
          >
            <Maximize2 v-if="!isExpanded" class="h-4 w-4" />
            <Minimize2 v-else class="h-4 w-4" />
          </button>
          <button
            type="button"
            class="rounded-control p-1.5 text-ink-secondary hover:bg-surface-muted transition-colors"
            title="Close panel"
            @click="closePanel"
          >
            <X class="h-4 w-4" />
          </button>
        </div>
      </header>

      <!-- Content Area -->
      <div v-if="showHistory" class="min-h-0 flex-1 overflow-y-auto p-4">
        <h3 class="type-body-small font-bold uppercase tracking-wider text-ink-muted mb-4">Past Conversations</h3>
        <div v-if="conversations.length === 0" class="text-center py-8 text-ink-subtle italic">
          No previous conversations found.
        </div>
        <div class="space-y-2">
          <div
            v-for="conv in conversations"
            :key="conv.id"
            class="group flex items-center justify-between rounded-control border border-border-muted p-3 hover:bg-surface-muted cursor-pointer transition-colors"
            :class="{ 'border-accent bg-accent/5': activeConversationId === conv.id }"
            @click="handleSelectConversation(conv.id)"
          >
            <div class="flex-1 min-w-0 mr-2">
              <div class="type-body-small font-medium text-ink truncate">{{ conv.title }}</div>
              <div class="text-[10px] text-ink-subtle">{{ new Date(conv.updated_at).toLocaleDateString() }}</div>
            </div>
            <button
              type="button"
              class="opacity-0 group-hover:opacity-100 p-1 text-ink-muted hover:text-state-danger transition-all"
              @click.stop="deleteConversation(conv.id)"
            >
              <Trash2 class="h-4 w-4" />
            </button>
          </div>
        </div>
        <button
          class="mt-6 w-full py-2 type-body-small font-medium text-accent border border-accent/20 rounded-control hover:bg-accent/5 transition-colors"
          @click="handleSelectConversation(null)"
        >
          Start New Conversation
        </button>
      </div>

      <!-- Chat History -->
      <div v-else ref="scrollContainer" class="min-h-0 flex-1 overflow-y-auto p-4 space-y-4">
        <div v-if="messages.length === 0" class="flex h-full flex-col items-center justify-center text-center p-8">
          <div class="mb-4 rounded-full bg-accent/10 p-4">
            <Sparkles class="h-8 w-8 text-accent" />
          </div>
          <h3 class="type-body-large font-semibold text-ink">Welcome to Ask Helios</h3>
          <p class="mt-2 text-sm text-ink-muted max-w-xs">
            Ask questions about psychotherapy, clinical research, or therapeutic approaches.
          </p>
        </div>

        <div
          v-for="(msg, index) in messages"
          :key="index"
          class="flex flex-col"
          :data-ask-message-index="index"
          :class="msg.role === 'user' ? 'items-end' : 'items-start'"
        >
          <div
            class="max-w-[85%] rounded-2xl px-4 py-2.5 text-sm"
            :class="msg.role === 'user'
              ? 'bg-action-primary text-on-action rounded-tr-none'
              : 'bg-surface-subtle text-ink rounded-tl-none border border-border-muted'"
          >
            <div class="whitespace-pre-wrap">{{ msg.content }}</div>
            
            <!-- References -->
            <div v-if="msg.references?.length" class="mt-3 pt-3 border-t border-border-muted/30">
              <h4 class="text-[10px] font-bold uppercase tracking-wider text-ink-muted mb-1.5">References</h4>
              <ul class="space-y-1.5">
                <li v-for="(ref, rIndex) in msg.references" :key="rIndex" class="text-xs">
                  <a :href="ref.url" target="_blank" rel="noopener noreferrer" class="text-accent hover:underline inline-flex items-center gap-1">
                    {{ ref.title }} <ExternalLink class="h-3 w-3" />
                  </a>
                  <div class="text-[10px] text-ink-subtle mt-0.5">{{ ref.citation }}</div>
                </li>
              </ul>
            </div>
          </div>
          <span class="mt-1 text-[10px] text-ink-subtle px-1">
            {{ msg.role === 'user' ? 'You' : 'Helio' }}
          </span>
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

      <!-- Input -->
      <footer class="shrink-0 border-t border-border-muted p-4">
        <form class="relative flex items-end gap-2" @submit.prevent="sendMessage">
          <textarea
            v-model="input"
            rows="1"
            class="block w-full resize-none rounded-control border border-border-muted bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-subtle focus:border-accent focus:ring-1 focus:ring-accent"
            placeholder="Ask anything..."
            :disabled="isLoading"
            @keydown.enter.prevent="sendMessage"
          ></textarea>
          <button
            type="submit"
            class="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-action-primary text-on-action shadow-sm transition-colors hover:bg-action-primary-hover disabled:opacity-50"
            :disabled="!input.trim() || isLoading"
          >
            <Send class="h-4 w-4" />
          </button>
        </form>
        <div class="mt-2 flex justify-between items-center px-1">
          <span class="text-[10px] text-ink-subtle">Powered by Helios Research AI</span>
          <button
            v-if="messages.length > 0"
            type="button"
            class="text-[10px] text-ink-muted hover:text-state-danger transition-colors"
            @click="clearConversation"
          >
            Clear chat
          </button>
        </div>
      </footer>
    </div>
  </Transition>
</template>

<script setup>
import { nextTick, ref, watch } from 'vue'
import { Sparkles, X, Maximize2, Minimize2, Send, ExternalLink, History, MessageSquare, Trash2 } from '@lucide/vue'
import { useAskHelios } from '../../composables/useAskHelios.js'
import { authenticatedFetch } from '../../lib/api.js'

const {
  isPanelOpen,
  isExpanded,
  panelWidth,
  messages,
  conversations,
  activeConversationId,
  closePanel,
  setWidth,
  toggleExpand,
  addMessage,
  clearConversation,
  selectConversation,
  deleteConversation,
  fetchConversations
} = useAskHelios()

const input = ref('')
const isLoading = ref(false)
const scrollContainer = ref(null)
const showHistory = ref(false)

const startResizing = (e) => {
  e.preventDefault()
  const startX = e.clientX
  const startWidth = panelWidth.value

  const onMouseMove = (moveEvent) => {
    const delta = startX - moveEvent.clientX
    setWidth(startWidth + delta)
  }

  const onMouseUp = () => {
    document.removeEventListener('mousemove', onMouseMove)
    document.removeEventListener('mouseup', onMouseUp)
  }

  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('mouseup', onMouseUp)
}

// Scroll the new answer to its beginning, not to the references at its end.
// Only move the chat pane: never scroll the surrounding application window.
const scrollToMessageStart = async (index) => {
  await nextTick()
  const container = scrollContainer.value
  const message = container?.querySelector(`[data-ask-message-index="${index}"]`)
  if (!container || !message) return
  container.scrollTop += message.getBoundingClientRect().top - container.getBoundingClientRect().top
}

const scrollToLatestAnswer = async () => {
  const lastAssistant = messages.value.findLastIndex(msg => msg.role === 'assistant')
  if (lastAssistant >= 0) await scrollToMessageStart(lastAssistant)
  else if (messages.value.length > 0) await scrollToMessageStart(messages.value.length - 1)
}

watch(isPanelOpen, (open) => {
  if (open && !showHistory.value) scrollToLatestAnswer()
})

const handleSelectConversation = async (id) => {
  await selectConversation(id)
  showHistory.value = false
  await scrollToLatestAnswer()
}

const sendMessage = async () => {
  const text = input.value.trim()
  if (!text || isLoading.value) return

  input.value = ''
  addMessage({ role: 'user', content: text })
  isLoading.value = true
  await scrollToMessageStart(messages.value.length - 1)

  try {
    const response = await authenticatedFetch('/api/ai/research', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: text,
        conversationId: activeConversationId.value,
        history: messages.value.slice(0, -1)
      })
    })

    if (!response.ok) {
      const data = await response.json()
      throw new Error(data.error?.message || 'Helio research assistant is temporarily unavailable.')
    }

    const data = await response.json()
    addMessage({
      role: 'assistant',
      content: data.answer,
      references: data.references
    })
    await scrollToMessageStart(messages.value.length - 1)
    
    // Refresh conversations list in background if it was a new conversation
    if (!activeConversationId.value) {
      fetchConversations()
    }
  } catch (err) {
    addMessage({
      role: 'assistant',
      content: `I'm sorry, I encountered an error while researching: ${err.message}`
    })
    await scrollToMessageStart(messages.value.length - 1)
  } finally {
    isLoading.value = false
  }
}
</script>

<style scoped>
.slide-right-enter-active,
.slide-right-leave-active {
  transition: transform 0.3s ease-in-out, opacity 0.3s ease-in-out;
}
.slide-right-enter-from,
.slide-right-leave-to {
  transform: translateX(100%);
  opacity: 0;
}
</style>
