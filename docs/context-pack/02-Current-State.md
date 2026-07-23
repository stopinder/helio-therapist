# Current state

Last updated: 22 July 2026. This is a working implementation record; it distinguishes code present in this checkout from production and integration verification.

## Built in this repository

- Supabase-backed client records and authentication scaffolding.
- Search-first client directory and a timeline-first client workspace.
- Client workspace is timeline-first with an appointment preparation hand-off, therapist-maintained current focus, a focused active-session surface, editable therapist notes, and a prominent dictated-note control. Preparation shows one real carry-forward event when available; active session keeps the current focus visible without exposing generic AI controls.
- Today daily workspace: clinically led hierarchy. The next matched client and their preparation context appear first, followed by a compact Later today list; **Today’s schedule** provides day/week/month reference navigation below. It opens the client workspace directly for unambiguous appointment/client matches and surfaces only one available session status.
- Inbox with progressive client → session → review/retention transcript triage, plus unfinished session and client-return work; it hands off to the relevant session or client context.
- Google Calendar and Calendly integration routes, with Google Calendar treated as a startup workspace service: calendar reads silently refresh a rejected Google access token, persist the replacement token, retry the read, and record the successful sync time.
- Zoom OAuth routes, webhook transcript intake, transcript queue endpoints, and a Start Session endpoint that creates a Zoom meeting linked to a Helio session.

## Present navigation in the working tree

The application currently exposes **Today**, **Clients**, **Inbox**, and **Settings**. Transcripts are Inbox items, not a top-level navigation destination. Reports and Messages are not top-level navigation items.

## Requires deployment, migration or environment verification

- The multi-item client-request implementation is published to `main`. Its production database migration `20260722100000_add_client_requests_and_request_items.sql` still requires confirmation in Supabase before the multi-item request path can be treated as production-ready.
- The Zoom start-session flow requires the Zoom `meeting:write:meeting` scope, re-consent after adding it, and the Zoom session-link database migration applied to Supabase.
- Zoom cloud transcript import requires the webhook configuration, valid credentials, and an actual recorded/transcribed meeting test.
- Dictation needs a real browser microphone permission and authenticated transcription endpoint test with normal browser audio.
- Google Calendar/Calendly need a signed-in user with a valid connected integration; verify the Google silent-refresh and reconnect-only-on-revocation paths from the deployed app.
- Selecting a calendar appointment opens preparation only if its title matches exactly one Helio client; no durable calendar-event-to-client link exists yet.
- Production code for secure PHQ-9 completion was published on 21 July 2026 (`29b6019`, followed by `ac4f017`). Migration `20260721153000_add_client_completion_links.sql` was confirmed local-only and ready to apply; do not treat the client completion route as database-ready until `npx supabase db push` succeeds and the migration appears on both sides of `supabase migration list`.

## Built clinical-exchange foundation

- Resources & measures is not a client-workspace destination. Timeline is the default workspace and contains one contextual **Send to client** action. It opens the unified picker for supported resources, measures, questionnaires and documents.
- Therapists can create a basic reusable resource, select one or more items in the shared contextual picker, and send one client request with shared optional instruction and due date. Each sent item has an independent completion/review lifecycle.
- The reserved clinical-exchange schema has been applied to the Helio Supabase project: resources, immutable versions, assignments, responses, response files, measure results and clinically meaningful timeline events have dedicated records.

After migration `20260721153000` is applied, PHQ-9 can be added as a structured outcome-measure template, sent through the same picker and completed on a mobile device through a one-item, expiring completion link. Submission preserves item answers, calculates the total, records the score as a clinical Timeline event, and places the item in Today for therapist review. The therapist can open that result, see the answers and total with a clear non-diagnostic boundary, then explicitly mark it reviewed; the review state stays in workflow rather than the Timeline. The token is stored only as a hash. A non-zero answer to item 9 shows immediate urgent-support guidance in the client form; it does not replace emergency support or therapist judgement. Delivery is currently copy-link rather than email, and uploads, other form types, measure trends, and a distinct in-context response view remain unavailable.

- Migration `20260722100000_add_client_requests_and_request_items.sql` is required before the multi-selection request model can be used in production. It creates the shared request envelope, evolves assignments into independently progressing request items, and preserves prior clinical records and their links.

## Deliberately deferred

- Client messaging, client accounts, delivery reminders, client uploads and an in-product response viewer.
- Standalone reports, documents, sessions, assessments, and task applications.
- Multi-practice/multi-clinic architecture and organisation or supervision pricing.
- Automatic pattern recognition, longitudinal continuity generation, and any clinical output engine beyond therapist-controlled, reviewable drafting.

## Known implementation limitation

Client session state is currently stored in browser local storage while core client data and documents are server-backed. A durable, user-scoped Supabase session model is required before relying on sessions across browsers/devices or treating it as a complete clinical record.
