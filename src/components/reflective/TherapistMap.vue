<template>
  <div class="max-w-5xl mx-auto p-6 bg-white border border-[#d9dce1] rounded-lg shadow-sm relative">
    <h2 class="text-[18px] font-semibold text-[#2c3e50] mb-2">Therapist Map</h2>
    <p class="text-[14px] text-slate-600 mb-4">
      Double-click any node to rename and assign a type. Drag to move; click nodes to connect. Click lines to delete.
    </p>

    <!-- Map Canvas -->
    <div
        ref="canvas"
        class="relative w-full h-[440px] bg-[#f9fafb] border border-[#e5e7eb] rounded-md overflow-hidden"
        @mousedown="startDrag"
        @mousemove="onDrag"
        @mouseup="endDrag"
        @mouseleave="endDrag"
    >
      <!-- SVG line layer -->
      <svg class="absolute inset-0 w-full h-full pointer-events-none">
        <g>
          <g v-for="conn in connections" :key="conn.id" class="pointer-events-auto">
            <line
                :x1="nodeById(conn.fromId)?.x + NODE_W/2"
                :y1="nodeById(conn.fromId)?.y + NODE_H/2"
                :x2="nodeById(conn.toId)?.x + NODE_W/2"
                :y2="nodeById(conn.toId)?.y + NODE_H/2"
                stroke="transparent"
                :stroke-width="14"
                class="cursor-pointer"
                @click.stop="deleteConnection(conn.id)"
            />
            <line
                :x1="nodeById(conn.fromId)?.x + NODE_W/2"
                :y1="nodeById(conn.fromId)?.y + NODE_H/2"
                :x2="nodeById(conn.toId)?.x + NODE_W/2"
                :y2="nodeById(conn.toId)?.y + NODE_H/2"
                :stroke="selectedNodeId && (conn.fromId === selectedNodeId || conn.toId === selectedNodeId) ? '#2563eb' : '#cbd5e1'"
                stroke-width="2"
            />
          </g>
        </g>
      </svg>

      <!-- Nodes -->
      <div
          v-for="node in nodes"
          :key="node.id"
          class="absolute w-28 min-h-16 flex flex-col items-center justify-center text-center text-[13px]
               text-[#2c3e50] border rounded-md shadow-sm select-none transition-colors p-1 cursor-grab"
          :style="{
          left: node.x + 'px',
          top: node.y + 'px',
          backgroundColor: typeColors[node.type || 'General'],
          borderColor: node.id === selectedNodeId ? '#2563eb' : '#d9dce1'
        }"
          @mousedown.stop="beginNodeDrag(node, $event)"
          @click.stop="handleNodeClick(node)"
          @dblclick.stop="enterEdit(node)"
      >
        <!-- Editing mode -->
        <template v-if="editingNode && editingNode.id === node.id">
          <input
              v-model="editLabel"
              class="w-full border border-[#d9dce1] rounded-sm text-[13px] px-1 py-0.5 mb-1 focus:outline-none focus:ring-1 focus:ring-[#2563eb]"
              @keyup.enter="saveEdit"
              @blur="saveEdit"
          />
          <select
              v-model="editType"
              class="w-full border border-[#d9dce1] rounded-sm text-[12px] px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-[#2563eb]"
          >
            <option>General</option>
            <option>Part</option>
            <option>Emotion</option>
            <option>Memory</option>
            <option>Theme</option>
          </select>
        </template>

        <!-- Normal view -->
        <template v-else>
          <div class="font-medium">{{ node.label }}</div>
          <div class="text-[11px] text-slate-500">{{ node.type || 'General' }}</div>
        </template>
      </div>

      <!-- Empty state -->
      <p v-if="!nodes.length" class="absolute inset-0 flex items-center justify-center text-slate-400 text-[14px]">
        🗺 Click “Add Node” to begin mapping your reflections
      </p>
    </div>

    <!-- Controls -->
    <div class="flex flex-wrap justify-end gap-2 md:gap-3 mt-5">
      <button class="px-3 md:px-4 py-2 bg-[#3f4754] text-white rounded-md hover:bg-[#2f3540] text-[14px]" @click="addNode">
        + Add Node
      </button>
      <button
          class="px-3 md:px-4 py-2 bg-[#eab308] text-white rounded-md hover:bg-[#ca8a04] text-[14px]"
          :disabled="!connections.length"
          @click="clearConnections"
      >
        Clear Connections
      </button>
      <button
          class="px-3 md:px-4 py-2 bg-[#e11d48] text-white rounded-md hover:bg-[#b91c1c] text-[14px]"
          :disabled="!nodes.length"
          @click="clearMap"
      >
        Clear Map
      </button>
      <button class="px-3 md:px-4 py-2 bg-[#2563eb] text-white rounded-md hover:bg-[#1d4ed8] text-[14px]" @click="generateInsight">
        Generate AI Summary
      </button>
      <button class="px-3 md:px-4 py-2 bg-[#3f4754] text-white rounded-md hover:bg-[#2f3540] text-[14px]" @click="goBack">
        Back to Workspace
      </button>
    </div>

    <!-- Helper text -->
    <div class="mt-3 text-[12px] text-slate-500 flex flex-col gap-1">
      <span>Tip: Double-click a node to rename or set a type. Click a node to connect; click a line to delete.</span>
      <span>Press Esc to clear selection. All changes auto-save locally.</span>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from "vue"

