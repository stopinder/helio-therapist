<template>
  <section class="reflection-workspace">
    <header class="reflection-introduction">
      <h1>Reflections</h1>
      <p>A private place to write or speak about your work.</p>
    </header>

    <p class="privacy-reassurance">Private reflection · Not part of a client’s clinical record.</p>

    <form class="journal" @submit.prevent="save">
      <label class="sr-only" for="reflection-body">Reflection</label>
      <section class="editor-surface">
        <textarea id="reflection-body" ref="editor" v-model="body" class="reflection-editor" placeholder="Write or speak whatever feels important…" aria-label="Reflection" @input="hasStarted = Boolean(body.trim())"></textarea>
      </section>
      <div class="action-bar">
        <div class="voice-control">
          <button v-if="!isRecording" type="button" class="secondary-action" :disabled="isTranscribing" @click="startRecording">{{ isTranscribing ? 'Adding to reflection…' : '🎙 Record voice' }}</button>
          <template v-else-if="isRecording">
            <span class="recording-status" aria-live="polite"><span class="recording-indicator" aria-hidden="true"></span>Recording · {{ elapsed }}</span>
            <button type="button" class="secondary-action" @click="togglePause">{{ isPaused ? 'Resume' : 'Pause' }}</button>
            <button type="button" class="secondary-action" @click="stopRecording">Stop and add to reflection</button>
          </template>
        </div>
        <div class="save-actions">
          <button type="button" class="secondary-action" :disabled="!lastSaved || generatingSummary" @click="openSummary(lastSaved)">{{ generatingSummary ? 'Preparing summary…' : 'Summarise for supervision' }}</button>
          <button type="submit" class="primary-action" :disabled="saving || !body.trim()">{{ saving ? 'Saving…' : 'Save reflection' }}</button>
        </div>
      </div>
    </form>

    <section class="reflection-history" aria-labelledby="recent-reflections-heading">
      <h2 id="recent-reflections-heading">Recent reflections</h2>
      <p v-if="loading" class="quiet">Opening your reflections…</p>
      <p v-else-if="!reflections.length" class="quiet">Nothing here yet. This is a place to return to when something feels worth holding onto.</p>
      <article v-for="reflection in reflections" :key="reflection.id" class="reflection-note">
        <p>{{ reflection.body }}</p>
        <footer><span>{{ date(reflection.created_at) }}</span><button type="button" @click="openSummary(reflection)">Summarise for supervision</button></footer>
        <p v-if="reflection.supervision_summary" class="saved-summary"><strong>Saved supervision summary</strong>{{ reflection.supervision_summary }}</p>
      </article>
    </section>

    <section class="practice-over-time" aria-labelledby="practice-patterns-heading">
      <h2 id="practice-patterns-heading">Practice over time</h2>
      <p>Notice recurring themes and changes across your saved reflections.</p>
      <button type="button" class="secondary-action" @click="patternsOpen = true">View practice patterns</button>
    </section>

    <div v-if="summaryOpen" class="modal-backdrop" @click.self="summaryOpen = false">
      <section class="summary-dialog" role="dialog" aria-modal="true" aria-labelledby="summary-title">
        <header><h2 id="summary-title">Supervision summary</h2><button type="button" class="close-button" aria-label="Close" @click="summaryOpen = false">×</button></header>
        <p class="quiet">This is separate from your original reflection and is not part of a clinical record.</p>
        <textarea v-model="summaryDraft" aria-label="Supervision summary"></textarea>
        <footer><button type="button" class="secondary-action" @click="summaryOpen = false">Discard</button><button type="button" class="primary-action" :disabled="savingSummary" @click="saveSummary">{{ savingSummary ? 'Saving…' : 'Save summary' }}</button></footer>
      </section>
    </div>

    <div v-if="patternsOpen" class="modal-backdrop" @click.self="patternsOpen = false">
      <section class="summary-dialog" role="dialog" aria-modal="true" aria-labelledby="patterns-title">
        <header><h2 id="patterns-title">Practice patterns</h2><button type="button" class="close-button" aria-label="Close" @click="patternsOpen = false">×</button></header>
        <p class="quiet">Patterns drawn from your saved reflections. Nothing here is part of a client record.</p>
        <p v-if="!reflections.length" class="quiet">Save a few reflections first. Patterns will appear only when there is enough material to notice something carefully.</p>
        <ul v-else class="patterns-list"><li v-for="pattern in patterns" :key="pattern">{{ pattern }}</li></ul>
      </section>
    </div>
  </section>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { supabase } from '../lib/supabase.js'

