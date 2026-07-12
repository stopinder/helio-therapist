<template>
  <transition name="drawer-fade">
    <div
        v-if="open"
        class="fixed inset-0 z-[60] flex justify-end"
        @keydown.esc="$emit('close')"
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
            class="relative w-full sm:w-[380px] md:w-[420px] bg-white shadow-2xl h-full flex flex-col border-l border-[#d9dce1]"
            @click.stop
            role="dialog"
            aria-modal="true"
            aria-label="Client Context"
        >
          <!-- Header -->
          <div class="h-14 flex items-center justify-between px-6 border-b border-[#d9dce1] bg-[#fafbfc] shrink-0">
            <h2 class="text-[16px] font-semibold text-[#2c3e50]">Client Context</h2>
            <button
                class="w-8 h-8 flex items-center justify-center rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
                @click="$emit('close')"
                aria-label="Close drawer"
            >
              <span class="text-xl">✕</span>
            </button>
          </div>

          <!-- Content -->
          <div class="flex-1 overflow-y-auto p-6 space-y-8">
            <template v-if="client">
              <!-- Current focus -->
              <section>
                <h3 class="text-[13px] font-bold text-slate-500 uppercase tracking-wider mb-3">Current focus</h3>
                <p class="text-[15px] text-[#2c3e50] leading-relaxed">
                  {{ client.note || 'No specific focus defined.' }}
                </p>
              </section>

              <!-- Plans -->
              <section>
                <h3 class="text-[13px] font-bold text-slate-500 uppercase tracking-wider mb-3">Plans</h3>
                <ul class="space-y-2 text-[14px] text-slate-600">
                  <li class="flex items-start gap-2">
                    <span class="text-slate-400 mt-1">•</span>
                    <span>Review progress on boundaries</span>
                  </li>
                  <li class="flex items-start gap-2">
                    <span class="text-slate-400 mt-1">•</span>
                    <span>Introduce parts work mapping</span>
                  </li>
                </ul>
              </section>

              <!-- Risk -->
              <section>
                <h3 class="text-[13px] font-bold text-slate-500 uppercase tracking-wider mb-3">Risk</h3>
                <div class="p-3 bg-slate-50 border border-slate-200 rounded text-[14px] text-slate-600">
                  Low risk identified. No recent safety concerns.
                </div>
              </section>

              <!-- Investigations -->
              <section>
                <h3 class="text-[13px] font-bold text-slate-500 uppercase tracking-wider mb-3">Investigations</h3>
                <p class="text-[14px] text-slate-600 italic">No active investigations.</p>
              </section>

              <!-- Recent notes -->
              <section>
                <h3 class="text-[13px] font-bold text-slate-500 uppercase tracking-wider mb-3">Recent notes</h3>
                <div class="space-y-4">
                  <div class="border-l-2 border-slate-200 pl-4 py-1">
                    <div class="text-[12px] text-slate-400 mb-1">Last week</div>
                    <p class="text-[14px] text-slate-600">Client reported improved communication with partner.</p>
                  </div>
                  <div class="border-l-2 border-slate-200 pl-4 py-1">
                    <div class="text-[12px] text-slate-400 mb-1">2 weeks ago</div>
                    <p class="text-[14px] text-slate-600">Discussed childhood influences on current triggers.</p>
                  </div>
                </div>
              </section>
            </template>

            <div v-else class="h-full flex items-center justify-center text-center p-8">
              <p class="text-slate-500 text-[15px]">
                No client selected. Open a client or appointment to view context.
              </p>
            </div>
          </div>
        </div>
      </transition>
    </div>
  </transition>
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'

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

const emit = defineEmits(['close'])

const drawerContainer = ref(null)

// Focus management and Escape key listener
const handleKeyDown = (e) => {
  if (e.key === 'Escape' && props.open) {
    emit('close')
  }
}

watch(() => props.open, (isOpen) => {
  if (isOpen) {
    document.addEventListener('keydown', handleKeyDown)
    // Prevent body scroll when drawer is open
    document.body.style.overflow = 'hidden'
  } else {
    document.removeEventListener('keydown', handleKeyDown)
    document.body.style.overflow = ''
  }
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleKeyDown)
  document.body.style.overflow = ''
})
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
</style>
