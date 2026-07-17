<template>
  <main v-if="authLoading" class="min-h-screen bg-slate-100 flex items-center justify-center p-4">
    <p class="text-sm text-slate-500">Opening MindWorks…</p>
  </main>

  <App v-else-if="session" />

  <main v-else class="min-h-screen bg-slate-100 flex items-center justify-center px-4 py-8 sm:p-6">
    <section class="w-full max-w-md rounded-2xl bg-white border border-slate-200 shadow-sm p-6 sm:p-8">
      <h1 class="text-2xl font-semibold text-slate-800">MindWorks</h1>
      <p class="mt-2 text-sm text-slate-500">
        {{ mode === 'signup' ? 'Create your therapist workspace.' : 'Sign in to your therapist workspace.' }}
      </p>

      <div class="mt-6 grid grid-cols-2 rounded-lg bg-slate-100 p-1" role="tablist" aria-label="Account access">
        <button
          type="button"
          class="min-h-11 rounded-md px-3 text-sm font-medium transition"
          :class="mode === 'signin' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'"
          @click="setMode('signin')"
        >
          Sign in
        </button>
        <button
          type="button"
          class="min-h-11 rounded-md px-3 text-sm font-medium transition"
          :class="mode === 'signup' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'"
          @click="setMode('signup')"
        >
          Create account
        </button>
      </div>

      <form class="mt-6 space-y-4" @submit.prevent="submit">
        <label v-if="mode === 'signup'" class="block">
          <span class="text-sm font-medium text-slate-700">Full name</span>
          <input
            v-model.trim="fullName"
            type="text"
            required
            autocomplete="name"
            class="mt-2 min-h-12 w-full rounded-lg border border-slate-300 px-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </label>

        <label class="block">
          <span class="text-sm font-medium text-slate-700">Email address</span>
          <input
            v-model.trim="email"
            type="email"
            required
            autocomplete="email"
            class="mt-2 min-h-12 w-full rounded-lg border border-slate-300 px-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </label>

        <label class="block">
          <span class="text-sm font-medium text-slate-700">Password</span>
          <input
            v-model="password"
            type="password"
            required
            minlength="8"
            :autocomplete="mode === 'signup' ? 'new-password' : 'current-password'"
            class="mt-2 min-h-12 w-full rounded-lg border border-slate-300 px-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
          <span v-if="mode === 'signup'" class="mt-1 block text-xs text-slate-400">At least 8 characters</span>
        </label>

        <button
          type="submit"
          :disabled="submitting"
          class="min-h-12 w-full rounded-lg bg-blue-600 px-4 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {{ submitting ? 'Please wait…' : mode === 'signup' ? 'Create account' : 'Sign in' }}
        </button>
      </form>

      <button
        v-if="mode === 'signin'"
        type="button"
        :disabled="submitting || !email"
        class="mt-4 min-h-11 w-full text-sm font-medium text-blue-600 disabled:text-slate-300"
        @click="resetPassword"
      >
        Forgot your password?
      </button>

      <p v-if="message" class="mt-4 rounded-lg bg-green-50 p-3 text-sm text-green-700">{{ message }}</p>
      <p v-if="errorMessage" class="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{{ errorMessage }}</p>
    </section>
  </main>
</template>

<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import App from './App.vue'
import { supabase } from './lib/supabase.js'

const session = ref(null)
const authLoading = ref(true)
const mode = ref('signin')
const fullName = ref('')
const email = ref('')
const password = ref('')
const submitting = ref(false)
const message = ref('')
const errorMessage = ref('')
let authSubscription

onMounted(async () => {
  if (!supabase) {
    errorMessage.value = 'MindWorks authentication is not configured.'
    authLoading.value = false
    return
  }

  const { data, error } = await supabase.auth.getSession()
  if (error) errorMessage.value = error.message
  session.value = data.session
  authLoading.value = false

  const listener = supabase.auth.onAuthStateChange((_event, nextSession) => {
    session.value = nextSession
    authLoading.value = false
  })
  authSubscription = listener.data.subscription
})

onUnmounted(() => authSubscription?.unsubscribe())

const clearFeedback = () => {
  message.value = ''
  errorMessage.value = ''
}

const setMode = (nextMode) => {
  mode.value = nextMode
  password.value = ''
  clearFeedback()
}

const submit = async () => {
  submitting.value = true
  clearFeedback()

  try {
    if (mode.value === 'signup') {
      const { data, error } = await supabase.auth.signUp({
        email: email.value,
        password: password.value,
        options: {
          emailRedirectTo: 'https://helio-therapist.vercel.app',
          data: { full_name: fullName.value }
        }
      })
      if (error) throw error

      if (!data.session) {
        message.value = 'Account created. Check your email to verify your address, then sign in.'
        mode.value = 'signin'
        password.value = ''
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.value,
        password: password.value
      })
      if (error) throw error
    }
  } catch (error) {
    errorMessage.value = error.message
  } finally {
    submitting.value = false
  }
}

const resetPassword = async () => {
  submitting.value = true
  clearFeedback()

  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email.value, {
      redirectTo: 'https://helio-therapist.vercel.app'
    })
    if (error) throw error
    message.value = 'Check your email for the password reset link.'
  } catch (error) {
    errorMessage.value = error.message
  } finally {
    submitting.value = false
  }
}
</script>
