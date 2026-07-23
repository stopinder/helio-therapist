# Architecture decisions

## Navigation: daily orientation, attention and retrieval are separate

Primary navigation is:

- **Today** — the schedule-led daily workspace and the default landing place.
- **Clients** — search-first retrieval of a known client.
- **Inbox** — a single action queue for unfinished clinical work, including transcript triage.
- **Settings** — account and integration configuration.

There are no top-level Messages, Reports, Documents, Sessions, Assessments, or Tasks areas. Those are client capabilities, not separate applications.

## Today: clinical day first, then today’s schedule

Today is the therapist's desk for the day. Before the next matched appointment, it surfaces one compact preparation state: client and time, therapist-maintained current focus, the last clinically useful timeline development, and at most one unresolved preparation item. Its only action is **Prepare for session**, which opens the existing client preparation context. It supports day, week, and month views plus direct navigation to tomorrow or another date. When one calendar title maps unambiguously to a Helio client, its popover offers **Open client workspace**. Appointment rows show one concise status where Helio has sufficient real state.

The schedule section is labelled **Today’s schedule**, not “Calendar”. Helio names the therapist’s work and purpose rather than the widget used to support it. Its quiet subtitle remains **Reference and navigation** with meaningful sync state when available. This keeps the schedule visually and conceptually continuous with **Your clinical day**, while retaining day, week, and month navigation.

This is deliberately the first time-aware state only. Between-session documentation and end-of-day wrap-up are not built until real use shows that this preparation state reduces reopening, searching, and remembering.

An appointment is the primary time-based unit of work. When Helio can identify one unambiguous client for an appointment, selecting it opens that client's preparation context: current focus, timeline, and a deliberate Start session action.

## Inbox: one clinical work queue

Inbox is not a message centre, activity history, or archive. It shows only real actionable state derived from existing records, such as:

- a Zoom transcript awaiting assignment, session linking, or review choices;
- an open session; or
- a session review state that genuinely exists.

Each item has one clear action and opens the exact relevant transcript or session. It disappears from the active queue when the underlying state is complete. The queue must not invent AI work, clinical review, or administrative tasks.

Informational events never create Inbox debt: a calendar synchronisation, a transcript being stored, a client viewing a resource, or an AI process completing are activity-history facts, not work. An Inbox item exists only where a therapist decision or action is still required.

Time-based work and event-based work remain distinct. Appointment-related preparation belongs to Today; non-appointment actions belong in Inbox. Empty Inbox is a quiet, positive state, not a permanent panel on Today.

## Google Calendar: a workspace service, not a Settings workflow

Google Calendar is the entry point to the clinical day. Once a therapist has connected it, opening Helio restores the authenticated Supabase session and immediately loads the calendar. The calendar service detects a rejected Google access token, silently refreshes it with the stored refresh token, saves the replacement token, and retries the same request before rendering an error.

The calendar shows meaningful service state: **Synced just now**, **Last synced [time]**, **Syncing**, or a concise recovery state. It never falls back to “Unknown”. Transient failures can be retried from the calendar. A reconnect prompt appears in the calendar itself only when Google rejects the refresh token, access has been removed, or a calendar has never been connected.

Settings remains configuration. Google disconnect is intentionally an overflow account-management action, not a routine recovery step. Therapists should not need to visit Settings, understand OAuth, or reconnect after ordinary token expiry, sign-in, browser restart, or computer restart.

## Clients: retrieval only

Clients is optimised for finding a person quickly as the caseload grows: search first, compact list, entire row clickable, with recent clients appearing only in larger active directories and only when search is not in use. Add client is a secondary action. Each row shows at most one contextual cue when that data is available. It should not carry unread counts, activity badges, message previews, or workflow information.

## Client workspace: continuous and timeline-first

The client is the centre of the product. The default workspace is a concise timeline answering: “What has happened with this client since I last saw them?”

The present client workspace contains:

- a quiet client header and therapist-maintained current focus;
- a timeline of meaningful session activity;
- sessions, including notes and source material; and
- contextual clinical-exchange actions in Timeline and the active session, backed by one Resource Picker.

Phase Two makes this a single continuous flow rather than a record with separate destinations: preparation before a known appointment, a focused active-session surface, then a short closing/documentation step. Timeline remains the durable clinical story; Sessions remains the encounter and source-material boundary. No separate formulation tab is introduced. Therapist-maintained current focus and therapist-approved session material are the places from which formulation can emerge.

Future capabilities—including messages, questionnaires, reports, approved AI drafts, shared resources, safety work, and appointment changes—belong as linked client events or focused client views, not as top-level apps. The resource/measure workflow is specified in [Clinical exchange architecture](05-Clinical-Exchange-Architecture.md).

## Messaging

Do not build a standalone Messages area. A future client message belongs in the relevant client workspace and timeline. Its global form is only a real Today item, e.g. “Client message received — reply needed,” which deep-links into that client context.

## Transcript boundary

Transcript triage is one type of Inbox work, not a primary navigation destination:

`Transcript arrives → assign client → link/create session → choose review/retention preferences → open Session Workspace`

The original Zoom transcript remains clearly identified as unchanged source material. Once triage is complete, work continues in the client/session workspace.

## Zoom session boundary

Helio creates and retains the client/session link; Zoom opens separately with its normal host controls. Helio remains the clinical workspace. The Zoom meeting title must not contain the client name. A later Zoom transcript should return to the linked session when the integration and database migration are active.

## Current appointment-link boundary

Google Calendar and Calendly events do not yet supply a durable Helio client identifier. Helio therefore opens preparation automatically only when an appointment title matches exactly one client name. This is an interim convenience, not a clinical identity match. A durable appointment-to-client link must be designed before relying on automatic matching in clinical use.


## Session, transcript, clinical note and private-reflection boundaries

Each concept answers a different question and must not be merged:

- **Timeline** tells the selective longitudinal clinical story.
- **Sessions** preserve every therapeutic encounter.
- **Clinical notes** are the therapist-approved clinical record for that encounter.
- **Transcript** is secondary source material: what was said, never an automatic clinical record.
- **Private reflections** preserve therapist-only professional thinking.
- **Supervision** gathers only reflections deliberately selected by the therapist.

Private reflections are stored separately from clinical events and are explicitly labelled: **“Not part of the client’s clinical record.”** They never enter Timeline, client-facing content, or routine exports. A reflection can be linked to a client and, where available, a session reference without duplicating the session material.

The quiet default action is **Add private reflection**. **Add to supervision** is deliberate and optional. The therapist-level Supervision workspace groups selected original reflections by client rather than generating a summary from client records. Any future AI agenda draft remains therapist-reviewed; it may organise selected material but must not infer, diagnose, or make clinical decisions.


## Session workspace hierarchy

Opening a Session starts at **Overview**, which orients the therapist to the encounter and current focus. Its internal order is deliberate:

1. Overview
2. Clinical note — the therapist-approved primary record
3. Transcript — clearly labelled secondary source material
4. Resources & actions
5. Private reflection — therapist-only, never part of the clinical record

The Transcript must not become the default view or visually dominate the approved note. Session lists remain compact retrieval tools: date, available duration, status, note state, genuinely outstanding follow-up, and a short note preview. Detailed material belongs inside the Session.
