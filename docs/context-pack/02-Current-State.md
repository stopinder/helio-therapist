# Current state

Last updated: 21 July 2026. This is a working implementation record; it distinguishes code present in this checkout from production and integration verification.

## Built in this repository

- Supabase-backed client records and authentication scaffolding.
- Search-first client directory and a timeline-first client workspace.
- Session workspace with editable therapist notes, current focus, documents, and a prominent dictated-note control.
- Today day-planner: calendar first, with day/week/month/agenda navigation, followed by Needs attention derived from transcript triage and locally stored session state.
- Transcript Inbox with progressive client → session → review/retention triage and hand-off to Session Workspace.
- Google Calendar and Calendly integration routes, with Google Calendar treated as a startup workspace service: calendar reads silently refresh a rejected Google access token, persist the replacement token, retry the read, and record the successful sync time.
- Zoom OAuth routes, webhook transcript intake, transcript queue endpoints, and a Start Session endpoint that creates a Zoom meeting linked to a Helio session.

## Present navigation in the working tree

The application currently exposes **Today**, **Clients**, **Transcripts**, and **Settings**. Reports and Messages are not top-level navigation items.

## Requires deployment, migration or environment verification

- The current checkout has uncommitted workspace/navigation changes and is one commit ahead of `origin/main`; do not assume its exact state is live until it is committed, pushed, and Vercel reports a successful production deployment.
- The Zoom start-session flow requires the Zoom `meeting:write:meeting` scope, re-consent after adding it, and the Zoom session-link database migration applied to Supabase.
- Zoom cloud transcript import requires the webhook configuration, valid credentials, and an actual recorded/transcribed meeting test.
- Dictation needs a real browser microphone permission and authenticated transcription endpoint test with normal browser audio.
- Google Calendar/Calendly need a signed-in user with a valid connected integration; verify the Google silent-refresh and reconnect-only-on-revocation paths from the deployed app.
- Selecting a calendar appointment opens preparation only if its title matches exactly one Helio client; no durable calendar-event-to-client link exists yet.
- Production code for secure PHQ-9 completion was published on 21 July 2026 (`29b6019`, followed by `ac4f017`). Migration `20260721153000_add_client_completion_links.sql` was confirmed local-only and ready to apply; do not treat the client completion route as database-ready until `npx supabase db push` succeeds and the migration appears on both sides of `supabase migration list`.

## Built clinical-exchange foundation

- Resources & measures is not a client-workspace destination. Timeline is the default workspace and contains contextual Send resource, Assign outcome measure, Request questionnaire and Share document actions.
- Therapists can create a basic reusable resource, select it from the one shared contextual picker, and send an immutable versioned assignment to a client with optional instruction and due date.
- The reserved clinical-exchange schema has been applied to the Helio Supabase project: resources, immutable versions, assignments, responses, response files, measure results and clinically meaningful timeline events have dedicated records.

After migration `20260721153000` is applied, PHQ-9 can be added as a structured outcome-measure template, sent through the same picker and completed on a mobile device through a one-assignment, expiring completion link. Submission preserves item answers, calculates the total, records a completed Timeline event and places the assignment in Today for therapist review. The therapist can open that result, see the answers and total with a non-diagnostic boundary, then explicitly mark it reviewed. The token is stored only as a hash. A non-zero answer to item 9 shows immediate urgent-support guidance in the client form; it does not replace emergency support or therapist judgement. Delivery is currently copy-link rather than email, and uploads, other form types, measure trends, and a distinct in-context response view remain unavailable.

## Deliberately deferred

- Client messaging, client accounts, delivery reminders, client uploads and an in-product response viewer.
- Standalone reports, documents, sessions, assessments, and task applications.
- Multi-practice/multi-clinic architecture and organisation or supervision pricing.
- Automatic pattern recognition, longitudinal continuity generation, and any clinical output engine beyond therapist-controlled, reviewable drafting.

## Known implementation limitation

Client session state is currently stored in browser local storage while core client data and documents are server-backed. A durable, user-scoped Supabase session model is required before relying on sessions across browsers/devices or treating it as a complete clinical record.
