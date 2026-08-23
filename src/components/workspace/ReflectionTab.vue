<template>
  <div class="mx-auto max-w-4xl space-y-6">
    <section class="rounded-panel border border-border-muted bg-surface-elevated p-6">
      <div class="mb-8 max-w-2xl">
        <p class="type-eyebrow text-action-link">Private reflective practice</p>
        <h3 class="mt-2 text-h3 font-semibold text-ink">Therapist Reflection</h3>
        <p class="mt-3 text-body-sm leading-6 text-ink-muted">This belongs to your reflective practice and supervision preparation. It is separate from the client's Clinical Record.</p>
      </div>

      <p v-if="loading" class="mb-4 text-body-sm text-ink-muted">Loading reflection…</p>
      <p v-if="error" class="mb-4 text-body-sm text-state-danger" role="alert">{{ error }}</p>

      <div class="grid grid-cols-1 gap-7" :aria-busy="loading">
        <div v-for="field in reflectionFields" :key="field.key" class="space-y-2">
          <label :for="field.key" class="text-body-sm font-semibold text-ink">{{ field.label }}</label>
          <p class="text-xs leading-5 text-ink-muted">{{ field.prompt }}</p>
          <textarea :id="field.key" v-model="reflection[field.key]" rows="3" :disabled="loading || saving" class="w-full rounded-control border border-border bg-surface p-3 text-body-sm text-ink outline-none transition-all focus:border-action-link focus:ring-2 focus:ring-action-link disabled:opacity-60" :placeholder="field.placeholder"></textarea>
        </div>
      </div>
    </section>

    <section class="rounded-panel border border-border bg-surface-muted p-6" aria-labelledby="reflective-map-title">
      <div class="flex flex-col gap-4 border-b border-border-muted pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div class="max-w-2xl">
          <p class="type-eyebrow text-action-link">Optional mapping</p>
          <h3 id="reflective-map-title" class="mt-2 text-xl font-semibold text-ink">What was happening in you?</h3>
          <p class="mt-2 text-sm leading-6 text-ink-secondary">Map an inner position that became noticeable. Use your own language. Helios does not assign a type or decide what it means.</p>
        </div>
        <span class="shrink-0 rounded-pill border border-border bg-surface-raised px-3 py-1 text-xs font-semibold text-ink-muted">Therapist authored</span>
      </div>

      <div class="mt-6 grid gap-6 md:grid-cols-2">
        <div v-for="field in mapFields" :key="field.key" class="space-y-2">
          <label :for="`map-${field.key}`" class="text-sm font-semibold text-ink">{{ field.label }}</label>
          <p class="text-xs leading-5 text-ink-muted">{{ field.prompt }}</p>
          <textarea :id="`map-${field.key}`" v-model="reflection.reflectiveMap[field.key]" rows="3" :disabled="loading || saving" class="w-full rounded-control border border-border bg-surface-raised p-3 text-sm text-ink outline-none transition-all focus:border-action-link focus:ring-2 focus:ring-action-link disabled:opacity-60" :placeholder="field.placeholder"></textarea>
        </div>
      </div>

      <p class="mt-6 border-t border-border-muted pt-5 text-xs leading-5 text-ink-muted">Mapping is a reflective aid, not an assessment. A recurring response may be useful, protective, constraining, or several of these depending on context. Meaning remains yours to consider and to test in human supervision.</p>
    </section>

    <div class="flex items-center justify-end gap-3">
      <span v-if="savedMessage" class="text-body-sm text-state-success" role="status">{{ savedMessage }}</span>
      <button type="button" :disabled="loading || saving" class="button-primary" @click="save">{{ saving ? 'Saving…' : 'Save private reflection' }}</button>
    </div>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { emptyReflectiveMap, emptyWorkspaceReflection, getPrivateReflection, normalizeWorkspaceReflection, upsertPrivateReflection, workspaceReflectionBody } from '../../lib/reflections.js'

const props = defineProps({ clientId: { type: String, required: true }, sessionId: { type: String, required: true } })

const reflectionFields = [
  { key: 'stoodOut', label: 'What stood out?', prompt: 'Hold onto the moments that seem worth revisiting.', placeholder: 'A moment, shift or interaction that stayed with you…' },
  { key: 'emotionalResponse', label: 'What did you notice in yourself?', prompt: 'Feelings, bodily responses, impulses or changes in attention.', placeholder: 'What you noticed happening in you…' },
  { key: 'countertransference', label: 'What might the relationship have been evoking?', prompt: 'An invitation to wonder, not to reach a conclusion.', placeholder: 'Possible relational responses or pulls…' },
  { key: 'uncertainties', label: 'What remains uncertain?', prompt: 'Questions, tension, stuckness or something you may have missed.', placeholder: 'What you are still wondering about…' },
  { key: 'supervisionQuestions', label: 'What would be useful to take to supervision?', prompt: 'Keep questions open enough to explore with another person.', placeholder: 'A question worth bringing to supervision…' },
  { key: 'nextSession', label: 'What do you want to remember next time?', prompt: 'A light-touch intention rather than a prescription.', placeholder: 'Something to carry into the next meeting…' }
]

const mapFields = [
  { key: 'innerPosition', label: 'Inner position', prompt: 'How would you describe the part of you that was most present?', placeholder: 'e.g. the part wanting to rescue, organise, withdraw, get it right…' },
  { key: 'protectiveIntention', label: 'What was it trying to do?', prompt: 'What might this response have been protecting, preventing or managing?', placeholder: 'It seemed to be trying to…' },
  { key: 'trigger', label: 'What brought it forward?', prompt: 'Notice the situation, interaction or feeling that preceded it.', placeholder: 'It became stronger when…' },
  { key: 'impact', label: 'How did it affect the work?', prompt: 'Consider attention, pace, choices and the therapeutic relationship.', placeholder: 'When it was present, I noticed…' },
  { key: 'spaceCreated', label: 'What created more space?', prompt: 'What helped you become less driven by the response and more able to choose?', placeholder: 'I had more room when…' },
  { key: 'supervisionQuestion', label: 'Question to carry forward', prompt: 'What deserves curiosity rather than a private conclusion?', placeholder: 'I want to stay curious about…' }
]

const reflection = reactive({ ...emptyWorkspaceReflection(), reflectiveMap: emptyReflectiveMap() })
const loading = ref(true)
const saving = ref(false)
const error = ref('')
const savedMessage = ref('')

async function load() {
  loading.value = true
  error.value = ''
  try {
    const record = await getPrivateReflection({ clientId: props.clientId, sessionId: props.sessionId })
    const normalized = normalizeWorkspaceReflection(record?.workspace_content)
    Object.assign(reflection, normalized)
    reflection.reflectiveMap = normalized.reflectiveMap || emptyReflectiveMap()
  } catch (err) {
    console.error('Failed to load private reflection:', err)
    error.value = 'Private reflection could not be loaded.'
  } finally {
    loading.value = false
  }
}

async function save() {
  if (saving.value) return
  saving.value = true
  error.value = ''
  savedMessage.value = ''
  try {
    await upsertPrivateReflection({ clientId: props.clientId, sessionId: props.sessionId, body: workspaceReflectionBody(reflection), workspaceContent: reflection })
    savedMessage.value = 'Private reflection and map saved.'
  } catch (err) {
    console.error('Failed to save private reflection:', err)
    error.value = 'Private reflection could not be saved. Please try again.'
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>
