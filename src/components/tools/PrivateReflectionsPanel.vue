<template>
  <section class="private-reflection">
    <div class="heading">
      <div>
        <p class="eyebrow">Therapist-only</p>
        <h3>Private reflection</h3>
        <p>Not part of the client’s clinical record. It is never added to the Timeline or routine exports.</p>
      </div>
      <button v-if="!writing" class="secondary" @click="writing = true">Add private reflection</button>
    </div>

    <form v-if="writing" @submit.prevent="save">
      <label for="private-reflection-body">What are you thinking about this work?</label>
      <textarea id="private-reflection-body" v-model="body" placeholder="Write freely. You do not need to classify this." />
      <details>
        <summary>Optional supervision details</summary>
        <label>Question for supervision<input v-model="supervisionQuestion" placeholder="What would be useful to think through?" /></label>
        <label>Theme<input v-model="theme" placeholder="e.g. boundaries, endings" /></label>
      </details>
      <div class="actions">
        <button type="button" class="secondary" @click="cancel">Cancel</button>
        <button type="submit" class="primary" :disabled="saving || !body.trim()">{{ saving ? 'Saving…' : 'Save private reflection' }}</button>
      </div>
    </form>

    <div v-if="loading" class="quiet">Loading private reflections…</div>
    <div v-else-if="!writing && !reflections.length" class="quiet">No private reflections linked to this client.</div>
    <article v-for="reflection in reflections" :key="reflection.id" class="reflection">
      <p>{{ reflection.body }}</p>
      <small>{{ date(reflection.created_at) }}<template v-if="reflection.session_ref"> · linked to this session</template></small>
      <div class="reflection-actions">
        <button v-if="!reflection.included_in_supervision" class="text-action" @click="addToSupervision(reflection)">Add to supervision</button>
        <span v-else class="marked">Included in supervision</span>
      </div>
    </article>
  </section>
</template>

<script setup>
import { ref, watch } from 'vue'
import { supabase } from '../../lib/supabase.js'

const props = defineProps({ clientId: { type: [String, Number], default: null }, sessionRef: { type: [String, Number], default: null } })
const reflections = ref([]), loading = ref(false), writing = ref(false), saving = ref(false)
const body = ref(''), supervisionQuestion = ref(''), theme = ref('')

async function load() {
  if (!supabase || !props.clientId) { reflections.value = []; return }
  loading.value = true
  const { data } = await supabase.from('private_reflections').select('*').eq('client_id', props.clientId).order('created_at', { ascending: false })
  reflections.value = data || []; loading.value = false
}
async function save() {
  if (!supabase || !body.value.trim() || saving.value) return
  saving.value = true
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) { saving.value = false; return }
  const { data, error } = await supabase.from('private_reflections').insert({
    user_id: auth.user.id, client_id: props.clientId, session_ref: props.sessionRef ? String(props.sessionRef) : null,
    body: body.value.trim(), supervision_question: supervisionQuestion.value.trim(), theme: theme.value.trim()
  }).select().single()
  if (!error && data) { reflections.value.unshift(data); cancel() }
  saving.value = false
}
async function addToSupervision(reflection) {
  if (!supabase) return
  const { data, error } = await supabase.from('private_reflections').update({ included_in_supervision: true, updated_at: new Date().toISOString() }).eq('id', reflection.id).select().single()
  if (!error && data) reflections.value = reflections.value.map(item => item.id === data.id ? data : item)
}
function cancel() { writing.value = false; body.value = ''; supervisionQuestion.value = ''; theme.value = '' }
function date(value) { return new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) }
watch(() => props.clientId, load, { immediate: true })
</script>

<style scoped>
.private-reflection{margin-top:.8rem;background:var(--surface-muted);border:1px dashed var(--border-strong);border-radius:.8rem;padding:1.1rem}.heading{display:flex;justify-content:space-between;gap:1rem;align-items:flex-start}.heading h3{margin:0;font-size:1.05rem}.heading p:last-child,.quiet,.reflection small{color:var(--text-muted);font-size:.85rem;line-height:1.45}.secondary,.primary,.text-action{border-radius:.55rem;padding:.55rem .8rem;font-weight:600}.secondary{border:1px solid var(--border);background:var(--surface-elevated);color:var(--text-secondary)}.primary{border:1px solid var(--action-link);background:var(--action-link);color:var(--surface-elevated)}.text-action{border:0;background:transparent;color:var(--action-link);padding:.3rem 0}form{margin-top:1rem}label{display:block;font-weight:600;margin:.75rem 0 .35rem}textarea,input{box-sizing:border-box;width:100%;background:var(--surface-elevated);border:1px solid var(--border);border-radius:.6rem;padding:.75rem;font:inherit}textarea{min-height:8rem;resize:vertical}details{margin-top:.7rem}summary{cursor:pointer;color:var(--text-secondary)}.actions{display:flex;justify-content:flex-end;gap:.5rem;margin-top:.9rem}.reflection{border-top:1px solid var(--border-muted);padding:.85rem 0}.reflection p{white-space:pre-wrap;line-height:1.5;margin:.2rem 0 .4rem}.reflection-actions{margin-top:.35rem}.marked{font-size:.8rem;font-weight:600;color:var(--state-success)}.eyebrow{text-transform:uppercase;letter-spacing:.08em;color:var(--text-muted);font-size:.7rem;font-weight:700;margin:0 0 .25rem}
</style>
