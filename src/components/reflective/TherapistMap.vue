<template>
  <div class="max-w-5xl mx-auto p-6 bg-white border border-[#d9dce1] rounded-lg shadow-sm relative">
    <h2 class="text-[18px] font-semibold text-[#2c3e50] mb-2">Therapist Map</h2>
    <p class="text-[14px] text-slate-600 mb-4">
      Drag nodes to arrange ideas. Click one node, then another to create a connection. Click a line to delete it.
    </p>

    <!-- Map Canvas -->
    <div
        ref="canvas"
        class="relative w-full h-[420px] bg-[#f9fafb] border border-[#e5e7eb] rounded-md overflow-hidden"
        @mousedown="startDrag"
        @mousemove="onDrag"
        @mouseup="endDrag"
        @mouseleave="endDrag"
    >
      <!-- SVG line layer (behind nodes) -->
      <svg class="absolute inset-0 w-full h-full pointer-events-none">
        <g>
          <g v-for="conn in connections" :key="conn.id" class="pointer-events-auto">
            <!-- thick invisible stroke for easier click targeting -->
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
            <!-- visible line -->
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
          class="absolute w-28 h-16 flex items-center justify-center text-center text-[13px]
               text-[#2c3e50] bg-white border rounded-md shadow-sm cursor-grab select-none transition-colors"
          :class="node.id === selectedNodeId ? 'border-[#2563eb] ring-1 ring-[#2563eb]/30' : 'border-[#d9dce1]'"
          :style="{ left: node.x + 'px', top: node.y + 'px' }"
          @mousedown.stop="beginNodeDrag(node, $event)"
          @click.stop="handleNodeClick(node)"
          title="Click to select; then click another node to connect"
      >
        {{ node.label }}
      </div>

      <!-- Empty state -->
      <p
          v-if="!nodes.length"
          class="absolute inset-0 flex items-center justify-center text-slate-400 text-[14px]"
      >
        🗺 Click “Add Node” to begin mapping your reflections
      </p>
    </div>

    <!-- Controls -->
    <div class="flex flex-wrap justify-end gap-2 md:gap-3 mt-5">
      <button
          class="px-3 md:px-4 py-2 bg-[#3f4754] text-white rounded-md hover:bg-[#2f3540] text-[14px]"
          @click="addNode"
      >
        + Add Node
      </button>
      <button
          class="px-3 md:px-4 py-2 bg-[#0ea5e9] text-white rounded-md hover:bg-[#0284c7] text-[14px]"
          :disabled="nodes.length < 2"
          title="Connect selected node by clicking another"
          @click="hintConnect"
      >
        Connect Nodes
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
      <button
          class="px-3 md:px-4 py-2 bg-[#2563eb] text-white rounded-md hover:bg-[#1d4ed8] text-[14px]"
          @click="generateInsight"
      >
        Generate AI Summary
      </button>
      <button
          class="px-3 md:px-4 py-2 bg-[#3f4754] text-white rounded-md hover:bg-[#2f3540] text-[14px]"
          @click="goBack"
      >
        Back to Workspace
      </button>
    </div>

    <!-- Small helper text -->
    <div class="mt-3 text-[12px] text-slate-500 flex flex-col gap-1">
      <span>Tip: Click a node to select; then click another node to create a connection.</span>
      <span>Click a line to delete that connection. Press Esc to clear selection.</span>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from "vue"

const emit = defineEmits(["generate-insight", "close"])
const canvas = ref(null)

const NODE_W = 112 // width in px (Tailwind w-28 = 112px)
const NODE_H = 64  // height in px (Tailwind h-16 = 64px)

const nodes = ref([])
const connections = ref([])
let draggingNode = null
let offset = { x: 0, y: 0 }
const selectedNodeId = ref(null)

// Load from localStorage
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

onBeforeUnmount(() => {
  window.removeEventListener("keydown", onKeydown)
})

// Persist
function saveMap() {
  localStorage.setItem("helio_therapistMap", JSON.stringify({
    nodes: nodes.value,
    connections: connections.value,
    lastModified: new Date().toISOString()
  }))
}

// Helpers
function nodeById(id) {
  return nodes.value.find(n => n.id === id)
}
function nextId() {
  return Date.now() + Math.random()
}

// UI actions
function addNode() {
  const id = nextId()
  const rect = canvas.value.getBoundingClientRect()
  nodes.value.push({
    id,
    label: `Reflection ${nodes.value.length + 1}`,
    x: Math.max(0, Math.min(rect.width - NODE_W, Math.random() * (rect.width - NODE_W))),
    y: Math.max(0, Math.min(rect.height - NODE_H, Math.random() * (rect.height - NODE_H))),
  })
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

function hintConnect() {
  // just a UX nudge; the connect is created via clicking nodes
  if (!selectedNodeId.value) {
    // no-op; selection happens on node click
  }
}

function handleNodeClick(node) {
  if (!selectedNodeId.value || selectedNodeId.value === node.id) {
    // select this node
    selectedNodeId.value = node.id
  } else {
    // connect selected -> this
    const a = selectedNodeId.value
    const b = node.id
    // prevent duplicates and self-links
    const exists = connections.value.some(
        c => (c.fromId === a && c.toId === b) || (c.fromId === b && c.toId === a)
    )
    if (!exists && a !== b) {
      connections.value.push({ id: nextId(), fromId: a, toId: b })
      saveMap()
    }
    // keep newly clicked node selected for chaining
    selectedNodeId.value = node.id
  }
}

function deleteConnection(connId) {
  connections.value = connections.value.filter(c => c.id !== connId)
  saveMap()
}

function onKeydown(e) {
  if (e.key === "Escape") selectedNodeId.value = null
}

// Dragging
function beginNodeDrag(node, e) {
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
      connections: connections.value
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

