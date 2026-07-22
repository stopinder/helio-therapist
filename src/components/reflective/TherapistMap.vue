<template>
  <div class="max-w-5xl mx-auto p-6 bg-surface-elevated border border-border rounded-panel  relative">
    <h2 class="text-h3 font-semibold text-ink mb-2">Therapist Map</h2>
    <p class="text-body text-ink-secondary mb-4">
      Double-click any node to rename and assign a type. Drag to move; click nodes to connect. Click lines to delete.
    </p>

    <!-- Map Canvas -->
    <div
        ref="canvas"
        class="relative w-full h-[440px] bg-surface-subtle border border-border-muted rounded-control overflow-hidden"
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
                :stroke="selectedNodeId && (conn.fromId === selectedNodeId || conn.toId === selectedNodeId) ? 'var(--action-link)' : 'var(--border)'"
                stroke-width="2"
            />
          </g>
        </g>
      </svg>

      <!-- Nodes -->
      <div
          v-for="node in nodes"
          :key="node.id"
          class="absolute w-28 min-h-16 flex flex-col items-center justify-center text-center text-body-sm
               text-ink border rounded-control  select-none transition-colors p-1 cursor-grab"
          :style="{
          left: node.x + 'px',
          top: node.y + 'px',
          backgroundColor: typeColors[node.type || 'General'],
          borderColor: node.id === selectedNodeId ? 'var(--action-link)' : '#d9dce1'
        }"
          @mousedown.stop="beginNodeDrag(node, $event)"
          @click.stop="handleNodeClick(node)"
          @dblclick.stop="enterEdit(node)"
      >
        <!-- Editing mode -->
        <template v-if="editingNode && editingNode.id === node.id">
          <input
              v-model="editLabel"
              class="w-full border border-border rounded-sm text-body-sm px-1 py-0.5 mb-1 focus:outline-none focus:ring-1 focus:ring-state-focus-ring"
              @keyup.enter="saveEdit"
              @blur="saveEdit"
          />
          <select
              v-model="editType"
              class="w-full border border-border rounded-sm text-caption px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-state-focus-ring"
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
          <div class="text-overline text-ink-muted">{{ node.type || 'General' }}</div>
        </template>
      </div>

      <!-- Empty state -->
      <p v-if="!nodes.length" class="absolute inset-0 flex items-center justify-center text-ink-subtle text-body">
        🗺 Click “Add Node” to begin mapping your reflections
      </p>
    </div>

    <!-- Controls -->
    <div class="flex flex-wrap justify-end gap-2 md:gap-3 mt-5">
      <button class="px-3 md:px-4 py-2 bg-action-primary text-on-action rounded-control hover:bg-action-primary-hover text-body" @click="addNode">
        + Add Node
      </button>
      <button
          class="px-3 md:px-4 py-2 bg-state-warning text-on-action rounded-control hover:bg-state-warning text-body"
          :disabled="!connections.length"
          @click="clearConnections"
      >
        Clear Connections
      </button>
      <button
          class="px-3 md:px-4 py-2 bg-state-danger text-on-action rounded-control hover:bg-state-danger text-body"
          :disabled="!nodes.length"
          @click="clearMap"
      >
        Clear Map
      </button>
      <button class="px-3 md:px-4 py-2 bg-action-link text-on-action rounded-control hover:bg-action-link-hover text-body" @click="generateInsight">
        Generate AI Summary
      </button>
      <button class="px-3 md:px-4 py-2 bg-action-primary text-on-action rounded-control hover:bg-action-primary-hover text-body" @click="goBack">
        Back to Workspace
      </button>
    </div>

    <!-- Helper text -->
    <div class="mt-3 text-caption text-ink-muted flex flex-col gap-1">
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
  General: "var(--surface-elevated)",
  Part: "#f3f0ff",
  Emotion: "var(--state-selected)",
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