const reflections = ref([]), loading = ref(false), saving = ref(false), savingSummary = ref(false), generatingSummary = ref(false)
const body = ref(''), hasStarted = ref(false), lastSaved = ref(null), summaryOpen = ref(false), patternsOpen = ref(false), summaryDraft = ref(''), summaryReflection = ref(null)
const editor = ref(null), recorder = ref(null), audioChunks = ref([]), isRecording = ref(false), isPaused = ref(false), isTranscribing = ref(false), seconds = ref(0), timer = ref(null)
const elapsed = computed(() => `00:${String(seconds.value).padStart(2, '0')}`)
const patterns = computed(() => {
  const text = reflections.value.map(item => item.body.toLowerCase()).join(' ')
  const words = text.match(/[a-z]{5,}/g) || []
  const counts = words.reduce((all, word) => { if (!['about', 'their', 'there', 'would', 'which', 'these', 'those', 'reflection'].includes(word)) all[word] = (all[word] || 0) + 1; return all }, {})
  const common = Object.entries(counts).filter(([, count]) => count > 1).sort((a, b) => b[1] - a[1]).slice(0, 4)
  return common.length ? common.map(([word, count]) => `“${word}” appears frequently in your reflections (${count} mentions).`) : ['No recurring language stands out yet. Keep reflecting and return when there is more to compare.']
})

