<template>
  <div data-testid="cpd-practice-reflection">
    <p v-if="loading" class="p-6 text-ink-muted" role="status">Opening your private practice reflection…</p>
    <div v-else-if="authError" class="p-6 space-y-4">
      <p class="text-state-danger" role="alert">Your therapist account could not be confirmed. No reflection has been saved.</p>
      <button type="button" class="button-secondary" @click="checkAccount">Try again</button>
      <router-link class="ml-4 text-action-link underline" to="/sign-in">Sign in</router-link>
    </div>
    <TherapistQuizView v-else-if="ownerId" :key="ownerId" :save-to-library="saveToLibrary" report-endpoint="" @open-library="openLibrary" />
  </div>
</template>

<script setup>
import { inject, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../../lib/supabase.js'
import { savePracticeReflection } from '../../lib/practiceReflectionLibrary.js'
import TherapistQuizView from '../TherapistQuizView.vue'

const router = useRouter()
const reloadLibrary = inject('loadData', null)
const ownerId = ref('')
const loading = ref(true)
const authError = ref(false)
async function checkAccount() {
  loading.value = true
  authError.value = false
  try {
    const { data, error } = await supabase.auth.getUser()
    if (error || !data?.user?.id) throw new Error('Authentication unavailable')
    ownerId.value = data.user.id
  } catch { authError.value = true }
  finally { loading.value = false }
}
async function saveToLibrary(snapshot) {
  // A refreshed identity must match the account in which this exercise began.
  const saved = await savePracticeReflection({ snapshot, supabaseClient: supabase, expectedUserId: ownerId.value })
  // The insert has already been confirmed. Refresh failure must not report a false save failure.
  try { if (reloadLibrary) await reloadLibrary() } catch { /* Library can be reloaded on navigation. */ }
  return saved
}
function openLibrary() { router.push('/supervision/reflections') }
onMounted(checkAccount)
</script>
