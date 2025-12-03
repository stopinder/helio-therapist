<template>
  <div class="max-w-5xl mx-auto">
    <div class="bg-[#faf4ea] border border-[#e7dccd] rounded-md p-4 shadow-sm">
      <div class="flex items-center justify-between mb-3">
        <h2 class="text-[18px] font-semibold text-[#2c3e50]">Past Reflections</h2>
        <div class="flex gap-2">
          <button
              class="text-[13px] px-3 py-1.5 rounded-md border border-[#d9d2c6] text-[#3f4754] bg-white hover:bg-[#f7efe4] transition"
              @click="$emit('close')"
          >Close</button>
        </div>
      </div>

      <!-- Filters -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
        <input
            v-model.trim="filters.q"
            placeholder="Search text or tags…"
            class="text-[14px] border border-[#d9d2c6] rounded-md p-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#c9a86a]"
        />
        <select
            v-model="filters.clientId"
            class="text-[14px] border border-[#d9d2c6] rounded-md p-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#c9a86a]"
        >
          <option :value="null">All clients</option>
          <option v-for="c in clients" :key="c.id" :value="c.id">{{ c.name }}</option>
        </select>
        <select
            v-model="filters.focus"
            class="text-[14px] border border-[#d9d2c6] rounded-md p-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#c9a86a]"
        >
          <option value="">All foci</option>
          <option v-for="f in focusOptions" :key="f" :value="f">{{ f }}</option>
        </select>
        <select
            v-model.number="filters.mood"
            class="text-[14px] border border-[#d9d2c6] rounded-md p-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#c9a86a]"
        >
          <option :value="0">Any mood</option>
          <option v-for="m in [1,2,3,4,5]" :key="m" :value="m">Mood {{ m }}</option>
        </select>
      </div>

      <div v-if="filtered.length === 0" class="text-[13px] text-slate-500 italic">
        No reflections match your filters.
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        <article
            v-for="r in filtered"
            :key="r.id"
            class="bg-white border border-[#e7dccd] rounded-md p-3 hover:shadow-sm transition"
        >
          <div class="flex items-start justify-between">
            <div>
              <div class="text-[14px] font-semibold text-[#2c3e50]">
                {{ r.focus }} <span class="text-[12px] text-slate-500">· Mood {{ r.mood }}</span>
              </div>
              <div class="text-[12px] text-slate-500">
                {{ formatDate(r.date) }} <span v-if="r.clientId">· {{ clientName(r.clientId) }}</span>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <button
                  class="text-[12px] px-2 py-1 rounded-md border border-[#d9d2c6] bg-white hover:bg-[#f7efe4] transition"
                  @click="select(r)"
              >View</button>
              <button
                  class="text-[12px] px-2 py-1 rounded-md border border-[#d9d2c6] bg-white hover:bg-[#f7efe4] transition"
                  @click="$emit('archive', r.id, !r.archived)"
              >{{ r.archived ? 'Unarchive' : 'Archive' }}</button>
              <button
                  class="text-[12px] px-2 py-1 rounded-md border border-[#e8b1a8] text-red-600 bg-white hover:bg-[#fde9e6] transition"
                  @click="$emit('delete', r.id)"
              >Delete</button>
            </div>
          </div>
          <p class="mt-2 text-[14px] text-slate-700 line-clamp-4">{{ r.text }}</p>
          <div class="mt-2 text-[12px] text-slate-500">
            <span v-for="t in r.tags" :key="t" class="mr-2 inline-block px-2 py-0.5 rounded bg-[#fff7ed] border border-[#f1d5b8]">
              #{{ t }}
            </span>
          </div>
        </article>
      </div>

      <!-- Detail drawer -->
      <transition name="fade">
        <div v-if="detail" class="fixed inset-0 bg-black/30 flex items-end md:items-center justify-center z-40" @click.self="detail=null">
          <div class="w-full md:max-w-2xl bg-white rounded-t-md md:rounded-md border border-[#e7dccd] p-4 shadow-lg">
            <div class="flex items-center justify-between mb-2">
              <div>
                <div class="text-[16px] font-semibold text-[#2c3e50]">{{ detail.focus }}</div>
                <div class="text-[12px] text-slate-500">{{ formatDate(detail.date) }} · Mood {{ detail.mood }}</div>
              </div>
              <button
                  class="text-[13px] px-3 py-1.5 rounded-md border border-[#d9d2c6] bg-white hover:bg-[#f7efe4]"
                  @click="detail=null"
              >Close</button>
            </div>
            <div class="text-[14px] text-slate-700 whitespace-pre-wrap">{{ detail.text }}</div>
            <div class="mt-2 text-[12px] text-slate-500">
              <span v-for="t in detail.tags" :key="t" class="mr-2 inline-block px-2 py-0.5 rounded bg-[#fff7ed] border border-[#f1d5b8]">
                #{{ t }}
              </span>
            </div>
            <div v-if="detail.aiSummary" class="mt-3 p-3 bg-[#faf4ea] border border-[#e7dccd] rounded">
              <div class="text-[13px] font-semibold text-[#2c3e50] mb-1">AI Summary</div>
              <div class="text-[14px] text-slate-700 whitespace-pre-wrap">{{ detail.aiSummary }}</div>
            </div>
          </div>
        </div>
      </transition>
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
