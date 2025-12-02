<template>
  <transition name="drawer-fade">
    <div v-if="open" class="fixed inset-0 z-50 flex flex-col items-center justify-end">
      <!-- Backdrop -->
      <div
          class="absolute inset-0 bg-black/30 backdrop-blur-[2px]"
          @click="$emit('close')"
      ></div>

      <!-- Drawer Panel -->
      <transition name="drawer-slide">
        <div
            class="relative bg-white border-t border-[#d9dce1] shadow-xl w-full
                 max-h-[60vh] sm:max-h-[70vh] sm:rounded-t-lg sm:w-[90%] md:w-[70%] lg:w-[50%]
                 mx-auto flex flex-col transition-all duration-300"
        >
          <!-- Header -->
          <div class="flex items-center justify-between px-4 py-3 border-b border-[#e2e5ea] bg-[#fafbfc] rounded-t-lg">
            <h3 class="text-[15px] font-semibold text-[#2c3e50]">
              AI Insight Summary
            </h3>
            <button
                class="text-slate-500 hover:text-slate-700 text-[14px]"
                @click="$emit('close')"
            >
              ✕
            </button>
          </div>

          <!-- Content -->
          <div class="flex-1 overflow-auto p-4 text-[14px] text-slate-700 leading-relaxed">
            <transition name="content-fade" appear>
              <div key="drawer-content">
                <div v-if="loading" class="flex items-center justify-center py-6">
                  <span class="animate-pulse text-slate-400">Generating insight...</span>
                </div>

                <div v-else>
                  <p v-if="insight" class="whitespace-pre-wrap">{{ insight }}</p>
                  <p v-else class="italic text-slate-400">
                    No insight generated yet.
                  </p>
                </div>
              </div>
            </transition>
          </div>
        </div> <!-- 👈 closes the drawer panel -->
      </transition>
    </div> <!-- 👈 closes the main fade container -->
  </transition>
</template>



<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  open: Boolean,
  input: Object // receives { tool, clientId, form }
})
const emit = defineEmits(['close'])

const loading = ref(false)
const insight = ref('')

// Watch for new input to simulate AI output
watch(
    () => props.input,
    async (data) => {
      if (!data) return
      loading.value = true
      insight.value = ''
      // Simulated delay + pseudo AI response
      await new Promise((r) => setTimeout(r, 1500))
      insight.value = mockInsight(data)
      loading.value = false
    },
    { deep: true }
)

// Generate a simple fake AI insight
function mockInsight(data) {
  const { form } = data
  return (
      `Based on this Thought Record:\n\n` +
      `• Situation: ${form.situation || '—'}\n` +
      `• Main thought: ${form.automaticThoughts || '—'}\n` +
      `• Emotions: ${form.emotions || '—'} (${form.intensity || 'N/A'}%)\n\n` +
      `Reflective insight:\n` +
      `It seems this thought may involve cognitive distortions such as all-or-nothing or overgeneralisation. ` +
      `Encouraging the client to examine both the evidence for and against may support development of a more balanced perspective.`
  )
}
</script>

<style scoped>
.drawer-fade-enter-active, .drawer-fade-leave-active {
  transition: opacity 0.25s ease;
}
.drawer-fade-enter-from, .drawer-fade-leave-to {
  opacity: 0;
}
.drawer-slide-enter-active, .drawer-slide-leave-active {
  transition: transform 0.3s ease;
}
.drawer-slide-enter-from, .drawer-slide-leave-to {
  transform: translateY(100%);
}
.content-fade-enter-active {
  transition: opacity 0.4s ease 0.1s;
}
.content-fade-enter-from {
  opacity: 0;
}

</style>

