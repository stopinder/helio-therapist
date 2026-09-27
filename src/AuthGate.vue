<template>
  <main v-if="recovering" class="min-h-screen bg-surface-muted flex items-center justify-center px-4 py-8 sm:p-6">
    <section class="w-full max-w-md rounded-panel bg-surface-elevated border border-border-muted p-6 sm:p-8">
      <h1 class="text-h1 font-semibold text-ink">Choose a new password</h1>
      <p class="mt-2 text-body text-ink-muted">Use at least 8 characters.</p>
      <form class="mt-6 space-y-4" @submit.prevent="updatePassword">
        <div class="relative">
          <input id="recovery-password" v-model="newPassword" :type="showNewPassword ? 'text' : 'password'" name="recovery-password" required minlength="8" autocomplete="new-password" autocapitalize="none" spellcheck="false" aria-label="New password" class="min-h-12 w-full rounded-panel border border-border px-3 pr-16 text-ink caret-action-link outline-none focus:border-action-link focus:ring-2 focus:ring-state-selected" />
          <button type="button" class="absolute inset-y-0 right-0 min-w-14 px-3 text-body font-medium text-action-link" @click="showNewPassword = !showNewPassword">{{ showNewPassword ? 'Hide' : 'Show' }}</button>
        </div>
        <button type="submit" :disabled="submitting" class="min-h-12 w-full rounded-panel bg-action-link px-4 font-medium text-on-action disabled:opacity-50">{{ submitting ? 'Saving…' : 'Save new password' }}</button>
      </form>
      <p v-if="errorMessage" class="mt-4 rounded-panel bg-state-danger-surface p-3 text-body text-state-danger">{{ errorMessage }}</p>
    </section>
  </main>

  <router-view v-else-if="route.meta.public" />

  <main v-else-if="!supabase" class="min-h-screen bg-state-danger-surface flex items-center justify-center p-4">
    <div class="max-w-md w-full rounded-panel bg-surface p-6 border border-state-danger/20 text-center">
      <h1 class="text-h2 font-semibold text-state-danger mb-2">Configuration Error</h1>
      <p class="text-ink-secondary">Supabase URL or Anon Key is missing. Check your .env file.</p>
    </div>
  </main>

  <main v-else-if="authLoading" class="min-h-screen bg-surface-muted flex items-center justify-center p-4">
    <p class="text-body text-ink-muted">Opening Helios…</p>
  </main>

  <main v-else-if="session && billingLoading && !signInTransition" class="min-h-screen bg-surface-muted flex items-center justify-center p-4">
    <p class="text-body text-ink-muted">Opening Helios…</p>
  </main>

  <main v-else-if="session && !billingLoading && !billingAllowed" class="min-h-screen bg-surface-muted flex items-center justify-center px-4 py-8">
    <section class="w-full max-w-md rounded-panel bg-surface-elevated border border-border-muted p-6 sm:p-8">
      <h1 class="text-h1 font-semibold text-ink">{{ billingError ? 'Unable to verify subscription' : 'Start your Helios trial' }}</h1>
        <p v-if="billingError" class="mt-4 text-body text-state-danger" role="alert">{{ billingError }}</p>
        <template v-else>
          <p class="mt-3 text-body text-ink-muted">30 days free, then £29/month. Stripe collects your payment method when you start the trial. Cancel anytime.</p>
          <p v-if="route.query.billing === 'success'" class="mt-4 text-body text-ink-muted" role="status">Your checkout is complete. Your subscription may take a moment to appear. Check again to enter Helios.</p>
          <p v-if="route.query.billing === 'cancelled'" class="mt-4 text-body text-ink-muted">Checkout was cancelled. You can start your trial when you’re ready.</p>
          <button v-if="route.query.billing !== 'success'" type="button" :disabled="billingBusy" class="mt-6 min-h-12 w-full rounded-panel bg-action-link px-4 font-medium text-on-action disabled:opacity-50" @click="openBilling">{{ billingBusy ? 'Opening billing…' : billingSubscription ? 'Manage subscription' : 'Start 30-day free trial' }}</button>
        </template>
        <button type="button" :disabled="billingBusy" class="mt-3 min-h-11 w-full text-body font-medium text-action-link disabled:opacity-50" @click="checkBilling">Check subscription again</button>
        <button type="button" class="mt-2 min-h-11 w-full text-body text-ink-muted" @click="supabase.auth.signOut()">Sign out</button>
    </section>
  </main>

  <AppShell v-else-if="session && !billingLoading" data-testid="workspace-shell"><router-view /></AppShell>

  <main v-else data-testid="login-page" class="min-h-screen bg-surface-muted flex items-center justify-center px-4 py-8 sm:p-6">
    <section class="w-full max-w-md rounded-panel bg-surface-elevated border border-border-muted p-6 sm:p-8">
      <router-link to="/" class="type-ui text-action-link">← Helios home</router-link>
      <h1 class="mt-5 text-h1 font-semibold text-ink">Helios</h1>
      <p class="mt-2 text-body text-ink-muted">{{ mode === 'signup' ? 'Create your therapist workspace.' : 'Sign in to your therapist workspace.' }}</p>

      <div class="mt-6 grid grid-cols-2 rounded-panel bg-surface-muted p-1" role="tablist" aria-label="Account access">
        <router-link to="/sign-in" class="min-h-11 rounded-control px-3 text-body font-medium flex items-center justify-center transition-colors duration-standard ease-out" :class="mode === 'signin' ? 'bg-surface-elevated text-ink' : 'text-ink-muted'">Sign in</router-link>
        <router-link to="/get-started" class="min-h-11 rounded-control px-3 text-body font-medium flex items-center justify-center transition-colors duration-standard ease-out" :class="mode === 'signup' ? 'bg-surface-elevated text-ink' : 'text-ink-muted'">Create account</router-link>
      </div>

      <form class="mt-6 space-y-4" @submit.prevent="submit">
        <label v-if="mode === 'signup'" class="block">
          <span class="text-body font-medium text-ink-secondary">Full name</span>
          <input v-model.trim="fullName" type="text" required autocomplete="name" class="mt-2 min-h-12 w-full rounded-panel border border-border bg-surface-elevated px-3 text-ink caret-action-link outline-none focus:border-action-link focus:ring-2 focus:ring-state-selected" />
        </label>

        <label class="block">
          <span class="text-body font-medium text-ink-secondary">Email address</span>
          <input v-model.trim="email" type="email" required autocomplete="email" class="mt-2 min-h-12 w-full rounded-panel border border-border bg-surface-elevated px-3 text-ink caret-action-link outline-none focus:border-action-link focus:ring-2 focus:ring-state-selected" />
        </label>

        <label class="block">
          <span class="text-body font-medium text-ink-secondary">Password</span>
          <div class="relative mt-2">
            <input id="account-password" v-model="password" :type="showPassword ? 'text' : 'password'" name="account-password" required minlength="8" :autocomplete="mode === 'signup' ? 'new-password' : 'current-password'" autocapitalize="none" spellcheck="false" class="min-h-12 w-full rounded-panel border border-border px-3 pr-16 text-ink caret-action-link outline-none focus:border-action-link focus:ring-2 focus:ring-state-selected" />
            <button type="button" class="absolute inset-y-0 right-0 min-w-14 px-3 text-body font-medium text-action-link" @click="showPassword = !showPassword">{{ showPassword ? 'Hide' : 'Show' }}</button>
          </div>
          <span v-if="mode === 'signup'" class="mt-1 block text-caption text-ink-subtle">At least 8 characters</span>
        </label>

        <label v-if="mode === 'signup'" class="flex items-start gap-3 rounded-panel border border-border-muted bg-surface-muted p-3">
          <input v-model="marketingEmailConsent" type="checkbox" class="mt-1 h-4 w-4 rounded border-border text-action-link focus:ring-action-link" />
          <span class="text-caption leading-5 text-ink-muted">Send me occasional Helios product updates, practical tips and news. You can unsubscribe at any time.</span>
        </label>

        <p v-if="mode === 'signup'" class="text-caption leading-5 text-ink-muted">
          Before creating an account, please review the
          <router-link to="/terms" class="font-medium text-action-link underline underline-offset-2">Terms of Service</router-link>
          and
          <router-link to="/privacy" class="font-medium text-action-link underline underline-offset-2">Privacy Notice</router-link>.
        </p>

        <button type="submit" :disabled="submitting || signInTransition" class="min-h-12 w-full rounded-panel bg-action-link px-4 font-medium text-on-action hover:bg-action-link-hover disabled:opacity-50">{{ signInTransition ? 'Opening Helios…' : submitting ? 'Please wait…' : mode === 'signup' ? 'Create account' : 'Sign in' }}</button>
      </form>

      <button v-if="mode === 'signin'" type="button" :disabled="submitting || !email" class="mt-4 min-h-11 w-full text-body font-medium text-action-link disabled:text-ink-subtle" @click="resetPassword">Forgot your password?</button>

      <p v-if="message" class="mt-4 rounded-panel bg-state-success-surface p-3 text-body text-state-success">{{ message }}</p>
      <p v-if="errorMessage" class="mt-4 rounded-panel bg-state-danger-surface p-3 text-body text-state-danger">{{ errorMessage }}</p>
    </section>
  </main>
