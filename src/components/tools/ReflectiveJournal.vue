<template>
  <div class="max-w-3xl mx-auto text-slate-700 space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-2xl font-semibold text-[#2c3e50]">Reflective Practice</h2>
        <p class="text-[13px] text-slate-500 mt-0.5">
          Personal reflections for supervision and professional growth
        </p>
      </div>
      <button
          @click="$emit('close')"
          class="text-[13px] px-3 py-1.5 rounded-md border border-[#d9dce1]
               text-[#3f4754] bg-white hover:bg-[#f5f7fa] transition"
      >
        ← Back to Workspace
      </button>
    </div>

    <!-- Journal Form -->
    <div class="p-5 bg-white border border-[#e5e7eb] rounded-md shadow-sm space-y-4">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="block text-[14px] font-medium text-[#3f4754] mb-1">Date</label>
          <input type="date" v-model="form.date" class="journal-input" />
        </div>

        <div>
          <label class="block text-[14px] font-medium text-[#3f4754] mb-1">Linked Client</label>
          <select v-model="form.clientId" class="journal-input">
            <option value="">— None —</option>
            <option v-for="c in clients" :key="c.id" :value="c.id">{{ c.name }}</option>
          </select>
        </div>
      </div>

      <div>
        <label class="block text-[14px] font-medium text-[#3f4754] mb-1">Title</label>
        <input v-model="form.title" type="text" class="journal-input" placeholder="Reflection title..." />
      </div>

      <div>
        <label class="block text-[14px] font-medium text-[#3f4754] mb-1">Tags</label>
        <input
            v-model="tagsInput"
            type="text"
            class="journal-input"
            placeholder="e.g. counter-transference, supervision"
            @keyup.enter.prevent="addTag"
        />
        <div class="flex flex-wrap gap-2 mt-2">
          <span
              v-for="(tag, i) in form.tags"
              :key="i"
              class="px-2 py-0.5 text-[12px] bg-[#eaf1ff] border border-[#d0d7e4] rounded-md cursor-pointer"
              @click="removeTag(i)"
          >
            {{ tag }} ✕
          </span>
        </div>
      </div>

      <div>
        <label class="block text-[14px] font-medium text-[#3f4754] mb-1">Reflection</label>
        <textarea
            v-model="form.content"
            rows="10"
            class="journal-input resize-none"
            placeholder="Write your reflection here..."
        ></textarea>
      </div>

      <!-- Buttons -->
      <div class="flex flex-wrap gap-3 justify-end pt-2">
        <button
            @click="openModal = true"
            class="px-4 py-2 text-[14px] border border-[#d9dce1] rounded-md hover:bg-[#f5f7fa]"
        >
          📂 Load Previous
        </button>

        <button
            @click="generateInsight"
            class="px-4 py-2 text-[14px] bg-[#2563eb] text-white rounded-md hover:bg-[#1d4ed8]"
        >
          💡 AI Insight
        </button>

        <button
            @click="saveEntry"
            class="px-4 py-2 text-[14px] bg-[#3f4754] text-white rounded-md hover:bg-[#2f3540]"
        >
          💾 Save
        </button>
      </div>
    </div>

    <!-- Load Previous Modal -->
    <transition name="fade">
      <div
          v-if="openModal"
          class="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      >
        <div class="bg-white rounded-md shadow-xl max-w-md w-full border border-[#d9dce1]">
          <div class="flex items-center justify-between p-4 border-b border-[#e5e7eb]">
            <h3 class="text-[15px] font-semibold text-[#2c3e50]">Previous Reflections</h3>
            <button @click="openModal = false" class="text-[15px] text-slate-500 hover:text-slate-700">
              ✕
            </button>
          </div>

          <div class="max-h-[50vh] overflow-auto divide-y divide-[#e5e7eb]">
            <div
                v-for="entry in savedEntries"
                :key="entry.id"
                class="p-3 hover:bg-[#f5f7fa] cursor-pointer transition"
                @click="loadEntry(entry)"
            >
              <div class="text-[14px] font-medium text-[#2c3e50]">
                {{ entry.title || 'Untitled Reflection' }}
              </div>
              <div class="text-[12px] text-slate-500">
                {{ formatDate(entry.date) }} •
                <span v-if="entry.clientName">{{ entry.clientName }}</span>
                <span v-else>No client linked</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'

const props = defineProps({
  clients: { type: Array, default: () => [] },
  selectedClient: { type: Object, default: null }
})
const emit = defineEmits(['close', 'generate-insight'])

const STORAGE_KEY = 'helio_reflections'
const openModal = ref(false)
const tagsInput = ref('')

const form = reactive({
  id: null,
  date: new Date().toISOString().slice(0, 10),
  clientId: '',
  title: '',
  content: '',
  tags: []
})

const savedEntries = ref([])

const loadEntries = () => {
  savedEntries.value = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
}

const saveEntry = () => {
  if (!form.content.trim() && !form.title.trim()) return alert('Nothing to save.')
  const entry = {
    ...form,
    id: form.id || Date.now(),
    clientName: clients.find(c => c.id === form.clientId)?.name || null
  }
  const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
  const existing = all.findIndex(e => e.id === entry.id)
  if (existing >= 0) all[existing] = entry
  else all.push(entry)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
  loadEntries()
  alert('Reflection saved.')
}

const loadEntry = (entry) => {
  Object.assign(form, entry)
  openModal.value = false
}

const addTag = () => {
  const tag = tagsInput.value.trim()
  if (tag && !form.tags.includes(tag)) form.tags.push(tag)
  tagsInput.value = ''
}
const removeTag = (i) => form.tags.splice(i, 1)

const generateInsight = () => {
  emit('generate-insight', {
    tool: 'reflective_journal',
    clientId: form.clientId || null,
    content: form.content,
    tags: form.tags
  })
}

const formatDate = (d) => new Date(d).toLocaleDateString()

onMounted(() => {
  loadEntries()
  if (props.selectedClient) form.clientId = props.selectedClient.id
})
</script>

<style scoped>
.journal-input {
  @apply w-full border border-[#d9dce1] rounded-md px-3 py-2 text-[14px]
  focus:outline-none focus:ring-2 focus:ring-[#a8b0c1] bg-[#fafbfc];
}

.fade-enter-active, .fade-leave-active {
  transition: opacity 0.25s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>
