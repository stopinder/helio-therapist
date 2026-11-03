<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
    <div class="bg-surface max-w-lg w-full rounded-card shadow-xl border border-border flex flex-col max-h-[90vh]">
      <header class="px-6 py-4 border-b border-border flex justify-between items-center">
        <h3 class="text-h3 font-semibold text-ink">Quick capture</h3>
        <button @click="$emit('close')" class="text-ink-muted hover:text-ink">
          <span class="sr-only">Close</span>
          <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </header>
      
      <div class="p-6 space-y-4 overflow-auto">
        <p class="text-body-sm text-ink-secondary">
          A private working reminder for this client. It is not part of the clinical record.
        </p>
        
        <div class="relative">
          <textarea
            v-model="body"
            rows="4"
            class="w-full border border-border rounded-control bg-surface p-3 pr-20 text-body text-ink placeholder:text-ink-subtle focus:border-action-link focus:ring-1 focus:ring-action-link resize-none"
            placeholder="Type or speak your reminder…"
            :disabled="saving"
          ></textarea>
          <div class="absolute bottom-2 right-2 flex items-center gap-1">
            <WhisperMicButton :recording="dictation.recording.value" :transcribing="dictation.transcribing.value" :disabled="saving" label="Dictate reminder" @toggle="dictation.toggle()" />
            <button type="button" class="inline-flex h-8 w-8 items-center justify-center rounded-full bg-action-primary text-on-action shadow-sm hover:bg-action-primary-hover disabled:opacity-40" :disabled="!isValid || saving || dictation.busy.value" aria-label="Save reminder" title="Save reminder" @click="save"><Send class="h-4 w-4" aria-hidden="true" /></button>
          </div>
        </div>
        
        <div v-if="dictation.error.value || error" class="text-caption text-state-danger">
          {{ dictation.error.value || error }}
        </div>
      </div>
      

    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { Send } from '@lucide/vue';
import { createClientFollowUp } from '../../lib/clientFollowUps.js';
import { appendDictation, useWhisperDictation } from '../../composables/useWhisperDictation.js';
import WhisperMicButton from '../ui/WhisperMicButton.vue';

const props = defineProps({
  clientId: { type: String, required: true }
});

const emit = defineEmits(['close', 'saved']);

const body = ref('');
const saving = ref(false);
const error = ref('');
const dictation = useWhisperDictation({ onText: text => { body.value = appendDictation(body.value, text).slice(0, 2000) } });

const isValid = computed(() => body.value.trim().length > 0 && body.value.length <= 2000);


async function save() {
  if (!isValid.value || saving.value) return;
  
  saving.value = true;
  error.value = '';
  
  try {
    const saved = await createClientFollowUp({
      clientId: props.clientId,
      body: body.value
    });
    emit('saved', saved);
    emit('close');
  } catch (e) {
    error.value = 'Failed to save follow-up. Please try again.';
  } finally {
    saving.value = false;
  }
}

</script>
