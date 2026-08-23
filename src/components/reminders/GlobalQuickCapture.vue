<template>
  <div class="fixed inset-0 z-[70]" @click.self="$emit('close')">
    <section class="absolute right-4 top-[4.25rem] w-[min(26rem,calc(100vw-2rem))] rounded-panel border border-border-muted bg-surface shadow-overlay" role="dialog" aria-labelledby="quick-capture-title">
      <header class="flex items-center justify-between gap-3 border-b border-border-muted px-4 py-3">
        <div>
          <h2 id="quick-capture-title" class="type-ui font-semibold text-ink">Quick capture</h2>
          <div class="mt-2 flex gap-1" role="tablist" aria-label="Capture type">
            <button type="button" role="tab" :aria-selected="mode === 'reminder'" class="rounded-control px-2.5 py-1 type-metadata font-semibold" :class="mode === 'reminder' ? 'bg-state-selected text-ink' : 'text-ink-muted hover:bg-surface-subtle'" @click="mode='reminder'">Reminder</button>
            <button type="button" role="tab" :aria-selected="mode === 'reflection'" class="rounded-control px-2.5 py-1 type-metadata font-semibold" :class="mode === 'reflection' ? 'bg-state-selected text-ink' : 'text-ink-muted hover:bg-surface-subtle'" @click="mode='reflection'">Reflection</button>
          </div>
        </div>
        <button type="button" class="p-1.5 rounded-control text-ink-muted hover:bg-surface-subtle hover:text-ink" aria-label="Close quick capture" @click="$emit('close')">×</button>
      </header>

      <template v-if="mode === 'reminder'">
        <div class="max-h-56 overflow-y-auto px-4">
          <p v-if="!reminders.length" class="py-3 type-metadata text-ink-subtle">No outstanding reminders.</p>
          <label v-for="reminder in reminders" :key="reminder.id" class="flex cursor-pointer items-start gap-3 border-b border-border-muted py-3 last:border-b-0">
            <input type="checkbox" class="mt-0.5 h-4 w-4 rounded border-border text-action-primary focus:ring-state-focus-ring" :disabled="completingId === reminder.id" @change="complete(reminder)" />
            <span class="type-ui leading-5 text-ink-secondary">{{ reminder.body }}</span>
          </label>
        </div>
        <div class="border-t border-border-muted px-4 py-3">
          <textarea v-model="body" rows="2" maxlength="2000" autofocus class="w-full resize-none rounded-control border border-border bg-surface-elevated px-3 py-2 type-ui text-ink placeholder:text-ink-subtle focus:border-action-link focus:outline-none focus:ring-2 focus:ring-state-focus-ring" placeholder="What do you need to remember?" :disabled="saving" @keydown.meta.enter.prevent="saveReminder" @keydown.ctrl.enter.prevent="saveReminder" />
          <p v-if="error" class="mt-2 type-metadata text-state-danger" role="alert">{{ error }}</p>
          <div class="mt-2 flex justify-end"><button type="button" class="button-primary" :disabled="!body.trim() || saving" @click="saveReminder">{{ saving ? 'Saving…' : 'Save' }}</button></div>
        </div>
      </template>

      <div v-else class="px-4 py-4">
        <div class="relative">
          <textarea ref="reflectionEditor" v-model="reflectionBody" rows="6" maxlength="20000" autofocus class="w-full resize-none rounded-control border border-border bg-surface-elevated px-3 py-3 pr-12 type-ui leading-6 text-ink placeholder:text-ink-subtle focus:border-action-link focus:outline-none focus:ring-2 focus:ring-state-focus-ring" placeholder="Capture what came to you…" :disabled="savingReflection || isTranscribing" @keydown.meta.enter.prevent="saveReflection" @keydown.ctrl.enter.prevent="saveReflection" />
          <button
            type="button"
            class="absolute bottom-2.5 right-2.5 inline-flex h-8 w-8 items-center justify-center rounded-control border transition-colors"
            :class="isRecording ? 'border-state-danger/40 bg-state-danger/10 text-state-danger' : 'border-border-muted bg-surface text-ink-muted hover:bg-surface-subtle hover:text-ink'"
            :disabled="isTranscribing || savingReflection"
            :aria-label="isRecording ? 'Stop dictation' : 'Dictate reflection'"
            :title="isRecording ? 'Stop dictation' : 'Dictate reflection'"
            @click="isRecording ? stopRecording() : startRecording()"
          >
            <Square v-if="isRecording" class="workspace-icon-sm" aria-hidden="true" />
            <Mic v-else class="workspace-icon-sm" aria-hidden="true" />
          </button>
        </div>
        <div class="mt-3 flex items-center justify-between gap-3">
          <span class="type-metadata text-ink-muted" aria-live="polite">{{ dictationStatus }}</span>
          <button type="button" class="button-primary" :disabled="!reflectionBody.trim() || savingReflection || isRecording || isTranscribing" @click="saveReflection">{{ savingReflection ? 'Saving…' : 'Save reflection' }}</button>
        </div>
        <p v-if="error" class="mt-3 type-metadata text-state-danger" role="alert">{{ error }}</p>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'
