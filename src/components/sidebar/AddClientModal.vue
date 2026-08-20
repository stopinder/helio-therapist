<template>
  <div
    class="fixed inset-0 bg-backdrop backdrop-blur-sm flex items-center justify-center z-50 p-4"
    @click.self="emit('close')"
    @keydown.esc="emit('close')"
  >
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-client-title"
      class="w-full max-w-sm bg-surface-elevated rounded-panel p-6 shadow-overlay"
    >
      <h2 id="add-client-title" class="text-body-long font-semibold text-ink mb-1">Add client</h2>
      <p class="text-body-sm text-ink-muted mb-5">Start with the essentials. You can add more client details later.</p>

      <form class="space-y-4" @submit.prevent="submit">
        <div v-if="error" role="alert" class="p-2 text-caption-sm bg-state-danger/10 text-state-danger rounded-control border border-state-danger/20">{{ error }}</div>

        <label class="block">
          <span class="block text-body-sm font-medium text-ink-secondary mb-1.5">Client name</span>
          <input ref="nameInput" v-model="name" type="text" autocomplete="off" required :disabled="submitting" class="w-full border border-border rounded-control px-3 py-2 text-body focus:ring-2 focus:ring-state-selected focus:border-transparent outline-none disabled:opacity-50" />
        </label>

        <label class="block">
          <span class="block text-body-sm font-medium text-ink-secondary mb-1.5">Email <span class="font-normal text-ink-subtle">(optional)</span></span>
          <input v-model="email" type="email" autocomplete="email" :disabled="submitting" class="w-full border border-border rounded-control px-3 py-2 text-body focus:ring-2 focus:ring-state-selected focus:border-transparent outline-none disabled:opacity-50" />
        </label>

        <label class="block">
          <span class="block text-body-sm font-medium text-ink-secondary mb-1.5">Current focus <span class="font-normal text-ink-subtle">(optional)</span></span>
          <textarea v-model="note" aria-describedby="current-focus-help" :disabled="submitting" class="w-full border border-border rounded-control px-3 py-2 text-body focus:ring-2 focus:ring-state-selected focus:border-transparent outline-none disabled:opacity-50 min-h-[80px]"></textarea>
          <span id="current-focus-help" class="block mt-1 text-caption text-ink-subtle">A short working summary shown in the client directory and workspace.</span>
        </label>

        <div class="flex justify-end gap-3 pt-2">
          <button type="button" class="min-h-touch px-3 py-1.5 text-body-sm rounded-control border border-border hover:bg-surface-subtle transition-colors disabled:opacity-50" :disabled="submitting" @click="emit('close')">Cancel</button>
          <button type="submit" class="min-h-touch px-4 py-1.5 text-body-sm rounded-control bg-action-primary text-on-action font-medium hover:bg-action-primary-hover transition-colors disabled:opacity-50 flex items-center gap-2" :disabled="submitting || !name.trim()">
            <span v-if="submitting" class="w-3 h-3 border-2 border-on-action/30 border-t-on-action rounded-full animate-spin" aria-hidden="true"></span>
            {{ submitting ? 'Adding...' : 'Add client' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { nextTick, onMounted, ref } from 'vue'

defineProps({ submitting: { type: Boolean, default: false }, error: { type: String, default: '' } })
const emit = defineEmits(['close', 'submit'])
const nameInput = ref(null)
const name = ref('')
const email = ref('')
const note = ref('')

onMounted(async () => {
  await nextTick()
  nameInput.value?.focus()
})

const submit = () => {
  if (!name.value.trim()) return
  emit('submit', { name: name.value.trim(), email: email.value.trim(), note: note.value.trim() })
}
</script>
