<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-backdrop backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="dialog-title">
    <div class="bg-surface-overlay border border-border rounded-panel shadow-overlay max-w-lg w-full p-6 animate-in fade-in zoom-in duration-200" ref="dialogRef">
      <h3 id="dialog-title" class="text-h3 font-semibold text-ink mb-4">{{ title }}</h3>
      
      <div class="space-y-4 mb-6">
        <p class="text-body-sm text-ink-secondary leading-relaxed">
          {{ message }}
        </p>
        
        <ul class="text-caption text-ink-muted space-y-2 list-disc pl-5">
          <li>Approval creates the official clinical-record version.</li>
          <li>The approved version becomes read-only.</li>
          <li>Future corrections must be made through amendments.</li>
          <li>The therapist remains responsible for the final content.</li>
          <li>Approval identity and timestamps are mock values in this phase.</li>
        </ul>

        <div class="pt-4 border-t border-border">
          <label class="flex items-start gap-3 cursor-pointer group">
            <input 
              type="checkbox" 
              v-model="confirmed"
              class="mt-1 h-4 w-4 rounded border-border text-action-link focus:ring-state-focus-ring"
            >
            <span class="text-body-sm text-ink group-hover:text-action-link transition-colors">
              {{ confirmationLabel }}
            </span>
          </label>
        </div>
      </div>

      <div class="flex justify-end gap-3">
        <button 
          @click="close"
          class="px-inline-lg py-stack-sm bg-surface-elevated border border-border text-body-sm font-medium text-ink rounded-control hover:bg-surface-subtle transition-colors"
        >
          Cancel
        </button>
        <button 
          @click="confirm"
          :disabled="!confirmed"
          class="px-inline-lg py-stack-sm bg-action-primary text-on-action text-body-sm font-medium rounded-control hover:bg-action-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {{ confirmButtonLabel }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue';

const props = defineProps({
  isOpen: Boolean,
  title: { type: String, default: 'Confirm Approval' },
  message: { type: String, required: true },
  confirmationLabel: { type: String, default: 'I confirm that this summary accurately represents the session.' },
  confirmButtonLabel: { type: String, default: 'Approve and Create Clinical Record' }
});

const emit = defineEmits(['confirm', 'close']);

const confirmed = ref(false);
const dialogRef = ref(null);

const close = () => {
  emit('close');
  confirmed.value = false;
};

const confirm = () => {
  if (confirmed.value) {
    emit('confirm');
    close();
  }
};

// Simple focus trap and escape key handler
watch(() => props.isOpen, (newVal) => {
  if (newVal) {
    document.addEventListener('keydown', handleEsc);
    nextTick(() => {
      if (dialogRef.value) {
        const focusable = dialogRef.value.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        if (focusable.length > 0) focusable[0].focus();
      }
    });
  } else {
    document.removeEventListener('keydown', handleEsc);
  }
});

const handleEsc = (e) => {
  if (e.key === 'Escape') close();
};
</script>
