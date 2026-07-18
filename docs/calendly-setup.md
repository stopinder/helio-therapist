# Calendly connection setup

MindWorks currently uses a Calendly personal access token for its private MVP.
The therapist enters the token once in Settings. MindWorks validates it directly
with Calendly and stores it in the existing server-only `integrations` table,
scoped to the signed-in Supabase user.

No Calendly client ID, client secret, or Vercel environment variable is needed
for this connection method.

## Generate a Calendly token

1. Sign in to the therapist's normal Calendly account.
2. Open **Integrations & apps**.
3. Select **API & Webhooks**.
4. Generate a personal access token with these scopes:
   - `users:read`
   - `event_types:read`
   - `scheduled_events:read`
   - `webhooks:write`
5. Copy the token when Calendly displays it. Do not put it in source code,
   Vercel variables, chat, email, or a committed `.env` file.

## Connect MindWorks

1. Sign in at `https://helio-therapist.vercel.app`.
2. Open **Settings**.
3. Select **Connect** beside Calendly.
4. Paste the token into the secure connection form and select
   **Connect securely**.
5. Confirm that Settings shows **Connected**.

## Webhooks

When booking synchronization is introduced, MindWorks will generate a random
webhook signing key and supply it while creating the Calendly webhook
subscription. It is not another credential the therapist needs to obtain from
Calendly.

This first slice establishes and verifies the account connection. Booking
import, webhook processing, and Google Calendar de-duplication follow after the
connection has been verified in production.
