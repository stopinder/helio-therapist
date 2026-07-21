# Architecture decisions

## Navigation: attention is separate from retrieval

Primary navigation is:

- **Today** — real work requiring a clear therapist action.
- **Clients** — search-first retrieval of a known client.
- **Transcripts** — a pre-clinical triage pipeline for Zoom source material.
- **Settings** — account and integration configuration.

There are no top-level Messages, Reports, Documents, Sessions, Assessments, or Tasks areas. Those are client capabilities, not separate applications.

## Today: schedule first, attention second

Today is the therapist's desk for the day. It begins with the calendar because the first questions are “Who am I seeing?”, “When?”, and “What is next?” It supports day, week, month, and agenda views plus direct navigation to tomorrow or another date.

An appointment is the primary time-based unit of work. When Helio can identify one unambiguous client for an appointment, selecting it opens that client's preparation context: current focus, timeline, and a deliberate Start session action.

**Needs attention** follows the schedule. It is not a replacement calendar, generic to-do list, or client list. It shows only real actionable state derived from existing records, such as:

- a Zoom transcript awaiting assignment, session linking, or review choices;
- an open session; or
- a session review state that genuinely exists.

Each item has one clear action and opens the exact relevant transcript or session. It disappears from the active queue when the underlying state is complete. The queue must not invent AI work, clinical review, or administrative tasks.

Time-based work and event-based work remain distinct. Appointment-related preparation belongs to the appointment; non-appointment actions belong below it in Needs attention.

## Clients: retrieval only

Clients is optimised for finding a person quickly as the caseload grows: search first, compact list, entire row clickable, with recent and optional pinned clients when implemented. It should not carry unread counts, activity badges, message previews, or workflow information.

## Client workspace: continuous and timeline-first

The client is the centre of the product. The default workspace is a concise timeline answering: “What has happened with this client since I last saw them?”

The present client workspace contains:

- a quiet client header and therapist-maintained current focus;
- a timeline of meaningful session activity;
- sessions, including notes and source material; and
- documents; and
- a reserved **Resources & measures** capability for therapist-to-client clinical exchange.

Future capabilities—including messages, questionnaires, reports, approved AI drafts, shared resources, safety work, and appointment changes—belong as linked client events or focused client views, not as top-level apps. The resource/measure workflow is specified in [Clinical exchange architecture](05-Clinical-Exchange-Architecture.md).

## Messaging

Do not build a standalone Messages area. A future client message belongs in the relevant client workspace and timeline. Its global form is only a real Today item, e.g. “Client message received — reply needed,” which deep-links into that client context.

## Transcript boundary

Transcript Inbox is triage, not clinical work:

`Transcript arrives → assign client → link/create session → choose review/retention preferences → open Session Workspace`

The original Zoom transcript remains clearly identified as unchanged source material. Once triage is complete, work continues in the client/session workspace.

## Zoom session boundary

Helio creates and retains the client/session link; Zoom opens separately with its normal host controls. Helio remains the clinical workspace. The Zoom meeting title must not contain the client name. A later Zoom transcript should return to the linked session when the integration and database migration are active.

## Current appointment-link boundary

Google Calendar and Calendly events do not yet supply a durable Helio client identifier. Helio therefore opens preparation automatically only when an appointment title matches exactly one client name. This is an interim convenience, not a clinical identity match. A durable appointment-to-client link must be designed before relying on automatic matching in clinical use.
