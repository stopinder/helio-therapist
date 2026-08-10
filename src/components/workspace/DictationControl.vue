<template>
  <div class="flex items-center gap-2">
    <button
      type="button"
      @click="toggleRecording"
      :disabled="status === 'transcribing'"
      class="inline-flex items-center justify-center p-1.5 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-action-link"
      :class="status === 'recording' ? 'bg-state-danger text-white animate-pulse' : 'text-ink-muted hover:bg-surface-subtle hover:text-ink'"
      :title="status === 'recording' ? 'Stop recording' : 'Start dictation'"
    >
      <svg v-if="status !== 'recording'" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>
      <svg v-else xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="12" height="12" x="6" y="6" rx="2"/></svg>
    </button>
    <span v-if="status !== 'idle'" class="text-caption font-medium" :class="status === 'error' ? 'text-state-danger' : 'text-ink-muted'">
      {{ statusMessage }}
    </span>
  </div>
</template>

<script setup>
import { ref, computed, onBeforeUnmount } from 'vue';
import { authenticatedFetch } from '../../lib/api.js';

const props = defineProps({
  modelValue: { type: String, default: '' }
});

const emit = defineEmits(['update:modelValue', 'transcribed', 'error']);

const status = ref('idle'); // idle, recording, transcribing, error
const errorMessage = ref('');
let mediaRecorder = null;
let audioChunks = [];
let stream = null;

const statusMessage = computed(() => {
  if (status.value === 'recording') return 'Recording…';
  if (status.value === 'transcribing') return 'Transcribing…';
  if (status.value === 'error') return errorMessage.value || 'Failed';
  return '';
});

async function startRecording() {
  status.value = 'idle';
  errorMessage.value = '';
  audioChunks = [];

  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);
    
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) audioChunks.push(event.data);
    };

    mediaRecorder.onstop = handleStop;
    mediaRecorder.start();
    status.value = 'recording';
  } catch (err) {
    console.error('[Dictation] Mic access error:', err);
    status.value = 'error';
    errorMessage.value = 'Microphone access denied';
    emit('error', 'Microphone access denied');
  }
}

function stopRecording() {
  if (mediaRecorder && status.value === 'recording') {
    mediaRecorder.stop();
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
  }
}

function toggleRecording() {
  if (status.value === 'recording') {
    stopRecording();
  } else {
    startRecording();
  }
}

async function handleStop() {
  status.value = 'transcribing';
  const audioBlob = new Blob(audioChunks, { type: mediaRecorder.mimeType });
  
  try {
    const reader = new FileReader();
    reader.readAsDataURL(audioBlob);
    reader.onloadend = async () => {
      const base64data = reader.result;
      
      try {
        const response = await authenticatedFetch('/api/ai/transcribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ audio: base64data })
        });
        
        const result = await response.json();
        
        if (!response.ok || !result.success) {
          throw new Error(result.error?.message || 'Transcription failed');
        }
        
        if (result.text) {
          const newText = props.modelValue 
            ? props.modelValue.trim() + ' ' + result.text.trim()
            : result.text.trim();
          emit('update:modelValue', newText);
          emit('transcribed', result.text);
        }
        status.value = 'idle';
      } catch (err) {
        console.error('[Dictation] API error:', err);
        status.value = 'error';
        errorMessage.value = 'Transcription failed';
        emit('error', 'Transcription failed');
      }
    };
  } catch (err) {
    console.error('[Dictation] Read error:', err);
    status.value = 'error';
    errorMessage.value = 'Could not process audio';
    emit('error', 'Could not process audio');
  }
}

onBeforeUnmount(() => {
  stopRecording();
});
</script>
