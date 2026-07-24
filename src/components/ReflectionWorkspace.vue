<template>
  <section class="reflection-workspace">
    <header class="reflection-introduction">
      <h1>Reflections</h1>
      <p>A private place to write, notice uncertainty, and gather your professional thinking.</p>
    </header>

    <p class="privacy-reassurance"><span>Private reflection</span> Not part of the client’s clinical record.</p>

    <form class="journal" @submit.prevent="save">
      <label class="sr-only" for="reflection-body">Private reflection</label>
      <textarea id="reflection-body" v-model="body" placeholder="Write freely. You do not need to classify this." @input="hasStarted = Boolean(body.trim())" />
      <div v-if="hasStarted" class="journal-actions">
        <button type="button" class="reflect-action" :disabled="reflecting" @click="reflectWithAi">{{ reflecting ? 'Reflecting…' : 'Reflect with AI' }}</button>
        <button type="submit" class="save-action" :disabled="saving || !body.trim()">{{ saving ? 'Saving…' : 'Save reflection' }}</button>
      </div>
    </form>

    <aside v-if="aiResponse" class="ai-assistance" aria-live="polite">
      <div class="ai-assistance-heading"><span>Reflection prompts</span><button type="button" @click="aiResponse = ''" aria-label="Dismiss reflection prompts">Dismiss</button></div>
      <p>{{ aiResponse }}</p>
    </aside>

    <section class="reflection-history" aria-labelledby="past-reflections-heading">
      <div class="history-heading">
        <h2 id="past-reflections-heading">Previous reflections</h2>
        <button type="button" class="supervision-link" @click="$emit('open-supervision')">View supervision</button>
      </div>
      <p v-if="loading" class="quiet">Opening your reflections…</p>
      <p v-else-if="!reflections.length" class="quiet">Nothing here yet. This is a place to return to when something feels worth holding onto.</p>
      <article v-for="reflection in reflections" :key="reflection.id" class="reflection-note">
        <p>{{ reflection.body }}</p>
        <footer><span>{{ date(reflection.created_at) }}</span><button v-if="!reflection.included_in_supervision" @click="addToSupervision(reflection)">Add to supervision</button><span v-else>Added to supervision</span></footer>
      </article>
    </section>
  </section>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { supabase } from '../lib/supabase.js'

defineEmits(['open-supervision'])
const reflections = ref([]), loading = ref(false), saving = ref(false), reflecting = ref(false)
const body = ref(''), hasStarted = ref(false), aiResponse = ref('')

async function load() {
  if (!supabase) return
  loading.value = true
  const { data } = await supabase.from('private_reflections').select('*').order('created_at', { ascending: false })
  reflections.value = data || []; loading.value = false
}
async function save() {
  if (!supabase || !body.value.trim() || saving.value) return
  saving.value = true
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) { saving.value = false; return }
  const { data, error } = await supabase.from('private_reflections').insert({ user_id: auth.user.id, body: body.value.trim() }).select().single()
  if (!error && data) { reflections.value.unshift(data); body.value = ''; hasStarted.value = false; aiResponse.value = '' }
  saving.value = false
}
async function reflectWithAi() {
  if (!body.value.trim() || reflecting.value) return
  reflecting.value = true; aiResponse.value = ''
  try {
    const response = await fetch('/api/ai/reflection', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ worksheet_type: 'private_reflection', worksheet_fields: { reflection: body.value.trim() } }) })
    const data = await response.json(); aiResponse.value = data?.content || 'No prompts are available right now.'
  } catch { aiResponse.value = 'No prompts are available right now.' }
  reflecting.value = false
}
async function addToSupervision(reflection) {
  if (!supabase) return
  const { data, error } = await supabase.from('private_reflections').update({ included_in_supervision: true, updated_at: new Date().toISOString() }).eq('id', reflection.id).select().single()
  if (!error && data) reflections.value = reflections.value.map(item => item.id === data.id ? data : item)
}
function date(value) { return new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) }
onMounted(load)
</script>

