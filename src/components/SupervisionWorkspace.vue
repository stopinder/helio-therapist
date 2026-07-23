<template>
  <section class="supervision-workspace">
    <header class="supervision-introduction">
      <h1>Supervision</h1>
      <p>A private place to gather reflections, questions and themes before meeting with your supervisor.</p>
    </header>
    <p class="privacy-reassurance"><span>Private by design</span> Everything here belongs to your reflective practice. Nothing is copied into the clinical record unless you choose to do so.</p>

    <div v-if="loading" class="quiet" aria-live="polite">Opening your supervision space…</div>
    <section v-else-if="!groups.length" class="empty-reflective-space" aria-labelledby="empty-supervision-heading">
      <h2 id="empty-supervision-heading">Nothing here yet</h2>
      <p>When a reflection feels worth exploring in supervision, you can add it here. Your original reflection remains private and connected to where it was written.</p>
    </section>
    <div v-else class="supervision-notes">
      <section v-for="group in groups" :key="group.clientId || 'unlinked'" class="client-group">
        <h2>{{ group.clientName }}</h2>
        <article v-for="reflection in group.items" :key="reflection.id" class="supervision-note">
          <p>{{ reflection.body }}</p>
          <p v-if="reflection.supervision_question" class="question"><span>Question to explore</span>{{ reflection.supervision_question }}</p>
          <small><template v-if="reflection.theme">{{ reflection.theme }} <i aria-hidden="true">·</i> </template>{{ date(reflection.created_at) }}</small>
        </article>
      </section>
    </div>
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
.supervision-workspace { max-width: 42rem; margin: 0 auto; padding: clamp(1rem, 3vw, 2.5rem) 0 4rem; }
.supervision-introduction { max-width: 37rem; }
.supervision-workspace h1 { margin: 0; font-family: 'Newsreader', Georgia, serif; font-size: clamp(2.15rem, 5vw, 3rem); font-weight: 500; letter-spacing: -.025em; line-height: 1; }
.supervision-introduction > p { max-width: 34rem; margin: .85rem 0 0; color: var(--text-secondary); font-size: 1rem; line-height: 1.7; }
.privacy-reassurance { max-width: 37rem; margin: 2.5rem 0 0; padding: .95rem 0 0; border-top: 1px solid var(--border-muted); color: var(--text-muted); font-size: .875rem; line-height: 1.65; }
.privacy-reassurance span { color: var(--text-secondary); font-weight: 600; margin-right: .35rem; }
.quiet { margin-top: 3.5rem; color: var(--text-muted); font-size: .9375rem; }
.empty-reflective-space { max-width: 34rem; margin-top: 4.5rem; padding: 0 0 3rem; }
.empty-reflective-space h2, .client-group h2 { margin: 0; color: var(--text-primary); font-family: 'Newsreader', Georgia, serif; font-size: 1.5rem; font-weight: 500; letter-spacing: -.012em; }
.empty-reflective-space p { max-width: 32rem; margin: .75rem 0 0; color: var(--text-muted); line-height: 1.7; }
.supervision-notes { margin-top: 3.5rem; }
.client-group + .client-group { margin-top: 3.5rem; }
.supervision-note { padding: 1.3rem 0 1.35rem; border-bottom: 1px solid var(--border-muted); }
.client-group h2 + .supervision-note { margin-top: .55rem; border-top: 1px solid var(--border-muted); }
.supervision-note p { margin: 0; color: var(--text-primary); font-size: .975rem; line-height: 1.75; white-space: pre-wrap; }
.supervision-note .question { margin-top: .9rem; color: var(--text-secondary); }
.question span { display: block; margin-bottom: .18rem; color: var(--text-muted); font-size: .75rem; font-weight: 600; letter-spacing: .015em; }
small { display: block; margin-top: .9rem; color: var(--text-muted); font-size: .78rem; line-height: 1.45; }
small i { font-style: normal; margin: 0 .16rem; }
@media (max-width: 640px) { .supervision-workspace { padding-top: .5rem; } .privacy-reassurance { margin-top: 2rem; } .empty-reflective-space { margin-top: 3.25rem; } .supervision-notes { margin-top: 2.75rem; } }
</style>