async function load() { if (!supabase) return; loading.value = true; const { data } = await supabase.from('private_reflections').select('*').order('created_at', { ascending: false }); reflections.value = data || []; loading.value = false }
async function save() { if (!supabase || !body.value.trim() || saving.value) return; saving.value = true; const { data: auth } = await supabase.auth.getUser(); if (!auth.user) { saving.value = false; return }; const { data, error } = await supabase.from('private_reflections').insert({ user_id: auth.user.id, body: body.value.trim() }).select().single(); if (!error && data) { reflections.value.unshift(data); lastSaved.value = data; body.value = ''; hasStarted.value = false }; saving.value = false }
async function openSummary(reflection) { if (!reflection || generatingSummary.value) return; summaryReflection.value = reflection; summaryDraft.value = reflection.supervision_summary || ''; summaryOpen.value = true; if (summaryDraft.value) return; generatingSummary.value = true; try { const response = await fetch('/api/ai/reflection', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ worksheet_type: 'supervision_summary', worksheet_fields: { reflection: reflection.body } }) }); const data = await response.json(); summaryDraft.value = data?.content || `Themes worth discussing\n\nQuestions or uncertainties\n\nMoments that stayed with me\n\nAreas I may want another perspective on` } catch { summaryDraft.value = `Themes worth discussing\n\nQuestions or uncertainties\n\nMoments that stayed with me\n\nAreas I may want another perspective on` } finally { generatingSummary.value = false } }
async function saveSummary() { if (!supabase || !summaryReflection.value || savingSummary.value) return; savingSummary.value = true; const { data, error } = await supabase.from('private_reflections').update({ supervision_summary: summaryDraft.value.trim(), updated_at: new Date().toISOString() }).eq('id', summaryReflection.value.id).select().single(); if (!error && data) { reflections.value = reflections.value.map(item => item.id === data.id ? data : item); lastSaved.value = data }; savingSummary.value = false; summaryOpen.value = false }
async function startRecording() { try { const stream = await navigator.mediaDevices.getUserMedia({ audio: true }); recorder.value = new MediaRecorder(stream); audioChunks.value = []; recorder.value.ondataavailable = event => audioChunks.value.push(event.data); recorder.value.onstop = transcribe; recorder.value.start(); isRecording.value = true; isPaused.value = false; seconds.value = 0; timer.value = window.setInterval(() => seconds.value += 1, 1000) } catch { alert('Microphone access is needed to record a reflection.') } }
function togglePause() { if (!recorder.value) return; if (isPaused.value) { recorder.value.resume(); isPaused.value = false } else { recorder.value.pause(); isPaused.value = true } }
function stopRecording() { if (!recorder.value) return; window.clearInterval(timer.value); recorder.value.stop(); recorder.value.stream.getTracks().forEach(track => track.stop()); isRecording.value = false; isPaused.value = false }
async function transcribe() { const blob = new Blob(audioChunks.value, { type: recorder.value?.mimeType || 'audio/webm' }); const reader = new FileReader(); reader.onloadend = async () => { isTranscribing.value = true; try { const response = await fetch('/api/ai/transcribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ audio: reader.result }) }); const data = await response.json(); if (data.text) { body.value = `${body.value}${body.value ? '\n\n' : ''}${data.text}`; hasStarted.value = true; editor.value?.focus() } } finally { isTranscribing.value = false } }; reader.readAsDataURL(blob) }
function date(value) { return new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) }
onMounted(load); onBeforeUnmount(() => window.clearInterval(timer.value))
</script>

<style scoped>
.reflection-workspace{max-width:48rem;margin:0 auto;padding:clamp(1rem,3vw,2.5rem) 0 5rem}.reflection-introduction h1,.reflection-history h2,.practice-over-time h2,.summary-dialog h2{margin:0;font-family:'Newsreader',Georgia,serif;font-weight:500;letter-spacing:-.025em;color:var(--text-primary)}.reflection-introduction h1{font-size:clamp(2.15rem,5vw,3rem);line-height:1}.reflection-introduction p{margin:.85rem 0 0;color:var(--text-secondary);font-size:1rem;line-height:1.7}.privacy-reassurance{margin:1.4rem 0 0;color:var(--text-muted);font-size:.875rem}.journal{margin-top:2rem}.editor-surface{border:1px solid var(--border);border-radius:.75rem;background:var(--surface-elevated);box-shadow:0 1px 2px rgba(45,38,30,.04)}.reflection-editor{box-sizing:border-box;display:block;min-height:360px;width:100%;resize:none;border:0;background:transparent;padding:1.25rem 1.5rem;color:var(--text-primary);font:inherit;font-size:17px;line-height:1.75;outline:0}.reflection-editor::placeholder{color:var(--text-muted)}.action-bar{display:flex;gap:.75rem;justify-content:space-between;align-items:center;margin-top:1rem}.voice-control,.save-actions{display:flex;gap:.5rem;align-items:center;flex-wrap:wrap}.secondary-action,.primary-action{border-radius:.6rem;padding:.6rem .85rem;font:inherit;font-size:.875rem;cursor:pointer}.secondary-action{border:1px solid var(--border);background:var(--surface-elevated);color:var(--text-secondary)}.primary-action{border:1px solid var(--text-primary);background:var(--text-primary);color:var(--surface-elevated);font-weight:600}.secondary-action:disabled,.primary-action:disabled{opacity:.5;cursor:not-allowed}.recording-status{display:flex;align-items:center;gap:.4rem;color:var(--text-secondary);font-size:.875rem}.recording-indicator{width:.55rem;height:.55rem;border-radius:999px;background:#b7443e}.reflection-history{margin-top:4.5rem}.reflection-history h2,.practice-over-time h2{font-size:1.5rem}.quiet,.practice-over-time p{margin:.7rem 0 0;color:var(--text-muted);font-size:.9375rem;line-height:1.7}.reflection-note{padding:1.3rem 0;border-bottom:1px solid var(--border-muted)}.reflection-note:first-of-type{margin-top:.7rem;border-top:1px solid var(--border-muted)}.reflection-note>p{margin:0;white-space:pre-wrap;line-height:1.75}.reflection-note footer{display:flex;gap:.7rem;margin-top:.75rem;color:var(--text-muted);font-size:.78rem}.reflection-note footer button{border:0;padding:0;background:transparent;color:var(--text-secondary);font:inherit;cursor:pointer}.saved-summary{margin-top:1rem!important;padding:.85rem;border-left:2px solid var(--border);color:var(--text-secondary)!important;font-size:.9rem}.saved-summary strong{display:block;margin-bottom:.3rem;color:var(--text-muted);font-size:.75rem}.practice-over-time{margin-top:4.5rem;padding-top:1.5rem;border-top:1px solid var(--border-muted)}.practice-over-time .secondary-action{margin-top:1rem}.modal-backdrop{position:fixed;inset:0;z-index:70;display:grid;place-items:center;padding:1rem;background:rgba(35,30,25,.35)}.summary-dialog{width:min(100%,38rem);max-height:90vh;overflow:auto;border:1px solid var(--border);border-radius:.85rem;background:var(--surface-elevated);padding:1.5rem;box-shadow:0 18px 60px rgba(35,30,25,.18)}.summary-dialog header,.summary-dialog footer{display:flex;align-items:center;justify-content:space-between;gap:1rem}.close-button{border:0;background:transparent;color:var(--text-muted);font-size:1.5rem;cursor:pointer}.summary-dialog textarea{box-sizing:border-box;width:100%;min-height:17rem;margin:1.25rem 0;border:1px solid var(--border);border-radius:.65rem;background:transparent;padding:1rem;color:var(--text-primary);font:inherit;line-height:1.7}.patterns-list{margin:1.25rem 0 0;padding-left:1.2rem;color:var(--text-secondary);line-height:1.8}.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}@media(max-width:640px){.reflection-workspace{padding-top:.5rem}.action-bar{align-items:stretch;flex-direction:column}.save-actions{justify-content:flex-end}.reflection-editor{min-height:320px;padding:1.15rem}.summary-dialog{padding:1.15rem}}
</style>