</template>

<script setup>
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppShell from './layouts/AppShell.vue'
import { supabase } from './lib/supabase.js'

const route = useRoute()
const router = useRouter()
const session = ref(null)
const authLoading = ref(true)
const recovering = ref(false)
const newPassword = ref('')
const showNewPassword = ref(false)
const mode = ref(route.meta.authEntry === 'signup' ? 'signup' : 'signin')
const fullName = ref('')
const email = ref('')
const password = ref('')
const marketingEmailConsent = ref(false)
const showPassword = ref(false)
const submitting = ref(false)
const signInTransition = ref(false)
const message = ref('')
const errorMessage = ref('')
const billingLoading = ref(true)
const billingAllowed = ref(false)
const billingSubscription = ref(null)
const billingBusy = ref(false)
const billingError = ref('')
let authSubscription
let billingRequest = 0
const handleExpiryRef = ref(null)

const isRecoveryLink = () => {
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''))
  const queryParams = new URLSearchParams(window.location.search)
  return hashParams.get('type') === 'recovery' || queryParams.get('type') === 'recovery'
}

const clearFeedback = () => {
  message.value = ''
  errorMessage.value = ''
}

const syncAuthEntry = async () => {
  if (!route.meta.authEntry) return
  mode.value = route.meta.authEntry
  password.value = ''
  showPassword.value = false
  if (!errorMessage.value.includes('expired')) clearFeedback()
  if (!authLoading.value && session.value) await router.replace('/overview')
}

