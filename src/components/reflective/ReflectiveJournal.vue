<template>
  <div class="max-w-3xl mx-auto space-y-4">
    <div class="bg-surface-elevated border border-border-muted rounded-control p-5 ">
      <div class="flex items-center justify-between mb-3">
        <h2 class="text-h3 font-semibold text-ink">New Reflection</h2>
        <button
            class="text-body-sm px-3 py-1.5 rounded-control border border-border text-ink-secondary bg-surface-elevated hover:bg-surface-subtle transition-colors duration-standard ease-out"
            @click="$emit('close')"
        >
          Back to Workspace
        </button>
      </div>

      <!-- Inputs -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
        <label class="text-body-sm text-ink-secondary">
          Client (optional)
          <select
              v-model="form.clientId"
              class="mt-1 w-full text-body border border-border rounded-control p-2 focus:outline-none focus:ring-2 focus:ring-state-focus-ring"
          >
            <option :value="null">— None —</option>
            <option v-for="c in clients" :key="c.id" :value="c.id">{{ c.name }}</option>
          </select>
        </label>

        <label class="text-body-sm text-ink-secondary">
          Focus
          <input
              v-model.trim="form.focus"
              placeholder="e.g., supervision, boundaries, self-energy"
              class="mt-1 w-full text-body border border-border rounded-control p-2 focus:outline-none focus:ring-2 focus:ring-state-focus-ring"
          />
        </label>

        <label class="text-body-sm text-ink-secondary">
          Mood (1–5)
          <input
              v-model.number="form.mood"
              type="number"
              min="1" max="5"
              class="mt-1 w-full text-body border border-border rounded-control p-2 focus:outline-none focus:ring-2 focus:ring-state-focus-ring"
          />
        </label>

        <label class="text-body-sm text-ink-secondary">
          Tags (comma-separated)
          <input
              v-model.trim="tagsText"
              placeholder="presence, burden, countertransference"
              class="mt-1 w-full text-body border border-border rounded-control p-2 focus:outline-none focus:ring-2 focus:ring-state-focus-ring"
          />
        </label>
      </div>

      <label class="block text-body-sm text-ink-secondary">
        Reflection
        <textarea
            v-model.trim="form.text"
            placeholder="Write your reflection..."
            class="mt-1 w-full h-48 border border-border rounded-control p-3 text-body focus:outline-none focus:ring-2 focus:ring-state-focus-ring"
        ></textarea>
      </label>

      <!-- Buttons -->
      <div class="flex items-center justify-between mt-4">
        <div class="text-caption text-ink-muted">
          Saved locally. You can generate an AI summary for deeper insights.
        </div>
        <div class="flex gap-2">
          <button
              class="text-body-sm px-3 py-1.5 rounded-control border border-border text-action-link bg-surface-elevated hover:bg-surface-subtle transition-colors duration-standard ease-out"
              :disabled="!form.text"
              @click="emitInsight"
          >
            Generate AI Summary
          </button>
          <button
              class="text-body-sm px-3 py-1.5 rounded-control border border-border text-on-action bg-action-primary hover:bg-action-primary-hover transition-colors duration-standard ease-out disabled:opacity-50 disabled:cursor-not-allowed"
              :disabled="!form.text"
              @click="save"
          >
            Save Reflection
          </button>
        </div>
      </div>

      <!-- Inline confirmation -->
      <transition-colors duration-standard ease-out name="fade">
        <div
            v-if="saved"
            class="text-body-sm text-state-success mt-2 text-right"
        >
          ✅ Saved!
        </div>
      </transition-colors duration-standard ease-out>
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

