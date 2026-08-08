# Current state

Last updated: 26 July 2026. This is a working implementation record of the production application and the remaining integration checks.

## Implementation roadmap

The screenshot-led implementation blueprint and release sequence are recorded in [Helio implementation roadmap](07-Implementation-Roadmap.md). It treats the supplied interface captures as target behaviour and keeps repository, live-schema, RLS, integration and deployment verification as the first delivery gate.

Sprint One production hardening is deployed and tracked in [Sprint One — Production hardening](08-Sprint-One-Production-Hardening.md). That note is the source for scope, acceptance criteria, risks, migration evidence and rollout verification.

Sprint One was squash-merged in [PR #27](https://github.com/stopinder/helio-therapist/pull/27) and deployed to production: clean tests/build/audit, durable Supabase sessions, transactional multi-record writes, signed/replay-safe Zoom webhook intake, stronger tenant RLS, repository dependency cleanup and CI. The production migration ledger now matches all 26 repository migrations.

## Built in this repository

- Supabase-backed client records and authentication scaffolding.
- Search-first client directory and a timeline-first client workspace.
- Client workspace is timeline-first with an appointment preparation hand-off, therapist-maintained current focus, a focused active-session surface, editable therapist notes, and a prominent dictated-note control. Preparation shows one real carry-forward event when available; active session keeps the current focus visible without exposing generic AI controls.
- Today daily workspace: clinically led hierarchy. The next matched client and their preparation context appear first; **Today’s schedule** provides day/week/month reference navigation below. It opens the client workspace directly for unambiguous appointment/client matches and surfaces only one available session status. There is no competing appointment list between the preparation state and the schedule.
- Therapist-level **Reflections** workspace: one visibly editable, private journal with typing and in-place voice dictation. A reflection can be saved at any length, including empty. At 80 non-whitespace characters, the therapist may explicitly request a concise, editable **Supervision summary** from that one reflection. Summaries are versioned derived artefacts; the original writing is not updated. There is no Supervision page, AI chat, automatic analysis, or Practice patterns view.
- Inbox with progressive client → session → review/retention transcript triage, plus unfinished session and client-return work; it hands off to the relevant session or client context.
- Google Calendar and Calendly integration routes, with Google Calendar treated as a startup workspace service: calendar reads silently refresh a rejected Google access token, persist the replacement token, retry the read, and record the successful sync time.
- Zoom OAuth routes, webhook transcript intake, transcript queue endpoints, and a Start Session endpoint that creates a Zoom meeting linked to a Helio session.

## Present navigation in the working tree

The application currently exposes **Today**, **Clients**, **Inbox**, **Reflections**, and **Settings**. Transcripts are Inbox items, not a top-level navigation destination. Supervision is an optional action on a saved reflection, not a navigation destination. Reports and Messages are not top-level navigation items.

## Remaining environment and integration verification

- All 26 checked-in migrations are recorded in production. Rollback-only production checks passed for sessions, Timeline uniqueness, resources, requests, client completion, outcome results, reflection summary versioning and cross-tenant RLS.
- The Zoom start-session flow still requires the connected Zoom account to retain `meeting:write:meeting` consent.
- Zoom cloud transcript import requires the webhook configuration, valid credentials, and an actual recorded/transcribed meeting test.
- Dictation needs a real browser microphone permission and authenticated transcription endpoint test with normal browser audio.
- Google Calendar/Calendly need a signed-in user with a valid connected integration; verify the Google silent-refresh and reconnect-only-on-revocation paths from the deployed app.
- Selecting a calendar appointment opens preparation only if its title matches exactly one Helio client; no durable calendar-event-to-client link exists yet.
- The "Schedule" action in the Client Workspace is currently hidden (as of August 2026) because the integrated scheduling/appointment creation workflow is not yet implemented. The app currently references existing events from external providers (Google Calendar, Calendly) and existing Supabase sessions.
- Supabase leaked-password protection remains disabled. This hosted Auth setting should be enabled as a separate sign-up policy decision.
- Vercel production serves the deployed app successfully with no observed runtime errors. Node 24 is pinned in the repository and CI so new deployments do not depend on the deprecated Node 20 runtime.

## Built clinical-exchange foundation

- Resources & measures is not a client-workspace destination. Timeline is the default workspace and contains one contextual **Send to client** action. It opens the unified picker for supported resources, measures, questionnaires and documents.
- Therapists can create a basic reusable resource, select one or more items in the shared contextual picker, and send one client request with shared optional instruction and due date. Each sent item has an independent completion/review lifecycle.
- The reserved clinical-exchange schema has been applied to the Helio Supabase project: resources, immutable versions, assignments, responses, response files, measure results and clinically meaningful timeline events have dedicated records.

PHQ-9 can be added as a structured outcome-measure template, sent through the same picker and completed on a mobile device through a one-item, expiring completion link. Submission preserves item answers, calculates the total, records the score as a clinical Timeline event, and places the item in Today for therapist review. The therapist can open that result, see the answers and total with a clear non-diagnostic boundary, then explicitly mark it reviewed; the review state stays in workflow rather than the Timeline. The token is stored only as a hash. A non-zero answer to item 9 shows immediate urgent-support guidance in the client form; it does not replace emergency support or therapist judgement. Delivery is currently copy-link rather than email, and uploads, other form types, measure trends, and a distinct in-context response view remain unavailable.

- Migration `20260722100000_add_client_requests_and_request_items.sql` is applied in production. It creates the shared request envelope, evolves assignments into independently progressing request items, and preserves prior clinical records and their links.

## Deliberately deferred

- Client messaging, client accounts, delivery reminders, client uploads and an in-product response viewer.
- Standalone reports, documents, sessions, assessments, and task applications.
- Multi-practice/multi-clinic architecture and organisation-level pricing.
- Automatic pattern recognition, longitudinal continuity generation, and any clinical output engine beyond therapist-controlled, reviewable drafting.

## Known implementation limitations

- Production sessions are now durable and user-scoped in Supabase, with a verified one-time browser import and optimistic note-version checks.
- Formal URL routing and browser Back/deep-link support remain deferred.
- Full persistence of every CBT, EMDR and IFS tool remains deferred.
