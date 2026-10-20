// Accounts created before billing was introduced retain their existing access.
export const BILLING_REQUIRED_FROM = Date.parse('2026-09-25T00:00:00Z');

export function hasLegacyAccess(user) {
  const createdAt = Date.parse(user?.created_at || '');
  return Number.isFinite(createdAt) && createdAt < BILLING_REQUIRED_FROM;
}

export function hasWorkspaceAccess(user, subscription) {
  // An authenticated therapist always has Free workspace access.
  // The five-active-client quota is enforced independently in Postgres.
  return Boolean(user?.id);
}
