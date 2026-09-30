const LOOPS_API = 'https://app.loops.so/api/v1';
const DEFAULT_APP_URL = 'https://helio.works';

const isoFromUnix = (value) => value ? new Date(value * 1000).toISOString() : null;

export async function sendTrialStartedToLoops({
  supabase,
  subscription,
  stripeEventId,
  env = process.env,
  fetchImpl = fetch
}) {
  if (subscription?.status !== 'trialing') return { sent: false, reason: 'not_trialing' };

  const therapistId = subscription.metadata?.therapist_id;
  if (!therapistId) return { sent: false, reason: 'missing_therapist_id' };

  const apiKey = (env.LOOPS_API_KEY || '').trim();
  if (!apiKey) return { sent: false, reason: 'missing_api_key' };

  const { data, error } = await supabase.auth.admin.getUserById(therapistId);
  if (error || !data?.user?.email) {
    console.warn('[Loops trial] Unable to load therapist for trial event');
    return { sent: false, reason: 'missing_user' };
  }

  const user = data.user;
  const fullName = String(user.user_metadata?.full_name || '').trim();
  const firstName = fullName.split(/\s+/)[0] || '';
  const appUrl = (env.APP_URL || DEFAULT_APP_URL).trim().replace(/\/$/, '');
  const idempotencyKey = `trial-started:${stripeEventId || subscription.id}`;

  const response = await fetchImpl(`${LOOPS_API}/events/send`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': idempotencyKey
    },
    body: JSON.stringify({
      email: String(user.email).trim().toLowerCase(),
      userId: user.id,
      eventName: 'trial_started',
      contactProperties: {
        ...(firstName ? { firstName } : {})
      },
      eventProperties: {
        trialEndsAt: isoFromUnix(subscription.trial_end),
        founderOfferUrl: `${appUrl}/founder-offer`
      }
    })
  });

  if (response.status === 409) return { sent: false, duplicate: true };

  if (!response.ok) {
    const body = await response.text();
    console.warn(`[Loops trial] Request failed (${response.status}):`, body.slice(0, 500));
    return { sent: false, reason: 'request_failed' };
  }

  return { sent: true };
}
