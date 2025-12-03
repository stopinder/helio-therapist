<template>
  <div class="max-w-3xl mx-auto space-y-4">
    <div class="bg-white border border-[#e5e7eb] rounded-md p-5 shadow-sm">
      <div class="flex items-center justify-between mb-3">
        <h2 class="text-[18px] font-semibold text-[#2c3e50]">New Reflection</h2>
        <button
            class="text-[13px] px-3 py-1.5 rounded-md border border-[#d9dce1] text-[#3f4754] bg-white hover:bg-[#f5f7fa] transition"
            @click="$emit('close')"
        >
          Back to Workspace
        </button>
      </div>

      <!-- Inputs -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
        <label class="text-[13px] text-slate-600">
          Client (optional)
          <select
              v-model="form.clientId"
              class="mt-1 w-full text-[14px] border border-[#d9dce1] rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
          >
            <option :value="null">— None —</option>
            <option v-for="c in clients" :key="c.id" :value="c.id">{{ c.name }}</option>
          </select>
        </label>

        <label class="text-[13px] text-slate-600">
          Focus
          <input
              v-model.trim="form.focus"
              placeholder="e.g., supervision, boundaries, self-energy"
              class="mt-1 w-full text-[14px] border border-[#d9dce1] rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
          />
        </label>

        <label class="text-[13px] text-slate-600">
          Mood (1–5)
          <input
              v-model.number="form.mood"
              type="number"
              min="1" max="5"
              class="mt-1 w-full text-[14px] border border-[#d9dce1] rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
          />
        </label>

        <label class="text-[13px] text-slate-600">
          Tags (comma-separated)
          <input
              v-model.trim="tagsText"
              placeholder="presence, burden, countertransference"
              class="mt-1 w-full text-[14px] border border-[#d9dce1] rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
          />
        </label>
      </div>

      <label class="block text-[13px] text-slate-600">
        Reflection
        <textarea
            v-model.trim="form.text"
            placeholder="Write your reflection..."
            class="mt-1 w-full h-48 border border-[#d9dce1] rounded-md p-3 text-[14px] focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
        ></textarea>
      </label>

      <!-- Buttons -->
      <div class="flex items-center justify-between mt-4">
        <div class="text-[12px] text-slate-500">
          Saved locally. You can generate an AI summary for deeper insights.
        </div>
        <div class="flex gap-2">
          <button
              class="text-[13px] px-3 py-1.5 rounded-md border border-[#d9dce1] text-[#2563eb] bg-white hover:bg-[#f5f7fa] transition"
              :disabled="!form.text"
              @click="emitInsight"
          >
            Generate AI Summary
          </button>
          <button
              class="text-[13px] px-3 py-1.5 rounded-md border border-[#d9dce1] text-white bg-[#3f4754] hover:bg-[#2f3540] transition disabled:opacity-50 disabled:cursor-not-allowed"
              :disabled="!form.text"
              @click="save"
          >
            Save Reflection
          </button>
        </div>
      </div>

      <!-- Inline confirmation -->
      <transition name="fade">
        <div
            v-if="saved"
            class="text-[13px] text-green-600 mt-2 text-right"
        >
          ✅ Saved!
        </div>
      </transition>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  clients: { type: Array, default: () => [] },
  selectedClient: { type: Object, default: null },
})

const emit = defineEmits(['save', 'generate-insight', 'close'])

const form = ref({
  clientId: props.selectedClient?.id ?? null,
  focus: '',
  mood: 3,
  text: '',
  tags: [],
})

const tagsText = ref('')
watch(tagsText, (t) => {
  form.value.tags = t.split(',').map(s => s.trim()).filter(Boolean)
})

const saved = ref(false)
function save() {
  const entry = {
    clientId: form.value.clientId ?? null,
    focus: form.value.focus || 'General',
    mood: Math.min(5, Math.max(1, Number(form.value.mood) || 3)),
    text: form.value.text,
    tags: form.value.tags,
    aiSummary: null,
    archived: false,
  }
  emit('save', entry)
  saved.value = true
  setTimeout(() => saved.value = false, 3000)
  // Clear text and tags
  form.value.text = ''
  tagsText.value = ''
}

function emitInsight() {
  if (!form.value.text) return
  emit('generate-insight', {
    type: 'reflection',
    text: form.value.text,
    focus: form.value.focus || 'General',
    mood: form.value.mood,
    tags: form.value.tags,
    clientId: form.value.clientId ?? null,
  })
}
</script>

<style scoped>
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>

