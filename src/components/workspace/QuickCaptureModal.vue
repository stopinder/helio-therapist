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
            class="w-full border border-border rounded-control bg-surface p-3 text-body text-ink placeholder:text-ink-subtle focus:border-action-link focus:ring-1 focus:ring-action-link resize-none"
            placeholder="Type your reminder here..."
            :disabled="saving || transcribing"
          ></textarea>
          
          <div class="absolute bottom-3 right-3 flex items-center gap-2">
             <span v-if="recording" class="text-caption font-medium text-state-danger animate-pulse">
               Recording... {{ recordingSeconds }}s
             </span>
             <button 
               @click="toggleRecording"
               type="button"
               class="p-2 rounded-full border transition-colors"
               :class="recording ? 'bg-state-danger border-state-danger text-white' : 'bg-surface border-border text-ink-muted hover:border-action-link hover:text-action-link'"
               :disabled="saving || transcribing"
             >
               <svg v-if="!recording" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
               </svg>
               <svg v-else class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                 <rect x="6" y="6" width="8" height="8" />
               </svg>
             </button>
          </div>
        </div>
        
        <div v-if="error" class="text-caption text-state-danger">
          {{ error }}
        </div>
        <div v-if="transcribing" class="text-caption text-ink-muted flex items-center gap-2">
          <span class="w-3 h-3 border-2 border-ink-muted border-t-transparent rounded-full animate-spin"></span>
          Transcribing...
        </div>
      </div>
      
      <footer class="px-6 py-4 border-t border-border flex justify-end gap-3 bg-surface-subtle rounded-b-card">
        <button 
          @click="$emit('close')" 
          class="px-4 py-2 bg-surface border border-border text-ink-secondary rounded-control hover:bg-surface-elevated"
          :disabled="saving || transcribing || recording"
        >
          Cancel
        </button>
        <button 
          @click="save" 
          class="px-4 py-2 bg-state-selected text-white rounded-control hover:bg-state-selected-hover disabled:opacity-50 flex items-center gap-2"
          :disabled="!isValid || saving || transcribing || recording"
        >
          <span v-if="saving" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
          Save
        </button>
      </footer>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onBeforeUnmount } from 'vue';
import { createClientFollowUp, transcribeAudio } from '../../lib/clientFollowUps.js';

const props = defineProps({
  clientId: { type: String, required: true }
});

const emit = defineEmits(['close', 'saved']);

const body = ref('');
const saving = ref(false);
const recording = ref(false);
const transcribing = ref(false);
const recordingSeconds = ref(0);
const error = ref('');

let recorder = null;
let chunks = [];
let stream = null;
let recordingTimer = null;

const isValid = computed(() => body.value.trim().length > 0 && body.value.length <= 2000);

async function toggleRecording() {
  if (recording.value) {
    recorder?.stop();
    return;
  }
  
  error.value = '';
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    chunks = [];
    recorder = new MediaRecorder(stream);
    
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };
    
    recorder.onstop = processRecording;
    
    recorder.start();
    recording.value = true;
    recordingSeconds.value = 0;
    recordingTimer = setInterval(() => {
      recordingSeconds.value++;
    }, 1000);
  } catch (e) {
    error.value = 'Microphone access was not available. You can continue by typing.';
  }
}

async function processRecording() {
  recording.value = false;
  clearInterval(recordingTimer);
  stream?.getTracks().forEach(t => t.stop());
  
  const blob = new Blob(chunks, { type: recorder?.mimeType || 'audio/webm' });
  if (blob.size === 0) return;
  
  transcribing.value = true;
  error.value = '';
  
  try {
    const dataUrl = await blobToDataUrl(blob);
    const text = await transcribeAudio(dataUrl);
    
    if (text) {
      body.value = [body.value.trim(), text.trim()]
        .filter(Boolean)
        .join(body.value.trim() ? ' ' : '');
    }
  } catch (e) {
    error.value = e.message || 'The recording could not be transcribed.';
  } finally {
    transcribing.value = false;
  }
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

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

onBeforeUnmount(() => {
  clearInterval(recordingTimer);
  stream?.getTracks().forEach(t => t.stop());
});
</script>
