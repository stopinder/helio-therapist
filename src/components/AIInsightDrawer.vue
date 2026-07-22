<template>
  <transition name="drawer-fade">
    <div
        v-if="open"
        class="fixed inset-0 z-50 flex flex-col items-center justify-end"
        @keydown.esc="$emit('close')"
        tabindex="0"
        ref="drawerContainer"
    >
      <!-- Backdrop -->
      <div
          class="absolute inset-0 bg-black/30 backdrop-blur-[2px]"
          @click="$emit('close')"
      ></div>

      <!-- Drawer Panel -->
      <transition name="drawer-slide">
        <div
            class="relative bg-white border-t border-[#d9dce1] shadow-xl w-full
                 sm:rounded-t-lg sm:w-[90%] md:w-[70%] lg:w-[50%]
                 mx-auto flex flex-col"
            :style="{ height: panelHeightPx + 'px', maxHeight: '90vh', transition: 'height 0.3s ease' }"
            role="dialog"
            aria-modal="true"
            aria-label="AI insight summary"
        >
          <!-- Header -->
          <div class="flex items-center justify-between px-4 py-3 border-b border-[#e2e5ea] bg-[#fafbfc] rounded-t-lg">
            <h3 class="text-body font-semibold text-[#2c3e50]">AI Insight Summary</h3>
            <button class="text-slate-500 hover:text-slate-700 text-body" @click="$emit('close')" title="Close panel">✕</button>
          </div>

          <!-- Context line -->
          <div v-if="input" class="text-body-sm text-slate-500 px-4 py-1 border-b border-[#f1f3f5]">
            {{ contextLine }}
          </div>

          <!-- Toolbar -->
          <div class="flex items-center justify-end gap-2 px-4 py-2 border-b border-[#e2e5ea]">
            <button class="toolbar-btn" @click="saveInsight">💾 Save</button>
            <button class="toolbar-btn" @click="exportInsight">📤 Export</button>
            <button class="toolbar-btn" @click="copyInsight">📝 Copy</button>
            <button class="toolbar-btn" @click="regenerateInsight">🔁 Regenerate</button>
            <button class="toolbar-btn" @click="toggleExpand" :title="isExpanded ? 'Collapse panel' : 'Expand panel'">
              {{ isExpanded ? '⤡ Collapse' : '⤢ Expand' }}
            </button>
          </div>

          <!-- Inline confirmations -->
          <transition name="fade">
            <div v-if="feedback" class="text-body-sm text-green-600 text-right px-4 py-1" aria-live="polite">
              {{ feedback }}
            </div>
          </transition>

          <!-- Content -->
          <div class="flex-1 overflow-auto p-4 text-body text-slate-700 leading-relaxed">
            <transition name="content-fade" appear>
              <div key="drawer-content">
                <div v-if="loading" class="flex items-center justify-center py-6">
                  <span class="animate-pulse text-slate-400">Generating insight...</span>
                </div>

                <div v-else>
                  <p v-if="insight" class="whitespace-pre-wrap">{{ insight }}</p>
                  <p v-else class="italic text-slate-400">No insight generated yet.</p>

                  <!-- View reflection link -->
                  <div v-if="input?.tool === 'reflection' && input?.clientId" class="mt-4 text-right">
                    <button
                        class="text-body-sm px-3 py-1.5 rounded-md border border-[#d9dce1] text-[#3f4754] bg-white hover:bg-[#f5f7fa] transition"
                        @click="$emit('view-reflection', { clientId: input.clientId })"
                    >
                      View attached reflection
                    </button>
                  </div>
                </div>
              </div>
            </transition>
          </div>
        </div>
      </transition>
    </div>
  </transition>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount, toRef } from 'vue'
import { useFocusTrap } from '../composables/useFocusTrap.js'

const props = defineProps({
  open: Boolean,
  input: Object // { tool, clientId, form }
})
const emit = defineEmits([
  'close',
  'save-insight',
  'export-insight',
  'copy-insight',
  'regenerate-insight',
  'view-reflection'
])

const loading = ref(false)
const insight = ref('')
const feedback = ref('')
const isExpanded = ref(false)
const drawerContainer = ref(null)
useFocusTrap(drawerContainer, toRef(props, 'open'), () => emit('close'))

