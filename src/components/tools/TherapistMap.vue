<template>
  <div class="w-full h-full bg-[#f9fafb] relative select-none overflow-hidden">
    <!-- Toolbar -->
    <div class="absolute top-3 left-3 z-10 flex gap-2 bg-white border border-gray-300 rounded-md shadow-sm p-2">
      <button
          class="text-[13px] px-3 py-1.5 rounded-md border border-gray-300 bg-white hover:bg-gray-100 transition"
          @click="addNode"
      >
        + Add Node
      </button>
      <button
          class="text-[13px] px-3 py-1.5 rounded-md border border-gray-300 bg-white hover:bg-gray-100 transition"
          @click="clearAll"
      >
        Clear All
      </button>
    </div>

    <!-- Canvas for connections -->
    <svg class="absolute inset-0 w-full h-full pointer-events-none">
      <line
          v-for="conn in connections"
          :key="conn.id"
          :x1="getNode(conn.from)?.x + nodeSize / 2"
          :y1="getNode(conn.from)?.y + nodeSize / 2"
          :x2="getNode(conn.to)?.x + nodeSize / 2"
          :y2="getNode(conn.to)?.y + nodeSize / 2"
          stroke="#9ca3af"
          stroke-width="2"
          @click.stop="deleteConnection(conn.id)"
          class="cursor-pointer"
      />
    </svg>

    <!-- Draggable nodes -->
    <div
        v-for="node in nodes"
        :key="node.id"
        class="absolute rounded-md shadow-sm border text-center cursor-pointer text-[13px] font-medium transition-colors"
        :style="{
        top: node.y + 'px',
        left: node.x + 'px',
        width: nodeSize + 'px',
        height: nodeSize + 'px',
        backgroundColor: node.color,
        borderColor: selectedNode?.id === node.id ? '#2563eb' : '#d1d5db',
      }"
        @mousedown="startDrag($event, node)"
        @click="handleNodeClick(node, $event)"
    >
      <div class="flex items-center justify-center w-full h-full p-2 text-slate-700">
        {{ node.label }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'

const nodeSize = 120

// --- Reactive State ---
const nodes = ref([])
const connections = ref([])
const selectedNode = ref(null)
const drag = ref({ active: false, offsetX: 0, offsetY: 0, node: null })

// --- LocalStorage persistence ---
onMounted(() => {
  const saved = JSON.parse(localStorage.getItem('helio_map') || '{}')
  if (saved.nodes) nodes.value = saved.nodes
  if (saved.connections) connections.value = saved.connections
})
watch([nodes, connections], () => {
  localStorage.setItem('helio_map', JSON.stringify({ nodes: nodes.value, connections: connections.value }))
}, { deep: true })

// --- Node Management ---
function addNode() {
  const id = Date.now()
  const colors = ['#e0f2fe', '#fee2e2', '#fef9c3', '#dcfce7', '#ede9fe']
  nodes.value.push({
    id,
    label: 'New Node',
    x: 100 + Math.random() * 400,
    y: 100 + Math.random() * 200,
    color: colors[Math.floor(Math.random() * colors.length)],
  })
}

function clearAll() {
  if (confirm('Clear all nodes and connections?')) {
    nodes.value = []
    connections.value = []
    localStorage.removeItem('helio_map')
  }
}

function getNode(id) {
  return nodes.value.find(n => n.id === id)
}

// --- Node Interaction ---
function handleNodeClick(node, e) {
  if (selectedNode.value && selectedNode.value.id !== node.id) {
    // create connection
    const exists = connections.value.find(
        c =>
            (c.from === selectedNode.value.id && c.to === node.id) ||
            (c.from === node.id && c.to === selectedNode.value.id)
    )
    if (!exists) {
      connections.value.push({ id: Date.now(), from: selectedNode.value.id, to: node.id })
    }
    selectedNode.value = null
  } else {
    selectedNode.value = node
  }
  e.stopPropagation()
}

function deleteConnection(id) {
  connections.value = connections.value.filter(c => c.id !== id)
}

// --- Dragging Logic ---
function startDrag(e, node) {
  drag.value = {
    active: true,
    offsetX: e.offsetX,
    offsetY: e.offsetY,
    node,
  }
  document.addEventListener('mousemove', onDrag)
  document.addEventListener('mouseup', stopDrag)
}

function onDrag(e) {
  if (!drag.value.active) return
  const { node, offsetX, offsetY } = drag.value
  node.x = e.pageX - offsetX - 64 // adjust for sidebar offset if needed
  node.y = e.pageY - offsetY - 64
}

function stopDrag() {
  drag.value.active = false
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
}
</script>

<style scoped>
.cursor-pointer:hover {
  filter: brightness(0.95);
}
</style>


