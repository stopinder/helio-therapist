<template>
  <transition name="drawer-fade">
    <div
        v-if="open"
        class="fixed inset-0 z-[60] flex justify-end"
        tabindex="-1"
        ref="drawerContainer"
    >
      <!-- Backdrop (for outside click) -->
      <div
          class="absolute inset-0 bg-black/10 transition-opacity"
          @click="$emit('close')"
      ></div>

      <!-- Drawer Panel -->
      <transition name="drawer-slide">
        <div
          class="relative w-full sm:w-[380px] md:w-[420px] bg-surface-overlay shadow-overlay h-full flex flex-col border-l border-border"
            @click.stop
            role="dialog"
            aria-modal="true"
            aria-label="Client Context"
        >
          <!-- Header -->
          <div class="h-14 flex items-center justify-between px-stack-xl border-b border-border bg-surface-muted shrink-0">
            <div>
              <div class="text-caption text-slate-500">Client summary</div>
              <h2 class="text-body-long font-semibold text-[#2c3e50]">{{ client?.name || 'No client selected' }}</h2>
            </div>
            <button
                class="w-8 h-8 flex items-center justify-center rounded-md text-slate-400 interaction-control focus-visible:outline-none"
                @click="$emit('close')"
                aria-label="Close drawer"
            >
              <span class="text-h2">✕</span>
            </button>
          </div>

          <!-- Content -->
          <div class="flex-1 overflow-y-auto p-stack-xl space-y-8 bg-surface-overlay">
            <template v-if="client">
              <!-- Current focus -->
              <section>
                <h3 class="text-body-sm font-bold text-slate-500 uppercase tracking-wider mb-3">Current focus</h3>
                <p class="text-body text-[#2c3e50] leading-relaxed">
                  {{ client.note || 'No specific focus defined.' }}
                </p>
              </section>

              <section>
                <h3 class="text-body-sm font-bold text-slate-500 uppercase tracking-wider mb-3">Record</h3>
                <div class="space-y-3 text-body text-slate-600">
                  <div class="flex justify-between gap-4"><span>Next appointment</span><strong class="text-[#2c3e50]">Not scheduled</strong></div>
                  <p class="text-body-sm leading-relaxed text-slate-500">Open the client record to review sessions and therapist-maintained context.</p>
                </div>
              </section>
              <section>
                <h3 class="text-body-sm font-bold text-slate-500 uppercase tracking-wider mb-3">Actions</h3>
                <div class="grid gap-2">
                  <button class="context-action" @click="$emit('open-record')">Open full client record</button>
                  <button class="context-action" @click="$emit('start-session')">Start session</button>
                  <button class="context-action muted" disabled>Send questionnaire <span>Coming next</span></button>
                </div>
              </section>
            </template>

            <div v-else class="h-full flex items-center justify-center text-center p-8">
              <p class="text-slate-500 text-body">
                No client selected. Open a client or appointment to view context.
              </p>
            </div>
          </div>

          <div v-if="client" class="shrink-0 border-t border-border bg-surface-overlay p-stack-lg">
            <button
                class="w-full rounded-lg bg-[#2563eb] px-4 py-2.5 text-body font-semibold text-white interaction-control"
                @click="$emit('open-record')"
            >
              Open full client record
            </button>
          </div>
        </div>
      </transition>
    </div>
  </transition>
</template>

<script setup>
import { ref, watch, onBeforeUnmount, toRef } from 'vue'
import { useFocusTrap } from '../../composables/useFocusTrap.js'

const props = defineProps({
  open: {
    type: Boolean,
    default: false
  },
  client: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['close', 'open-record', 'start-session'])

const drawerContainer = ref(null)

useFocusTrap(drawerContainer, toRef(props, 'open'), () => emit('close'))

watch(() => props.open, (isOpen) => {
  if (isOpen) {
    // Prevent body scroll when drawer is open
    document.body.style.overflow = 'hidden'
  } else {
    document.body.style.overflow = ''
  }
})

onBeforeUnmount(() => { document.body.style.overflow = '' })
</script>

<style scoped>
.drawer-fade-enter-active,
.drawer-fade-leave-active {
  transition: opacity 0.2s ease;
}
.drawer-fade-enter-from,
.drawer-fade-leave-to {
  opacity: 0;
}

.drawer-slide-enter-active,
.drawer-slide-leave-active {
  transition: transform 0.3s ease;
}
.drawer-slide-enter-from,
.drawer-slide-leave-to {
  transform: translateX(100%);
}
.context-action{width:100%;text-align:left;border:1px solid var(--border);border-radius:.55rem;padding:.7rem .8rem;background:var(--surface-elevated);color:#2563eb;font-size:14px;font-weight:600;transition:background-color var(--motion-standard) var(--motion-ease),border-color var(--motion-standard) var(--motion-ease)}.context-action:hover:not(:disabled){background:var(--state-hover);border-color:var(--border-strong)}.context-action.muted{color:var(--state-disabled);cursor:not-allowed;background:var(--surface-muted)}.context-action span{float:right;font-size:11px;font-weight:500}
</style>