import { Mic, Square } from '@lucide/vue'
import { authenticatedFetch } from '../../lib/api.js'
import { createQuickReflection } from '../../lib/reflections.js'
import { createTherapistReminder, setTherapistReminderCompleted } from '../../lib/therapistReminders.js'

defineProps({ reminders: { type: Array, default: () => [] } })
const emit = defineEmits(['close', 'saved', 'changed', 'reflection-saved'])
const mode = ref('reminder'), body = ref(''), reflectionBody = ref(''), reflectionEditor = ref(null)
const saving = ref(false), savingReflection = ref(false), completingId = ref(null), error = ref('')
const recorder = ref(null), audioChunks = ref([]), isRecording = ref(false), isTranscribing = ref(false), seconds = ref(0), timer = ref(null)
const elapsed = computed(() => `00:${String(seconds.value).padStart(2, '0')}`)
const dictationStatus = computed(() => isRecording.value ? `Recording · ${elapsed.value}` : isTranscribing.value ? 'Adding dictation…' : '')

async function saveReminder() { if (!body.value.trim() || saving.value) return; saving.value = true; error.value = ''; try { const reminder = await createTherapistReminder({ body: body.value }); window.dispatchEvent(new CustomEvent('helios-reminders-changed')); emit('saved', reminder); emit('close') } catch { error.value = 'Could not save this reminder. Please try again.' } finally { saving.value = false } }
async function saveReflection() { if (!reflectionBody.value.trim() || savingReflection.value) return; savingReflection.value = true; error.value = ''; try { const reflection = await createQuickReflection({ body: reflectionBody.value }); window.dispatchEvent(new CustomEvent('helios-reflections-changed')); emit('reflection-saved', reflection); emit('close') } catch { error.value = 'Could not save this reflection. Please try again.' } finally { savingReflection.value = false } }
async function complete(reminder) { if (!reminder?.id || completingId.value) return; completingId.value = reminder.id; error.value = ''; try { await setTherapistReminderCompleted({ id: reminder.id, completed: true }); window.dispatchEvent(new CustomEvent('helios-reminders-changed')); emit('changed') } catch { error.value = 'Could not complete this reminder. Please try again.' } finally { completingId.value = null } }
async function safeParseJson(response) { const contentType = response.headers.get('content-type') || ''; if (!contentType.includes('application/json')) return null; try { return await response.json() } catch { return null } }
async function startRecording() { try { const stream = await navigator.mediaDevices.getUserMedia({ audio: true }); recorder.value = new MediaRecorder(stream); audioChunks.value = []; recorder.value.ondataavailable = event => audioChunks.value.push(event.data); recorder.value.onstop = transcribe; recorder.value.start(); isRecording.value = true; seconds.value = 0; timer.value = window.setInterval(() => seconds.value += 1, 1000) } catch { error.value = 'Microphone access is needed to dictate a reflection.' } }
function stopRecording() { if (!recorder.value) return; window.clearInterval(timer.value); recorder.value.stop(); recorder.value.stream.getTracks().forEach(track => track.stop()); isRecording.value = false }
async function transcribe() { const blob = new Blob(audioChunks.value, { type: recorder.value?.mimeType || 'audio/webm' }); const reader = new FileReader(); reader.onloadend = async () => { isTranscribing.value = true; try { const response = await authenticatedFetch('/api/ai/transcribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ audio: reader.result }) }); const data = await safeParseJson(response); if (!response.ok) throw new Error(data?.error?.message || data?.error || 'The recording could not be transcribed.'); if (data?.text) { reflectionBody.value = `${reflectionBody.value}${reflectionBody.value ? '\n\n' : ''}${data.text}`; reflectionEditor.value?.focus() } } catch (e) { error.value = e.message || 'The recording could not be transcribed.' } finally { isTranscribing.value = false } }; reader.readAsDataURL(blob) }
onBeforeUnmount(() => { window.clearInterval(timer.value); recorder.value?.stream?.getTracks().forEach(track => track.stop()) })
</script>
