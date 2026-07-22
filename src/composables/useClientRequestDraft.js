import { computed, ref } from 'vue'

// The composer is deliberately route-local. It is one send action, not app state.
export function useClientRequestDraft(clientId) {
  const items = ref([])
  const instruction = ref('')
  const dueDate = ref(null)
  const hasItem = key => items.value.some(item => item.key === key)
  const addItem = item => { if (!hasItem(item.key)) items.value = [...items.value, item] }
  const removeItem = key => { items.value = items.value.filter(item => item.key !== key) }
  const setInstruction = value => { instruction.value = value }
  const setDueDate = value => { dueDate.value = value || null }
  const reset = () => { items.value = []; instruction.value = ''; dueDate.value = null }
  return { clientId, items, instruction, dueDate, selectedCount: computed(() => items.value.length), hasItem, addItem, removeItem, setInstruction, setDueDate, reset }
}
