<template>
  <TherapistQuizView :save-to-library="saveToLibrary" report-endpoint="" @open-library="openLibrary" />
</template>
<script setup>
import { inject } from 'vue'
import { useRouter } from 'vue-router'
import TherapistQuizView from '../TherapistQuizView.vue'
import { saveStanceReflection } from '../../lib/stanceReflections.js'
// The layout's unrelated reflection-list props must not enter this exercise.
defineOptions({ inheritAttrs: false })
const router = useRouter()
const refreshLibrary = inject('loadData', null)
async function saveToLibrary(snapshot) {
  const saved = await saveStanceReflection({ snapshot })
  try { await refreshLibrary?.() } catch { /* Do not turn a confirmed save into an error. */ }
  return saved
}
function openLibrary() { router.push('/supervision/reflections') }
</script>