const emit = defineEmits(["generate-insight", "close"])
const canvas = ref(null)

const NODE_W = 112
const NODE_H = 64

const nodes = ref([])
const connections = ref([])
const selectedNodeId = ref(null)
let draggingNode = null
let offset = { x: 0, y: 0 }

// Editing state
const editingNode = ref(null)
const editLabel = ref("")
const editType = ref("General")

// Soft color palette by type
const typeColors = {
  General: "#ffffff",
  Part: "#f3f0ff",
  Emotion: "#eff6ff",
  Memory: "#f0fdfa",
  Theme: "#f9fafb",
}

// === Load/Save ===
onMounted(() => {
  const saved = localStorage.getItem("helio_therapistMap")
  if (saved) {
    try {
      const parsed = JSON.parse(saved)
      nodes.value = parsed.nodes || []
      connections.value = parsed.connections || []
    } catch {
      nodes.value = []
      connections.value = []
    }
  }
  window.addEventListener("keydown", onKeydown)
})
onBeforeUnmount(() => window.removeEventListener("keydown", onKeydown))

function saveMap() {
  localStorage.setItem(
      "helio_therapistMap",
      JSON.stringify({
        nodes: nodes.value,
        connections: connections.value,
        lastModified: new Date().toISOString(),
      })
  )
}

// === Utility ===
function nextId() {
  return Date.now() + Math.random()
}
function nodeById(id) {
  return nodes.value.find((n) => n.id === id)
}

// === Nodes ===
function addNode() {
  const id = nextId()
  const rect = canvas.value.getBoundingClientRect()
  nodes.value.push({
    id,
    label: `Reflection ${nodes.value.length + 1}`,
    type: "General",
    x: Math.random() * (rect.width - NODE_W),
    y: Math.random() * (rect.height - NODE_H),
  })
  saveMap()
}

function enterEdit(node) {
  editingNode.value = node
  editLabel.value = node.label
  editType.value = node.type || "General"
}
function saveEdit() {
  if (!editingNode.value) return
  const n = nodes.value.find((n) => n.id === editingNode.value.id)
  if (n) {
    n.label = editLabel.value.trim() || n.label
    n.type = editType.value
  }
  editingNode.value = null
  saveMap()
}

function clearConnections() {
  if (!connections.value.length) return
  if (confirm("Clear all connections?")) {
    connections.value = []
    saveMap()
  }
}
function clearMap() {
  if (!nodes.value.length && !connections.value.length) return
  if (confirm("Clear all nodes and connections?")) {
    nodes.value = []
    connections.value = []
    selectedNodeId.value = null
    saveMap()
  }
}
function handleNodeClick(node) {
  if (editingNode.value) return
  if (!selectedNodeId.value || selectedNodeId.value === node.id) {
    selectedNodeId.value = node.id
  } else {
    const a = selectedNodeId.value
    const b = node.id
    const exists = connections.value.some(
        (c) =>
            (c.fromId === a && c.toId === b) || (c.fromId === b && c.toId === a)
    )
    if (!exists && a !== b) {
      connections.value.push({ id: nextId(), fromId: a, toId: b })
      saveMap()
    }
    selectedNodeId.value = node.id
  }
}
function deleteConnection(id) {
  connections.value = connections.value.filter((c) => c.id !== id)
  saveMap()
}
function onKeydown(e) {
  if (e.key === "Escape") selectedNodeId.value = null
}

// === Dragging ===
function beginNodeDrag(node, e) {
  if (editingNode.value) return
  draggingNode = node
  offset.x = e.offsetX
  offset.y = e.offsetY
  e.currentTarget.style.cursor = "grabbing"
}
function startDrag() {}
function onDrag(e) {
  if (!draggingNode) return
  const rect = canvas.value.getBoundingClientRect()
  draggingNode.x = Math.min(Math.max(0, e.clientX - rect.left - offset.x), rect.width - NODE_W)
  draggingNode.y = Math.min(Math.max(0, e.clientY - rect.top - offset.y), rect.height - NODE_H)
}
function endDrag() {
  if (draggingNode) {
    draggingNode = null
    saveMap()
  }
}

// === AI & Back ===
function generateInsight() {
  const clientId = JSON.parse(localStorage.getItem("helio_selectedClient"))?.id
  emit("generate-insight", {
    tool: "therapist-map",
    clientId,
    form: { nodes: nodes.value, connections: connections.value },
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


