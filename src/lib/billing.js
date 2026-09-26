import { ref } from 'vue'

const hasAccess = ref(null)
const lastCheckedUser = ref(null)

export function getCachedAccess(userId) {
  if (lastCheckedUser.value === userId) {
    return hasAccess.value
  }
  return null
}

export function setCachedAccess(userId, access) {
  lastCheckedUser.value = userId
  hasAccess.value = access
}

export function clearBillingCache() {
  hasAccess.value = null
  lastCheckedUser.value = null
}

export async function checkBilling(session) {
  if (!session?.user?.id) return false
  
  // Check cache first
  const cached = getCachedAccess(session.user.id)
  if (cached !== null) return cached

  try {
    const response = await fetch('/api/billing/status', {
      headers: { Authorization: `Bearer ${session.access_token}` }
    })
    const result = await response.json()
    const status = result.subscription?.status
    const access = response.ok && ['trialing', 'active'].includes(status)
    setCachedAccess(session.user.id, access)
    return access
  } catch (error) {
    console.error('[Billing] Check failed', error)
    // If we have a cached value, we might want to keep it on error, 
    // but the requirement says "Handle billing errors explicitly without presenting them as a new trial."
    // For now, return false but we should probably handle this in the router to avoid redirecting to trial.
    throw error
  }
}
