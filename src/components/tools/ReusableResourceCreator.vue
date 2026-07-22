<template>
  <details class="add-resource" :open="expanded" @toggle="expanded = $event.target.open">
    <summary>+ Create reusable resource</summary>
    <div class="creator-fields">
      <label>Title<input v-model="draft.title" placeholder="e.g. Sleep diary" /></label>
      <label>Type<select v-model="draft.resourceKind"><option v-for="[value, label] in resourceKinds" :key="value" :value="value">{{ label }}</option></select></label>
      <label>Who can use this?<select v-model="draft.audience"><option value="client">Client</option><option value="both">Client and therapist</option><option value="therapist">Therapist only</option></select></label>
      <label>Completion method<select v-model="draft.completionMode"><option value="complete_in_helio">Complete in Helio</option><option value="upload">Upload completed copy</option><option value="complete_or_upload">Complete or upload</option><option value="read_only">Read only</option></select></label>
      <p v-if="error" class="creator-error" role="alert">{{ error }}</p>
      <button type="button" class="secondary" :disabled="creating || !draft.title.trim()" @click="create">{{ creating ? 'Creating…' : 'Create resource' }}</button>
    </div>
  </details>
</template>

<script setup>
import { ref } from 'vue'
import { authenticatedFetch } from '../../lib/api.js'
import { resourceKinds } from '../../lib/clinicalExchange.js'

const emit = defineEmits(['created'])
const expanded = ref(false), creating = ref(false), error = ref('')
const emptyDraft = () => ({ title: '', resourceKind: 'worksheet', audience: 'client', completionMode: 'complete_in_helio' })
const draft = ref(emptyDraft())

async function create() {
  creating.value = true; error.value = ''
  try {
    const response = await authenticatedFetch('/api/resources', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(draft.value) })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(data.error || 'The resource could not be created.')
    emit('created', data.resource)
    draft.value = emptyDraft(); expanded.value = false
  } catch (cause) { error.value = cause.message } finally { creating.value = false }
}
</script>

<style scoped>
.add-resource{margin:.9rem 0;padding:.75rem;border:1px solid #dbe1e8;border-radius:.65rem;background:#f8fafc}.add-resource summary{cursor:pointer;font-weight:700;color:#334155}.creator-fields label{display:block;margin:.8rem 0;font-size:.85rem;font-weight:700;color:#334155}.creator-fields input,.creator-fields select{box-sizing:border-box;width:100%;margin-top:.35rem;padding:.7rem;border:1px solid #cfd7e2;border-radius:.55rem;font:inherit;font-weight:400}.secondary{border:1px solid #d7dde6;border-radius:.55rem;padding:.6rem .9rem;background:#fff;color:#334155;font-weight:650}.creator-error{margin:.75rem 0;padding:.7rem .8rem;border:1px solid #fecaca;background:#fff7f7;border-radius:.55rem;color:#991b1b}
</style>
