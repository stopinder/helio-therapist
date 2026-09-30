// Accounts created before billing was introduced retain their existing access.
export const BILLING_REQUIRED_FROM = Date.parse('2026-09-25T00:00:00Z');

export function hasLegacyAccess(user) {
  const createdAt = Date.parse(user?.created_at || '');
  return Number.isFinite(createdAt) && createdAt < BILLING_REQUIRED_FROM;
}

export function hasWorkspaceAccess(user, subscription) {
  if (hasLegacyAccess(user)) return true;
  return ['trialing', 'active'].includes(subscription?.status);
}
