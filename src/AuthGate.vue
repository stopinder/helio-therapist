<template>
  <main v-if="authLoading" class="min-h-screen bg-surface-muted flex items-center justify-center p-4">
    <p class="text-body text-ink-muted">Opening MindWorks…</p>
  </main>

  <main v-else-if="recovering" class="min-h-screen bg-surface-muted flex items-center justify-center px-4 py-8 sm:p-6">
    <section class="w-full max-w-md rounded-panel bg-surface-elevated border border-border-muted  p-6 sm:p-8">
      <h1 class="text-h1 font-semibold text-ink">Choose a new password</h1>
      <p class="mt-2 text-body text-ink-muted">Use at least 8 characters.</p>
      <form class="mt-6 space-y-4" @submit.prevent="updatePassword">
        <div class="relative">
          <input
            id="recovery-password"
            v-model="newPassword"
            :type="showNewPassword ? 'text' : 'password'"
            name="recovery-password"
            required
            minlength="8"
            autocomplete="off"
            autocapitalize="none"
            spellcheck="false"
            aria-label="New password"
            class="min-h-12 w-full rounded-panel border border-border px-3 pr-16 text-ink caret-action-link outline-none focus:border-action-link focus:ring-2 focus:ring-state-selected"
          />
          <button
            type="button"
            class="absolute inset-y-0 right-0 min-w-14 px-3 text-body font-medium text-action-link"
            @click="showNewPassword = !showNewPassword"
          >
            {{ showNewPassword ? 'Hide' : 'Show' }}
          </button>
        </div>
        <button type="submit" :disabled="submitting" class="min-h-12 w-full rounded-panel bg-action-link px-4 font-medium text-on-action disabled:opacity-50">
          {{ submitting ? 'Saving…' : 'Save new password' }}
        </button>
      </form>
      <p v-if="errorMessage" class="mt-4 rounded-panel bg-state-danger-surface p-3 text-body text-state-danger">{{ errorMessage }}</p>
    </section>
  </main>

  <ClientCompletion v-else-if="isClientCompletion" />

  <App v-else-if="session" />

  <main v-else class="min-h-screen bg-surface-muted flex items-center justify-center px-4 py-8 sm:p-6">
    <section class="w-full max-w-md rounded-panel bg-surface-elevated border border-border-muted  p-6 sm:p-8">
      <h1 class="text-h1 font-semibold text-ink">MindWorks</h1>
      <p class="mt-2 text-body text-ink-muted">
        {{ mode === 'signup' ? 'Create your therapist workspace.' : 'Sign in to your therapist workspace.' }}
      </p>

      <div class="mt-6 grid grid-cols-2 rounded-panel bg-surface-muted p-1" role="tablist" aria-label="Account access">
        <button
          type="button"
          class="min-h-11 rounded-control px-3 text-body font-medium transition-colors duration-standard ease-out"
          :class="mode === 'signin' ? 'bg-surface-elevated text-ink ' : 'text-ink-muted'"
          @click="setMode('signin')"
        >
          Sign in
        </button>
        <button
          type="button"
          class="min-h-11 rounded-control px-3 text-body font-medium transition-colors duration-standard ease-out"
          :class="mode === 'signup' ? 'bg-surface-elevated text-ink ' : 'text-ink-muted'"
          @click="setMode('signup')"
        >
          Create account
        </button>
      </div>

      <form class="mt-6 space-y-4" @submit.prevent="submit">
        <label v-if="mode === 'signup'" class="block">
          <span class="text-body font-medium text-ink-secondary">Full name</span>
          <input
            v-model.trim="fullName"
            type="text"
            required
            autocomplete="name"
            class="mt-2 min-h-12 w-full rounded-panel border border-border bg-surface-elevated px-3 text-ink caret-action-link outline-none focus:border-action-link focus:ring-2 focus:ring-state-selected"
          />
        </label>

        <label class="block">
          <span class="text-body font-medium text-ink-secondary">Email address</span>
          <input
            v-model.trim="email"
            type="email"
            required
            autocomplete="email"
            class="mt-2 min-h-12 w-full rounded-panel border border-border bg-surface-elevated px-3 text-ink caret-action-link outline-none focus:border-action-link focus:ring-2 focus:ring-state-selected"
          />
        </label>

        <label class="block">
          <span class="text-body font-medium text-ink-secondary">Password</span>
          <div class="relative mt-2">
            <input
              id="account-password"
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              name="account-password"
              required
              minlength="8"
              autocomplete="off"
              autocapitalize="none"
              spellcheck="false"
              class="min-h-12 w-full rounded-panel border border-border px-3 pr-16 text-ink caret-action-link outline-none focus:border-action-link focus:ring-2 focus:ring-state-selected"
            />
            <button
              type="button"
              class="absolute inset-y-0 right-0 min-w-14 px-3 text-body font-medium text-action-link"
              @click="showPassword = !showPassword"
            >
              {{ showPassword ? 'Hide' : 'Show' }}
            </button>
          </div>
          <span v-if="mode === 'signup'" class="mt-1 block text-caption text-ink-subtle">At least 8 characters</span>
        </label>

        <button
          type="submit"
          :disabled="submitting"
          class="min-h-12 w-full rounded-panel bg-action-link px-4 font-medium text-on-action hover:bg-action-link-hover disabled:opacity-50"
        >
          {{ submitting ? 'Please wait…' : mode === 'signup' ? 'Create account' : 'Sign in' }}
        </button>
      </form>

      <button
        v-if="mode === 'signin'"
        type="button"
        :disabled="submitting || !email"
        class="mt-4 min-h-11 w-full text-body font-medium text-action-link disabled:text-ink-subtle"
        @click="resetPassword"
      >
        Forgot your password?
      </button>

      <p v-if="message" class="mt-4 rounded-panel bg-state-success-surface p-3 text-body text-state-success">{{ message }}</p>
      <p v-if="errorMessage" class="mt-4 rounded-panel bg-state-danger-surface p-3 text-body text-state-danger">{{ errorMessage }}</p>
    </section>
  </main>
</template>

<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import App from './App.vue'
import ClientCompletion from './components/ClientCompletion.vue'
import { supabase } from './lib/supabase.js'

const session = ref(null)
const isClientCompletion = window.location.pathname === '/complete'
const authLoading = ref(true)
const recovering = ref(false)
const newPassword = ref('')
const showNewPassword = ref(false)
const mode = ref('signin')
const fullName = ref('')
const email = ref('')
const password = ref('')
const showPassword = ref(false)
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

  const listener = supabase.auth.onAuthStateChange((event, nextSession) => {
    if (event === 'PASSWORD_RECOVERY') recovering.value = true
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
  showPassword.value = false
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

const updatePassword = async () => {
  submitting.value = true
  clearFeedback()

  try {
    const { error } = await supabase.auth.updateUser({ password: newPassword.value })
    if (error) throw error
    recovering.value = false
    window.history.replaceState({}, document.title, window.location.pathname)
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