watch(() => route.fullPath, syncAuthEntry)
watch([session, authLoading], async () => {
  if (!authLoading.value && session.value && route.meta.authEntry) await router.replace('/overview')
})

const checkBilling = async () => {
  const token = session.value?.access_token
  if (!token) return
  const request = ++billingRequest
  billingLoading.value = !billingAllowed.value
  billingError.value = ''
  try {
    const response = await fetch('/api/billing/status', { headers: { Authorization: `Bearer ${token}` } })
    const data = await response.json()
    if (request !== billingRequest) return
    if (!response.ok) throw new Error(data.error || 'Unable to check subscription')
    billingSubscription.value = data.subscription
    billingAllowed.value = data.hasWorkspaceAccess === true
  } catch (error) {
    if (request !== billingRequest) return
    billingError.value = 'Unable to verify your subscription. Please check again.'
  } finally {
    if (request === billingRequest) {
      billingLoading.value = false
      signInTransition.value = false
    }
  }
}

watch(session, (nextSession, previousSession) => {
  if (nextSession?.user?.id && nextSession.user.id === previousSession?.user?.id) {
    if (nextSession.access_token !== previousSession.access_token) checkBilling()
    return
  }
  ++billingRequest
  billingAllowed.value = false
  billingError.value = ''
  billingSubscription.value = null
  if (nextSession) checkBilling()
  else {
    billingLoading.value = true
    signInTransition.value = false
  }
})

