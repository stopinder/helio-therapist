<template>
  <div
      class="max-w-5xl mx-auto p-6 bg-white border border-[#d9dce1] rounded-lg shadow-sm relative"
  >
    <h2 class="text-[18px] font-semibold text-[#2c3e50] mb-2">
      Therapist Map
    </h2>
    <p class="text-[14px] text-slate-600 mb-4">
      Drag, add, and organise reflective nodes. Future versions will connect
      insights and AI summaries dynamically.
    </p>

    <!-- Map Canvas -->
    <div
        ref="canvas"
        class="relative w-full h-[400px] bg-[#f9fafb] border border-[#e5e7eb] rounded-md overflow-hidden"
        @mousedown="startDrag"
        @mousemove="onDrag"
        @mouseup="endDrag"
        @mouseleave="endDrag"
    >
      <div
          v-for="node in nodes"
          :key="node.id"
          class="absolute w-28 h-16 flex items-center justify-center text-center text-[13px]
               text-[#2c3e50] bg-white border border-[#d9dce1] rounded-md shadow-sm cursor-grab
               select-none"
          :style="{ left: node.x + 'px', top: node.y + 'px' }"
          @mousedown.stop="beginNodeDrag(node, $event)"
      >
        {{ node.label }}
      </div>

      <p
          v-if="!nodes.length"
          class="absolute inset-0 flex items-center justify-center text-slate-400 text-[14px]"
      >
        🗺 Click “Add Node” to begin mapping your reflections
      </p>
    </div>

    <!-- Controls -->
    <div class="flex justify-end gap-3 mt-5">
      <button
          class="px-4 py-2 bg-[#3f4754] text-white rounded-md hover:bg-[#2f3540] text-[14px]"
          @click="addNode"
      >
        + Add Node
      </button>

      <button
          class="px-4 py-2 bg-[#e11d48] text-white rounded-md hover:bg-[#b91c1c] text-[14px]"
          :disabled="!nodes.length"
          @click="clearMap"
      >
        Clear Map
      </button>

      <button
          class="px-4 py-2 bg-[#2563eb] text-white rounded-md hover:bg-[#1d4ed8] text-[14px]"
          @click="generateInsight"
      >
        Generate AI Summary
      </button>

      <button
          class="px-4 py-2 bg-[#3f4754] text-white rounded-md hover:bg-[#2f3540] text-[14px]"
          @click="goBack"
      >
        Back to Workspace
      </button>
    </div>

    <!-- Inline note -->
    <p class="text-[12px] text-slate-500 mt-3 italic">
      This map auto-saves locally. Future versions will connect nodes and sync
      with AI reflections.
    </p>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue"

const emit = defineEmits(["generate-insight", "close"])
const canvas = ref(null)
const nodes = ref([])

let draggingNode = null
let offset = { x: 0, y: 0 }

// Load from localStorage if any
onMounted(() => {
  const saved = localStorage.getItem("helio_therapistMap")
  if (saved) nodes.value = JSON.parse(saved)
})

// Persist whenever nodes change
function saveMap() {
  localStorage.setItem("helio_therapistMap", JSON.stringify(nodes.value))
}

// Add a new draggable node
function addNode() {
  const id = Date.now()
  const rect = canvas.value.getBoundingClientRect()
  nodes.value.push({
    id,
    label: `Reflection ${nodes.value.length + 1}`,
    x: Math.random() * (rect.width - 120),
    y: Math.random() * (rect.height - 60),
  })
  saveMap()
}

// Clear the entire map
function clearMap() {
  if (confirm("Clear all nodes from map?")) {
    nodes.value = []
    saveMap()
  }
}

// Dragging mechanics
function beginNodeDrag(node, e) {
  draggingNode = node
  offset.x = e.offsetX
  offset.y = e.offsetY
  e.target.style.cursor = "grabbing"
}
function startDrag() {}
function onDrag(e) {
  if (!draggingNode) return
  const rect = canvas.value.getBoundingClientRect()
  draggingNode.x = Math.min(
      Math.max(0, e.clientX - rect.left - offset.x),
      rect.width - 120
  )
  draggingNode.y = Math.min(
      Math.max(0, e.clientY - rect.top - offset.y),
      rect.height - 60
  )
}
function endDrag(e) {
  if (draggingNode) {
    draggingNode = null
    saveMap()
  }
}

// AI Insight + Back
function generateInsight() {
  const clientId = JSON.parse(localStorage.getItem("helio_selectedClient"))?.id
  emit("generate-insight", {
    tool: "therapist-map",
    clientId,
    form: {
      nodes: nodes.value,
    },
  })
}

function goBack() {
  emit("close")
}
</script>

<style scoped>
.cursor-grab:active {
  cursor: grabbing;
}
</style>
