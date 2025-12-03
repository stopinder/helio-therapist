<template>
  <div class="max-w-5xl mx-auto space-y-3">
    <div class="bg-[#faf4ea] border border-[#e7dccd] rounded-md p-4 shadow-sm">
      <div class="flex items-center justify-between mb-2">
        <h2 class="text-[18px] font-semibold text-[#2c3e50]">Therapist Map</h2>
        <button
            class="text-[13px] px-3 py-1.5 rounded-md border border-[#d9d2c6] text-[#3f4754] bg-white hover:bg-[#f7efe4] transition"
            @click="$emit('close')"
        >
          Close
        </button>
      </div>

      <p class="text-[13px] text-slate-600 mb-3">
        Conceptual map of your reflective themes. Node size reflects frequency. Edges connect co-occurring tags and focus areas.
      </p>

      <div class="bg-white border border-[#e7dccd] rounded-md p-3">
        <svg :viewBox="`0 0 ${w} ${h}`" class="w-full h-[420px]">
          <!-- edges -->
          <g>
            <line
                v-for="e in edges"
                :key="e.key"
                :x1="nodeById[e.source].x" :y1="nodeById[e.source].y"
                :x2="nodeById[e.target].x" :y2="nodeById[e.target].y"
                :stroke="edgeColor(e)"
                :stroke-width="1 + e.weight * 1.2"
                stroke-linecap="round"
                opacity="0.6"
            />
          </g>
          <!-- nodes -->
          <g>
            <g v-for="n in nodes" :key="n.id" @mouseenter="hover=n.id" @mouseleave="hover=null" class="cursor-pointer">
              <circle
                  :cx="n.x" :cy="n.y"
                  :r="nodeRadius(n)"
                  :fill="n.type==='focus' ? '#f4d7a8' : '#c9d7ff'"
                  :stroke="hover===n.id ? '#2f3540' : '#bfae90'"
                  stroke-width="1.5"
                  :opacity="hover && hover!==n.id ? 0.5 : 1"
              />
              <text
                  :x="n.x" :y="n.y - nodeRadius(n) - 4"
                  text-anchor="middle"
                  class="fill-[#2c3e50]"
                  style="font-size: 12px;"
              >{{ n.label }}</text>
            </g>
          </g>
        </svg>
      </div>

      <!-- quick stats -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
        <div class="bg-white border border-[#e7dccd] rounded-md p-3">
          <div class="text-[12px] text-slate-500">Total reflections</div>
          <div class="text-[20px] font-semibold">{{ reflections.length }}</div>
        </div>
        <div class="bg-white border border-[#e7dccd] rounded-md p-3">
          <div class="text-[12px] text-slate-500">Top focus</div>
          <div class="text-[14px] font-semibold">{{ topFocus || '—' }}</div>
        </div>
        <div class="bg-white border border-[#e7dccd] rounded-md p-3">
          <div class="text-[12px] text-slate-500">Avg mood</div>
          <div class="text-[14px] font-semibold">{{ avgMood }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  reflections: { type: Array, default: () => [] }
})
defineEmits(['close'])

const w = 900, h = 360
const hover = ref(null)

// --- Build nodes from focuses and tags ---
const focusCounts = computed(() => {
  const m = new Map()
  props.reflections.forEach(r => {
    if (r.archived) return
    const f = r.focus || 'General'
    m.set(f, (m.get(f) || 0) + 1)
  })
  return m
})
const tagCounts = computed(() => {
  const m = new Map()
  props.reflections.forEach(r => {
    if (r.archived) return
        ;(r.tags || []).forEach(t => m.set(t, (m.get(t) || 0) + 1))
  })
  return m
})

const nodes = computed(() => {
  const focusNodes = Array.from(focusCounts.value.entries()).map(([label, count], i, arr) => ({
    id: `F:${label}`,
    label, count,
    type: 'focus',
    ...circlePos(i, arr.length, w/2, h/2, Math.min(w,h)*0.33)
  }))
  const tagNodes = Array.from(tagCounts.value.entries()).map(([label, count], i, arr) => ({
    id: `T:${label}`,
    label, count,
    type: 'tag',
    ...circlePos(i, arr.length, w/2, h/2, Math.min(w,h)*0.20)
  }))
  return [...focusNodes, ...tagNodes]
})

const nodeById = computed(() => Object.fromEntries(nodes.value.map(n => [n.id, n])))

// --- Edges via co-occurrence of focus <-> tag in same reflection ---
const edges = computed(() => {
  const m = new Map()
  props.reflections.forEach(r => {
    if (r.archived) return
    const f = r.focus || 'General'
    ;(r.tags || []).forEach(t => {
      const key = `F:${f}__T:${t}`
      m.set(key, (m.get(key) || 0) + 1)
    })
  })
  return Array.from(m.entries()).map(([key, weight]) => {
    const [source, target] = key.split('__')
    return { key, source, target, weight }
  })
})

function circlePos(i, total, cx, cy, R) {
  if (!total) return { x: cx, y: cy }
  const angle = (i / total) * Math.PI * 2 - Math.PI / 2
  return { x: cx + R * Math.cos(angle), y: cy + R * Math.sin(angle) }
}
function nodeRadius(n) {
  const base = n.type === 'focus' ? 16 : 10
  return base + Math.min(10, (n.count - 1) * 3)
}
function edgeColor(e) {
  return '#c9a86a'
}

const topFocus = computed(() => {
  let best = null, bestC = -1
  focusCounts.value.forEach((c, f) => { if (c > bestC) { best = f; bestC = c } })
  return best
})
const avgMood = computed(() => {
  const arr = props.reflections.filter(r => !r.archived).map(r => Number(r.mood) || 0)
  if (!arr.length) return '—'
  const sum = arr.reduce((a,b) => a+b, 0)
  return (sum / arr.length).toFixed(1)
})
</script>
