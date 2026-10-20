import { hasLegacyAccess } from './billing-access.js';

// This policy defines proposed plans; it is not yet connected to live signup or RLS.
// Database-side limits and AI metering must be implemented before activation.
export const FREE_ACTIVE_CLIENT_LIMIT = 5;
const PAID_ACCESS_STATUSES = new Set(['active', 'trialing']);

export function resolvePlanEntitlements({ user, subscription = null } = {}) {
  if (!user?.id) {
    return { plan: 'unauthenticated', workspaceAccess: false, activeClientLimit: 0 };
  }

  // Keep accounts that predate mandatory billing on their existing access.
  if (hasLegacyAccess(user)) {
    return { plan: 'legacy', workspaceAccess: true, activeClientLimit: null };
  }

  // An existing paid subscription or valid historical trial keeps its access.
  if (PAID_ACCESS_STATUSES.has(subscription?.status)) {
    return { plan: 'professional', workspaceAccess: true, activeClientLimit: null };
  }

  // A free entitlement does not require creating a Stripe customer/subscription.
  return { plan: 'free', workspaceAccess: true, activeClientLimit: FREE_ACTIVE_CLIENT_LIMIT };
}

export function canActivateClient({ plan, activeClientCount } = {}) {
  if (!Number.isSafeInteger(activeClientCount) || activeClientCount < 0) {
    throw new TypeError('activeClientCount must be a non-negative integer');
  }
  if (plan === 'free') return activeClientCount < FREE_ACTIVE_CLIENT_LIMIT;
  if (plan === 'legacy' || plan === 'professional') return true;
  // A clinic contract must be scoped and authorised separately; never infer it.
  return false;
}