const openBilling = async () => {
  if (billingBusy.value || billingError.value) return
  billingBusy.value = true
  try {
    const response = await fetch(billingSubscription.value ? '/api/billing/portal' : '/api/billing/checkout', { method: 'POST', headers: { Authorization: `Bearer ${session.value.access_token}` } })
    const data = await response.json()
    if (!response.ok || !data.url) throw new Error(data.error || 'Unable to open Stripe checkout')
    window.location.assign(data.url)
  } catch (error) {
    billingError.value = error.message || 'Unable to open Stripe checkout'
    billingBusy.value = false
  }
}

const notifySignup = async (accessToken) => {
  if (!accessToken) return
  try {
    await fetch('/api/signup/welcome', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` }
    })
  } catch (error) {
    console.warn('[Signup welcome] notification unavailable', error)
  }
}

onMounted(async () => {
  recovering.value = isRecoveryLink()
  if (!supabase) {
    errorMessage.value = 'Helios authentication is not configured.'
    authLoading.value = false
    return
  }

  const listener = supabase.auth.onAuthStateChange((event, nextSession) => {
    if (event === 'PASSWORD_RECOVERY') {
      recovering.value = true
      clearFeedback()
    }
    if (event === 'SIGNED_IN' && nextSession?.access_token) {
      notifySignup(nextSession.access_token)
    }
    if (event === 'SIGNED_OUT') {
      const currentError = errorMessage.value
      clearFeedback()
      if (currentError && currentError.includes('expired')) errorMessage.value = currentError
      if (!isRecoveryLink()) recovering.value = false
    }
    session.value = nextSession
    authLoading.value = false
  })
  authSubscription = listener.data.subscription

  const { data, error } = await supabase.auth.getSession()
  if (error) errorMessage.value = error.message
  session.value = data.session
  authLoading.value = false

  handleExpiryRef.value = async (event) => {
    errorMessage.value = event.detail.message
    session.value = null
    await router.replace('/sign-in')
  }
  window.addEventListener('helios-session-expired', handleExpiryRef.value)
})

onUnmounted(() => {
  authSubscription?.unsubscribe()
  if (handleExpiryRef.value) window.removeEventListener('helios-session-expired', handleExpiryRef.value)
})

const submit = async () => {
  submitting.value = true
  if (mode.value === 'signin') signInTransition.value = true
  clearFeedback()
  try {
    if (mode.value === 'signup') {
      const { data, error } = await supabase.auth.signUp({
        email: email.value,
        password: password.value,
        options: {
          emailRedirectTo: 'https://helio.works/sign-in',
          data: { full_name: fullName.value, marketing_email_consent: marketingEmailConsent.value }
        }
      })
      if (error) throw error
      if (!data.session) {
        password.value = ''
        marketingEmailConsent.value = false
        await router.replace('/sign-in')
        message.value = 'If this email can be used to create an account, you’ll receive a confirmation link. Check your inbox before signing in. If you already have a Helios account, use your existing password or reset it below.'
      }
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({ email: email.value, password: password.value })
      if (error) {
        throw new Error('Email or password is incorrect. If you just created an account, confirm your email before signing in. You can also reset your password below.')
      }
    }
  } catch (error) {
    errorMessage.value = error.message
    signInTransition.value = false
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
    const { error: signOutError } = await supabase.auth.signOut()
    if (signOutError) throw signOutError
    session.value = null
    recovering.value = false
    newPassword.value = ''
    email.value = ''
    password.value = ''
    window.history.replaceState({}, document.title, '/sign-in')
    await router.replace('/sign-in')
    message.value = 'Password updated. Sign in with your new password.'
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
    const { error } = await supabase.auth.resetPasswordForEmail(email.value, { redirectTo: 'https://helio.works/sign-in' })
    if (error) throw error
    message.value = 'Check your email for the password reset link.'
  } catch (error) {
    errorMessage.value = error.message
  } finally {
    submitting.value = false
  }
}
</script>
