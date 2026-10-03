<template>
  <main class="page">
    <section class="card">
      <template v-if="loading">
        <p class="loading">Opening your form…</p>
      </template>

      <template v-else-if="submitted">
        <p class="eyebrow">Submitted</p>
        <h1>Thank you</h1>
        <p>Your response has been securely returned to your therapist for review.</p>
      </template>

      <template v-else-if="error">
        <p class="eyebrow">Helios</p>
        <h1>This item is unavailable</h1>
        <p>{{ error }}</p>
      </template>

      <template v-else>
        <header class="form-header">
          <p class="eyebrow">Helios · Secure client form</p>
          <h1>{{ assignment.title }}</h1>
          <p v-if="assignment.description" class="description">{{ assignment.description }}</p>
          <p v-if="assignment.instruction" class="instruction"><strong>Your therapist asks:</strong> {{ assignment.instruction }}</p>
        </header>

        <form @submit.prevent="submit">
          <ResourceFormRenderer v-model="answers" :definition="assignment.formDefinition" :errors="fieldErrors" />

          <section v-if="needsUrgentSupport" class="urgent" role="alert">
            <strong>Please do not wait for your therapist to review this form.</strong>
            <p>If you feel you might harm yourself, or cannot stay safe, contact local emergency services now, go to the nearest emergency department, or contact a crisis service in your country. If you are in immediate danger, call your local emergency number.</p>
            <p>You can still submit this questionnaire, but it is not monitored as an emergency service.</p>
          </section>

          <p v-if="submitError" class="error">{{ submitError }}</p>
          <button class="submit" :disabled="submitting" type="submit">{{ submitting ? 'Sending securely…' : 'Send to therapist' }}</button>
          <p class="privacy-note">Only this form is available through this link. It does not open your wider client record.</p>
        </form>
      </template>
    </section>
  </main>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import ResourceFormRenderer from './resources/ResourceFormRenderer.vue'
import { safetyNoticeTriggered, validateStructuredAnswers } from '../lib/resourceForms.js'

const token = new URLSearchParams(window.location.search).get('token') || ''
const loading = ref(true)
const error = ref('')
const assignment = ref(null)
const answers = ref({})
const fieldErrors = ref({})
const submitting = ref(false)
const submitError = ref('')
const submitted = ref(false)

const needsUrgentSupport = computed(() => safetyNoticeTriggered(assignment.value?.formDefinition, answers.value))

async function json(response) {
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const cause = new Error(data.error || 'Unable to open this item.')
    cause.fieldErrors = data.fieldErrors || {}
    throw cause
  }
  return data
}

onMounted(async () => {
  try {
    assignment.value = (await json(await fetch(`/api/client-completion?token=${encodeURIComponent(token)}`))).assignment
  } catch (cause) {
    error.value = cause.message
  } finally {
    loading.value = false
  }
})

async function submit() {
  submitError.value = ''
  const validation = validateStructuredAnswers(assignment.value?.formDefinition, answers.value)
  fieldErrors.value = validation.errors
  if (!validation.valid) {
    submitError.value = 'Please complete the highlighted questions before sending.'
    return
  }

  submitting.value = true
  try {
    await json(await fetch('/api/client-completion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, answers: answers.value })
    }))
    submitted.value = true
    window.scrollTo({ top: 0, behavior: 'smooth' })
  } catch (cause) {
    fieldErrors.value = cause.fieldErrors || {}
    submitError.value = cause.message
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.page{min-height:100vh;background:linear-gradient(180deg,#f3f0e7 0%,#eef1eb 100%);padding:2rem 1.2rem;display:flex;justify-content:center}.card{width:min(46rem,100%);height:max-content;background:#fffdf8;border:1px solid #dde4dc;border-radius:1.4rem;padding:clamp(1.25rem,4vw,2.2rem);color:#294649;box-shadow:0 24px 70px rgb(46 65 57 / .08)}.loading{color:#6f7a73}.eyebrow{margin:0;color:#9a7358;text-transform:uppercase;letter-spacing:.13em;font-size:.68rem;font-weight:800}.form-header{padding-bottom:1.25rem;border-bottom:1px solid #e3e7e1;margin-bottom:1.15rem}.form-header h1,.card>h1{margin:.45rem 0 .65rem;font-family:Georgia,serif;font-size:clamp(2rem,6vw,2.8rem);line-height:1.05;font-weight:400;color:#284548}.description,.card>p{line-height:1.65;color:#68746e}.instruction{margin-top:1rem;padding:.9rem 1rem;border-radius:.85rem;background:#edf2ec;border:1px solid #d7e1d8;color:#52665f}.submit{width:100%;min-height:3.25rem;border:0;border-radius:999px;background:#284f49;color:#fffaf2;font:inherit;font-weight:750;margin-top:1rem;box-shadow:0 8px 24px rgb(40 79 73 / .14)}.submit:hover{background:#21443f}.submit:disabled{opacity:.6}.error,.urgent{margin-top:1rem;padding:.9rem 1rem;border-radius:.85rem}.error{background:#f8e9e7;color:#9f3e37}.urgent{background:#fff5df;border:1px solid #e6c97b;color:#76581c;line-height:1.5}.urgent p{margin:.55rem 0 0}.privacy-note{text-align:center;margin:.8rem 0 0;color:#8a938d;font-size:.72rem;line-height:1.45}@media(max-width:560px){.page{padding:0;background:#fffdf8}.card{border:0;border-radius:0;box-shadow:none;padding:1.15rem;min-height:100vh}}
</style>
