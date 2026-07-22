<template>
  <section class="supervision-workspace">
    <header>
      <p class="eyebrow">Therapist workspace</p>
      <h1>Supervision</h1>
      <p>Private reflections you deliberately selected to think through with your supervisor.</p>
    </header>
    <div v-if="loading" class="quiet">Loading supervision agenda…</div>
    <div v-else-if="!groups.length" class="empty">
      <h2>Nothing marked for supervision</h2>
      <p>From a private reflection, choose <strong>Add to supervision</strong>. Helio will keep the original reflection linked here without copying it into the client record.</p>
    </div>
    <section v-for="group in groups" :key="group.clientId || 'unlinked'" class="client-group">
      <h2>{{ group.clientName }}</h2>
      <article v-for="reflection in group.items" :key="reflection.id">
        <p>{{ reflection.body }}</p>
        <p v-if="reflection.supervision_question" class="question"><strong>Question:</strong> {{ reflection.supervision_question }}</p>
        <small><template v-if="reflection.theme">{{ reflection.theme }} · </template>{{ date(reflection.created_at) }}</small>
      </article>
    </section>
    <p class="boundary">This agenda contains therapist-only reflections. Any future AI draft must be reviewed and approved before use; it will not interpret the therapist or make clinical decisions.</p>
  </section>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { supabase } from '../lib/supabase.js'
const props = defineProps({ clients: { type: Array, default: () => [] } })
const items = ref([]), loading = ref(false)
const groups = computed(() => {
  const byClient = new Map()
  for (const item of items.value) {
    const key = item.client_id || 'unlinked'
    if (!byClient.has(key)) byClient.set(key, { clientId: item.client_id, clientName: props.clients.find(client => String(client.id) === String(item.client_id))?.name || 'Unlinked reflection', items: [] })
    byClient.get(key).items.push(item)
  }
  return [...byClient.values()]
})
async function load() {
  if (!supabase) return
  loading.value = true
  const { data } = await supabase.from('private_reflections').select('*').eq('included_in_supervision', true).order('created_at', { ascending: false })
  items.value = data || []; loading.value = false
}
function date(value) { return new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) }
watch(() => props.clients, load, { immediate: true, deep: true })
</script>

<style scoped>
.supervision-workspace{max-width:58rem;margin:0 auto}.eyebrow{text-transform:uppercase;letter-spacing:.08em;color:var(--text-muted);font-size:.7rem;font-weight:700;margin:0 0 .25rem}.supervision-workspace h1{margin:.1rem 0 .35rem}.supervision-workspace header>p:last-child,.quiet,.empty p,.boundary,small{color:var(--text-muted);line-height:1.5}.empty,.client-group{margin-top:1rem;padding:1.2rem;background:var(--surface);border:1px solid var(--border-muted);border-radius:.8rem}.empty h2,.client-group h2{margin:0;font-size:1.1rem}.client-group article{border-top:1px solid var(--border-muted);padding:.9rem 0}.client-group article:first-of-type{margin-top:.7rem}.client-group p{white-space:pre-wrap;line-height:1.55;margin:.2rem 0}.question{color:var(--text-secondary)}.boundary{margin-top:1rem;padding:.9rem 1rem;background:var(--surface-muted);border-left:3px solid var(--border-strong);font-size:.85rem}
</style>
