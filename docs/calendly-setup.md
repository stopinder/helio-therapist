# Calendly connection setup

MindWorks uses Calendly OAuth so each therapist connects their own Calendly
account. Access and refresh tokens stay in the server-only `integrations` table
and are never returned to the browser.

## 1. Create the Calendly OAuth application

Create a **Production** web application in the Calendly Developer Portal.

- Redirect URI: `https://helio-therapist.vercel.app/api/calendly/callback`
- Scopes:
  - `users:read`
  - `event_types:read`
  - `scheduled_events:read`
  - `webhooks:write`

Copy the client ID and client secret when Calendly displays them. Calendly only
shows the secret once. Do not paste either value into source code or commit them.

## 2. Add Vercel environment variables

Add these to the MindWorks Vercel project for Production and Preview:

- `CALENDLY_CLIENT_ID`
- `CALENDLY_CLIENT_SECRET`
- `CALENDLY_REDIRECT_URI=https://helio-therapist.vercel.app/api/calendly/callback`

The existing `APP_URL` should remain the stable production URL:

`https://helio-therapist.vercel.app`

Redeploy after saving the variables.

## 3. Test the connection

1. Sign in to MindWorks.
2. Open **Settings**.
3. Select **Connect** beside Calendly.
4. Approve the requested Calendly access.
5. Confirm that Settings shows **Connected** after returning to MindWorks.

This first slice establishes the secure account connection. Booking import,
webhook processing, and Google Calendar de-duplication should be added only
after this connection has been verified in production.
