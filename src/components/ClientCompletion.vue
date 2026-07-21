<template>
  <main class="page"><section class="card">
    <p v-if="loading">Opening your questionnaire…</p>
    <template v-else-if="submitted"><p class="eyebrow">Submitted</p><h1>Thank you</h1><p>Your response has been sent to your therapist for review.</p></template>
    <template v-else-if="error"><h1>This item is unavailable</h1><p>{{ error }}</p></template>
    <template v-else><p class="eyebrow">Helio</p><h1>{{ assignment.title }}</h1><p v-if="assignment.description">{{ assignment.description }}</p><p v-if="assignment.instruction" class="instruction"><strong>Your therapist asks:</strong> {{ assignment.instruction }}</p><form @submit.prevent="submit"><p class="period">Over the last two weeks, how often have you been bothered by any of the following problems?</p><fieldset v-for="(item, index) in phq9Items" :key="index"><legend>{{ index + 1 }}. {{ item }}</legend><label v-for="[value, label] in phq9Choices" :key="value"><input v-model="answers[`q${index + 1}`]" type="radio" :name="`q${index + 1}`" :value="value" required /> {{ label }}</label></fieldset><p v-if="submitError" class="error">{{ submitError }}</p><button :disabled="submitting" type="submit">{{ submitting ? 'Submitting…' : 'Submit to therapist' }}</button></form></template>
  </section></main>
</template>
<script setup>
import { onMounted, ref } from 'vue'
import { phq9Choices, phq9Items } from '../lib/phq9.js'
const token = new URLSearchParams(window.location.search).get('token') || ''
const loading = ref(true), error = ref(''), assignment = ref(null), answers = ref({}), submitting = ref(false), submitError = ref(''), submitted = ref(false)
async function json(response) { const data = await response.json().catch(() => ({})); if (!response.ok) throw new Error(data.error || 'Unable to open this item.'); return data }
onMounted(async () => { try { assignment.value = (await json(await fetch(`/api/client-completion?token=${encodeURIComponent(token)}`))).assignment } catch (cause) { error.value = cause.message } finally { loading.value = false } })
async function submit() { submitting.value = true; submitError.value = ''; try { await json(await fetch('/api/client-completion', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, answers: answers.value }) })); submitted.value = true } catch (cause) { submitError.value = cause.message } finally { submitting.value = false } }
</script>
<style scoped>
.page{min-height:100vh;background:#f4f7fb;padding:1.25rem;display:flex;justify-content:center}.card{width:min(42rem,100%);height:max-content;background:white;border:1px solid #dbe1e8;border-radius:1rem;padding:1.4rem;color:#243447}.eyebrow{margin:0;color:#64748b;text-transform:uppercase;letter-spacing:.08em;font-size:.72rem;font-weight:750}.card h1{margin:.35rem 0 .65rem;font-size:1.55rem}.card>p{line-height:1.55;color:#526274}.instruction{padding:.8rem;border-radius:.6rem;background:#f8fbff;border:1px solid #dbeafe}.period{font-size:.9rem;color:#526274}fieldset{margin:1rem 0;padding:1rem;border:1px solid #dbe1e8;border-radius:.7rem}legend{font-weight:700;line-height:1.4;padding:0 .25rem}label{display:block;padding:.65rem .25rem;border-top:1px solid #edf0f4;font-size:.95rem}label:first-of-type{margin-top:.6rem}input{margin-right:.45rem}button{width:100%;min-height:3rem;border:0;border-radius:.65rem;background:#2563eb;color:white;font:inherit;font-weight:700;margin-top:.5rem}.error{background:#fef2f2;color:#b91c1c;padding:.8rem;border-radius:.6rem}@media(max-width:500px){.page{padding:0}.card{border-radius:0;border:0;padding:1.2rem}fieldset{padding:.85rem}label{padding:.8rem .25rem}}
</style>
