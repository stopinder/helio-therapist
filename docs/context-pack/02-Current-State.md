# Current state

Last updated: 21 July 2026. This is a working implementation record; it distinguishes code present in this checkout from production and integration verification.

## Built in this repository

- Supabase-backed client records and authentication scaffolding.
- Search-first client directory and a timeline-first client workspace.
- Session workspace with editable therapist notes, current focus, documents, and a prominent dictated-note control.
- Today day-planner: calendar first, with day/week/month/agenda navigation, followed by Needs attention derived from transcript triage and locally stored session state.
- Transcript Inbox with progressive client → session → review/retention triage and hand-off to Session Workspace.
- Google Calendar and Calendly integration routes and settings.
- Zoom OAuth routes, webhook transcript intake, transcript queue endpoints, and a Start Session endpoint that creates a Zoom meeting linked to a Helio session.

## Present navigation in the working tree

The application currently exposes **Today**, **Clients**, **Transcripts**, and **Settings**. Reports and Messages are not top-level navigation items.

## Requires deployment or environment verification

- The current checkout has uncommitted workspace/navigation changes and is one commit ahead of `origin/main`; do not assume its exact state is live until it is committed, pushed, and Vercel reports a successful production deployment.
- The Zoom start-session flow requires the Zoom `meeting:write:meeting` scope, re-consent after adding it, and the Zoom session-link database migration applied to Supabase.
- Zoom cloud transcript import requires the webhook configuration, valid credentials, and an actual recorded/transcribed meeting test.
- Dictation needs a real browser microphone permission and authenticated transcription endpoint test with normal browser audio.
- Google Calendar/Calendly need a signed-in user with a valid connected integration; verify from the deployed app.
- Selecting a calendar appointment opens preparation only if its title matches exactly one Helio client; no durable calendar-event-to-client link exists yet.

## Built clinical-exchange foundation

- Resources & measures is not a client-workspace destination. Timeline is the default workspace and contains contextual Send resource, Assign outcome measure, Request questionnaire and Share document actions.
- Therapists can create a basic reusable resource, select it from the one shared contextual picker, and send an immutable versioned assignment to a client with optional instruction and due date.
- The reserved clinical-exchange schema has been applied to the Helio Supabase project: resources, immutable versions, assignments, responses, response files, measure results and clinically meaningful timeline events have dedicated records.

Client completion, upload, structured outcome-measure scoring and discussion-with-session linking remain deliberately unavailable until secure client access is designed. Timeline and Today now have the therapist-side event/review foundations. The exact architecture and persistence model are documented in [Clinical exchange architecture](05-Clinical-Exchange-Architecture.md).

## Deliberately deferred

- Client messaging, client authentication/portal access, delivery reminders, and an implemented outcome-measure workflow.
- Standalone reports, documents, sessions, assessments, and task applications.
- Multi-practice/multi-clinic architecture and organisation or supervision pricing.
- Automatic pattern recognition, longitudinal continuity generation, and any clinical output engine beyond therapist-controlled, reviewable drafting.

## Known implementation limitation

Client session state is currently stored in browser local storage while core client data and documents are server-backed. A durable, user-scoped Supabase session model is required before relying on sessions across browsers/devices or treating it as a complete clinical record.