<style scoped>
.reflection-workspace { max-width: 44rem; margin: 0 auto; padding: clamp(1rem, 3vw, 2.5rem) 0 4rem; }
.reflection-introduction { max-width: 38rem; }.reflection-introduction h1,.reflection-history h2 { margin: 0; font-family: 'Newsreader', Georgia, serif; font-weight: 500; letter-spacing: -.025em; color: var(--text-primary); }.reflection-introduction h1 { font-size: clamp(2.15rem, 5vw, 3rem); line-height: 1; }.reflection-introduction p { max-width: 34rem; margin: .85rem 0 0; color: var(--text-secondary); font-size: 1rem; line-height: 1.7; }
.privacy-reassurance { margin: 2.5rem 0 0; padding-top: .95rem; border-top: 1px solid var(--border-muted); color: var(--text-muted); font-size: .875rem; line-height: 1.65; }.privacy-reassurance span { color: var(--text-secondary); font-weight: 600; margin-right: .35rem; }
.journal { margin-top: 2.25rem; }.journal textarea { box-sizing: border-box; display: block; width: 100%; min-height: 17rem; resize: vertical; padding: 0; border: 0; outline: 0; background: transparent; color: var(--text-primary); font: inherit; font-size: 1rem; line-height: 1.8; }.journal textarea::placeholder { color: var(--text-muted); }.journal-actions { display: flex; align-items: center; justify-content: space-between; gap: 1rem; margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--border-muted); }.reflect-action,.supervision-link { padding: 0; border: 0; background: transparent; color: var(--text-secondary); font: inherit; font-size: .875rem; cursor: pointer; }.reflect-action:hover,.supervision-link:hover { color: var(--text-primary); }.save-action { border: 1px solid var(--border); border-radius: .6rem; padding: .55rem .85rem; background: var(--surface-elevated); color: var(--text-primary); font: inherit; font-size: .875rem; font-weight: 600; cursor: pointer; }.save-action:disabled,.reflect-action:disabled { cursor: not-allowed; opacity: .55; }
.ai-assistance { margin-top: 1.25rem; padding: 1rem 1.1rem; border-left: 2px solid var(--border); color: var(--text-secondary); }.ai-assistance-heading { display: flex; justify-content: space-between; gap: 1rem; color: var(--text-muted); font-size: .78rem; font-weight: 600; }.ai-assistance-heading button { border: 0; padding: 0; background: transparent; color: inherit; font: inherit; cursor: pointer; }.ai-assistance p { margin: .65rem 0 0; white-space: pre-wrap; font-size: .9375rem; line-height: 1.7; }
.reflection-history { margin-top: 4.5rem; }.history-heading { display: flex; align-items: baseline; justify-content: space-between; gap: 1rem; }.reflection-history h2 { font-size: 1.5rem; }.quiet { max-width: 31rem; margin: 1.1rem 0 0; color: var(--text-muted); font-size: .9375rem; line-height: 1.7; }.reflection-note { padding: 1.3rem 0; border-bottom: 1px solid var(--border-muted); }.reflection-note:first-of-type { margin-top: .6rem; border-top: 1px solid var(--border-muted); }.reflection-note p { margin: 0; color: var(--text-primary); white-space: pre-wrap; font-size: .975rem; line-height: 1.75; }.reflection-note footer { display: flex; align-items: center; gap: .7rem; margin-top: .8rem; color: var(--text-muted); font-size: .78rem; }.reflection-note footer button { padding: 0; border: 0; background: transparent; color: var(--text-secondary); font: inherit; cursor: pointer; }.reflection-note footer button:hover { color: var(--text-primary); }.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
@media (max-width: 640px) { .reflection-workspace { padding-top: .5rem; }.journal textarea { min-height: 14rem; }.reflection-history { margin-top: 3.25rem; } }
</style>
