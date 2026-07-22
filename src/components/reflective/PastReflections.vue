<template>
  <div class="max-w-5xl mx-auto">
    <div class="bg-reflection border border-border-reflection rounded-control p-4 ">
      <div class="flex items-center justify-between mb-3">
        <h2 class="text-h3 font-semibold text-ink">Past Reflections</h2>
        <div class="flex gap-2">
          <button
              class="text-body-sm px-3 py-1.5 rounded-control border border-border-reflection text-ink-secondary bg-surface-elevated hover:bg-reflection-hover transition-colors duration-standard ease-out"
              @click="$emit('close')"
          >Close</button>
        </div>
      </div>

      <!-- Filters -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
        <input
            v-model.trim="filters.q"
            placeholder="Search text or tags…"
            class="text-body border border-border-reflection rounded-control p-2 bg-surface-elevated focus:outline-none focus:ring-2 focus:ring-state-reflection-focus"
        />
        <select
            v-model="filters.clientId"
            class="text-body border border-border-reflection rounded-control p-2 bg-surface-elevated focus:outline-none focus:ring-2 focus:ring-state-reflection-focus"
        >
          <option :value="null">All clients</option>
          <option v-for="c in clients" :key="c.id" :value="c.id">{{ c.name }}</option>
        </select>
        <select
            v-model="filters.focus"
            class="text-body border border-border-reflection rounded-control p-2 bg-surface-elevated focus:outline-none focus:ring-2 focus:ring-state-reflection-focus"
        >
          <option value="">All foci</option>
          <option v-for="f in focusOptions" :key="f" :value="f">{{ f }}</option>
        </select>
        <select
            v-model.number="filters.mood"
            class="text-body border border-border-reflection rounded-control p-2 bg-surface-elevated focus:outline-none focus:ring-2 focus:ring-state-reflection-focus"
        >
          <option :value="0">Any mood</option>
          <option v-for="m in [1,2,3,4,5]" :key="m" :value="m">Mood {{ m }}</option>
        </select>
      </div>

      <div v-if="filtered.length === 0" class="text-body-sm text-ink-muted italic">
        No reflections match your filters.
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        <article
            v-for="r in filtered"
            :key="r.id"
            class="bg-surface-elevated border border-border-reflection rounded-control p-3 hover: transition-colors duration-standard ease-out"
        >
          <div class="flex items-start justify-between">
            <div>
              <div class="text-body font-semibold text-ink">
                {{ r.focus }} <span class="text-caption text-ink-muted">· Mood {{ r.mood }}</span>
              </div>
              <div class="text-caption text-ink-muted">
                {{ formatDate(r.date) }} <span v-if="r.clientId">· {{ clientName(r.clientId) }}</span>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <button
                  class="text-caption px-2 py-1 rounded-control border border-border-reflection bg-surface-elevated hover:bg-reflection-hover transition-colors duration-standard ease-out"
                  @click="select(r)"
              >View</button>
              <button
                  class="text-caption px-2 py-1 rounded-control border border-border-reflection bg-surface-elevated hover:bg-reflection-hover transition-colors duration-standard ease-out"
                  @click="$emit('archive', r.id, !r.archived)"
              >{{ r.archived ? 'Unarchive' : 'Archive' }}</button>
              <button
                  class="text-caption px-2 py-1 rounded-control border border-state-danger text-state-danger bg-surface-elevated hover:bg-state-danger-surface transition-colors duration-standard ease-out"
                  @click="$emit('delete', r.id)"
              >Delete</button>
            </div>
          </div>
          <p class="mt-2 text-body text-ink-secondary line-clamp-4">{{ r.text }}</p>
          <div class="mt-2 text-caption text-ink-muted">
            <span v-for="t in r.tags" :key="t" class="mr-2 inline-block px-2 py-0.5 rounded bg-state-warning-surface border border-border-reflection-tag">
              #{{ t }}
            </span>
          </div>
        </article>
      </div>

      <!-- Detail drawer -->
      <transition-colors duration-standard ease-out name="fade">
        <div v-if="detail" class="fixed inset-0 bg-backdrop flex items-end md:items-center justify-center z-40" @click.self="detail=null">
          <div class="w-full md:max-w-2xl bg-surface-elevated rounded-t-md md:rounded-control border border-border-reflection p-4 shadow-overlay">
            <div class="flex items-center justify-between mb-2">
              <div>
                <div class="text-body-long font-semibold text-ink">{{ detail.focus }}</div>
                <div class="text-caption text-ink-muted">{{ formatDate(detail.date) }} · Mood {{ detail.mood }}</div>
              </div>
              <button
                  class="text-body-sm px-3 py-1.5 rounded-control border border-border-reflection bg-surface-elevated hover:bg-reflection-hover"
                  @click="detail=null"
              >Close</button>
            </div>
            <div class="text-body text-ink-secondary whitespace-pre-wrap">{{ detail.text }}</div>
            <div class="mt-2 text-caption text-ink-muted">
              <span v-for="t in detail.tags" :key="t" class="mr-2 inline-block px-2 py-0.5 rounded bg-state-warning-surface border border-border-reflection-tag">
                #{{ t }}
              </span>
            </div>
            <div v-if="detail.aiSummary" class="mt-3 p-3 bg-reflection border border-border-reflection rounded">
              <div class="text-body-sm font-semibold text-ink mb-1">AI Summary</div>
              <div class="text-body text-ink-secondary whitespace-pre-wrap">{{ detail.aiSummary }}</div>
            </div>
          </div>
        </div>
      </transition-colors duration-standard ease-out>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  reflections: { type: Array, default: () => [] },
  clients: { type: Array, default: () => [] },
})

defineEmits(['close','delete','archive'])

const filters = ref({
  q: '',
  clientId: null,
  focus: '',
  mood: 0,
})

const focusOptions = computed(() => {
  const set = new Set(props.reflections.map(r => r.focus).filter(Boolean))
  return Array.from(set)
})

const filtered = computed(() => {
  const q = filters.value.q.toLowerCase()
  return props.reflections
      .filter(r => !r.archived)
      .filter(r => !filters.value.clientId || r.clientId === filters.value.clientId)
      .filter(r => !filters.value.focus || r.focus === filters.value.focus)
      .filter(r => !filters.value.mood || Number(r.mood) === Number(filters.value.mood))
      .filter(r => {
        if (!q) return true
        const hay = `${r.text} ${(r.tags||[]).join(' ')} ${r.focus}`.toLowerCase()
        return hay.includes(q)
      })
      .sort((a,b) => new Date(b.date) - new Date(a.date))
})

const detail = ref(null)
const select = (r) => { detail.value = r }

function clientName(id) {
  const c = props.clients.find(x => x.id === id)
  return c ? c.name : 'Unknown'
}
function formatDate(iso) {
  try {
    return new Date(iso).toLocaleString()
  } catch { return iso }
}
</script>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity .18s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
