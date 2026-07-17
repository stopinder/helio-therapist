<template>
  <App v-if="session" />

  <main v-else class="min-h-screen bg-slate-100 flex items-center justify-center p-6">
    <section class="w-full max-w-md rounded-2xl bg-white border border-slate-200 shadow-sm p-8">
      <h1 class="text-2xl font-semibold text-slate-800">MindWorks</h1>
      <p class="mt-2 text-sm text-slate-500">Sign in to your therapist workspace.</p>

      <form class="mt-8 space-y-4" @submit.prevent="sendMagicLink">
        <label class="block">
          <span class="text-sm font-medium text-slate-700">Email address</span>
          <input
            v-model.trim="email"
            type="email"
            required
            autocomplete="email"
            class="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-500"
          />
        </label>

        <button
          type="submit"
          :disabled="sending"
          class="w-full rounded-lg bg-blue-600 px-4 py-2.5 font-medium text-white disabled:opacity-50"
        >
          {{ sending ? 'Sending…' : 'Email me a sign-in link' }}
        </button>
      </form>

      <p v-if="message" class="mt-4 text-sm text-green-700">{{ message }}</p>
      <p v-if="errorMessage" class="mt-4 text-sm text-red-700">{{ errorMessage }}</p>
    </section>
  </main>
</template>

<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import App from './App.vue'
import { supabase } from './lib/supabase.js'

const session = ref(null)
const email = ref('')
const sending = ref(false)
const message = ref('')
const errorMessage = ref('')
let authSubscription

onMounted(async () => {
  if (!supabase) {
    errorMessage.value = 'Supabase browser configuration is missing.'
    return
  }

  const { data } = await supabase.auth.getSession()
  session.value = data.session

  const listener = supabase.auth.onAuthStateChange((_event, nextSession) => {
    session.value = nextSession
  })
  authSubscription = listener.data.subscription
})

onUnmounted(() => {
  authSubscription?.unsubscribe()
})

const sendMagicLink = async () => {
  sending.value = true
  message.value = ''
  errorMessage.value = ''

  try {
    const { error } = await supabase.auth.signInWithOtp({
      email: email.value,
      options: {
        emailRedirectTo: 'https://helio-therapist.vercel.app',
        shouldCreateUser: false
      }
    })
    if (error) throw error
    message.value = 'Check your email for the secure sign-in link.'
  } catch (error) {
    errorMessage.value = error.message
  } finally {
    sending.value = false
  }
}
</script>