// Height control: default 60vh, expanded 90vh (converted to px for smoother animation)
const panelHeightPx = ref(0)
function vhToPx(vh) { return Math.round(window.innerHeight * (vh / 100)) }
function setHeight() { panelHeightPx.value = vhToPx(isExpanded.value ? 90 : 60) }
function toggleExpand() { isExpanded.value = !isExpanded.value; setHeight() }
function handleResize() { setHeight() }

// Context line
const contextLine = computed(() => {
  if (!props.input) return ''
  const { tool, form } = props.input
  const focus = form?.focus || form?.title || 'General'
  const client = form?.clientName || 'Unknown'
  const label =
      tool === 'reflection' ? 'Reflection' :
          tool === 'cbt' ? 'CBT Tool' :
              tool === 'ifs' ? 'IFS Parts Map' :
                  tool === 'emdr' ? 'EMDR Tool' : 'Insight'
  return `${label} · Client: ${client} · Focus: ${focus}`
})

// Watch for new input to simulate AI output
watch(
    () => props.input,
    async (data) => {
      if (!data) return
      loading.value = true
      insight.value = ''
      await new Promise((r) => setTimeout(r, 800))
      insight.value = mockInsight(data) // no ellipsis/artifact
      loading.value = false
    },
    { deep: true }
)

// Mock AI response generator (no ellipsis)
function mockInsight(data) {
  const { form } = data || {}
  const raw = (form?.text || form?.automaticThoughts || '').trim()
  const preview = raw.length > 240 ? raw.slice(0, 240) : raw
  const body = preview || 'No source text provided.'
  return `Reflective summary:\n\n"${body}"\n\nThemes may include boundaries, compassion, and parts integration. Consider reinforcing self-energy and balanced perspective taking.`
}

// Toolbar actions (all with visible local behavior)
function saveInsight() {
  if (!insight.value) return
  emit('save-insight', { clientId: props.input?.clientId, text: insight.value })
  feedback.value = '✅ Insight saved'
  setTimeout(() => (feedback.value = ''), 3000)
}
function exportInsight() {
  if (!insight.value) return
  try {
    const blob = new Blob([insight.value], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `helio-insight-${new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')}.txt`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
    emit('export-insight', { text: insight.value })
    feedback.value = '📤 Exported as .txt'
  } catch {
    feedback.value = '⚠️ Export failed'
  } finally {
    setTimeout(() => (feedback.value = ''), 3000)
  }
}
async function copyInsight() {
  if (!insight.value) return
  try {
    await navigator.clipboard.writeText(insight.value)
    emit('copy-insight', { text: insight.value })
    feedback.value = '✅ Copied to clipboard'
  } catch {
    feedback.value = '⚠️ Copy failed'
  } finally {
    setTimeout(() => (feedback.value = ''), 3000)
  }
}
function regenerateInsight() {
  if (!props.input) return
  emit('regenerate-insight', props.input)
  feedback.value = ''
  loading.value = true
  setTimeout(() => {
    insight.value = mockInsight(props.input)
    loading.value = false
    feedback.value = '🔁 Regenerated'
    setTimeout(() => (feedback.value = ''), 3000)
  }, 600)
}

// Lifecycle: initialize height and keep it correct on resize
onMounted(() => {
  setHeight()
  window.addEventListener('resize', handleResize)
})
onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
})
</script>

<style scoped>
.toolbar-btn {
  @apply text-body-sm px-3 py-1.5 rounded-md border border-border text-[#3f4754] bg-surface-elevated;
  transition: background-color var(--motion-standard) var(--motion-ease), border-color var(--motion-standard) var(--motion-ease);
}
.toolbar-btn:hover {
  background: var(--state-hover);
  border-color: var(--border-strong);
}

/* === Animations === */
.drawer-fade-enter-active,
.drawer-fade-leave-active {
  transition: opacity var(--motion-slow) var(--motion-ease);
}
.drawer-fade-enter-from,
.drawer-fade-leave-to {
  opacity: 0;
}

.drawer-slide-enter-active,
.drawer-slide-leave-active {
  transition: transform var(--motion-slow) var(--motion-ease);
}
.drawer-slide-enter-from {
  transform: translateY(100%);
}
.drawer-slide-leave-to {
  transform: translateY(100%);
}

.content-fade-enter-active {
  transition: opacity var(--motion-standard) var(--motion-ease);
}
.content-fade-enter-from {
  opacity: 0;
}
.fade-enter-active,
.fade-leave-active {
  transition: opacity var(--motion-standard) var(--motion-ease);
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
