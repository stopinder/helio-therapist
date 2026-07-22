# Phase Two — Client workspace sprint

## Outcome

Make the client workspace the therapist's continuous thinking environment for a single encounter:

`prepare → meet → capture what matters → close the loop → return to Today`

It must orient a therapist within ten seconds without turning the client record into a dashboard or asking AI to make clinical judgements.

## Design rules

- **Today** answers: *Who is next, and what needs my attention?* It presents clinical orientation before scheduling reference: Next client, Later today, then Calendar.
- **Inbox** answers: *What decision or finishing action is outstanding?*
- **Client workspace** answers: *What do I need to hold in mind for this person, right now?*
- Timeline is the enduring clinical story. It is not an audit log.
- Sessions are encounters and source-material boundaries. They are not a separate top-level application.
- Current focus is therapist-maintained. It is not an AI-generated formulation.
- AI may only appear as a therapist-invoked draft or transformation that is clearly provisional and reviewable. It does not infer risk, diagnose, create treatment plans, generate work, or write to the clinical record automatically.
- Private supervision and personal reflection remain outside the client record.

## Sprint 1 — Preparation

### Therapist experience

Opening a matched appointment lands in the client's Timeline with a compact preparation area. In one glance it shows:

1. the appointment and time;
2. the therapist-maintained current focus;
3. the last meaningful session or client-return event; and
4. at most one relevant unresolved clinical item.

The primary action is **Start session**. If no appointment is known, the same workspace remains quiet and the existing Start session action is available without a fabricated preparation state.

### Implementation

- Strengthen the existing appointment hand-off from Today to a preparation context in `MainCanvas.vue`.
- Derive one preparation cue from real session/request/transcript state. Do not add an independent task table.
- Keep calendar-title matching explicitly provisional until a durable appointment-to-client link exists.
- Replace any static or placeholder context with actual client/session data or hide it.

### Acceptance criteria

- A therapist can identify why they opened the client and what to do next without opening another tab.
- No empty preparation panel is shown for an ordinary client lookup.
- There is one primary action only.

## Sprint 2 — Active session

### Therapist experience

Starting a session opens one focused encounter surface. The therapist can:

- see the current focus without leaving the encounter;
- record or dictate editable therapist notes;
- open Zoom separately when it is available;
- use the contextual **Send to client** action when genuinely relevant; and
- save without being forced into an AI workflow.

The encounter does not present fake analysis, a proliferation of templates, or a generic “AI summary available” notification.

### Implementation

- Keep the active session tied to its client and, where available, the Zoom meeting/transcript link.
- Make saved-versus-unsaved note state explicit and calm.
- Retain the existing dictation boundary: audio is discarded after authenticated transcription; the therapist edits the resulting text before saving.
- Remove or hide non-functional AI controls and placeholder session context from the active clinical path.

### Acceptance criteria

- The therapist does not need to navigate away from the encounter to keep notes, context, or a client exchange together.
- AI never becomes a clinical record without an explicit therapist action.
- An integration failure does not prevent the therapist from keeping notes.

## Sprint 3 — Close and return

### Therapist experience

Ending a session is a short closure, not an extra workflow:

1. save notes;
2. make the next real action clear only when one exists (for example, transcript triage or a saved session review);
3. return to the client's Timeline or Today.

No “end-of-day” panel is permanently displayed. At the end of the day, Today is simply calm when sessions are documented and Inbox is empty.

### Implementation

- Make the post-session state explicit in the session surface before returning the therapist to the record.
- Derive an Inbox item only from unresolved underlying state: an open session, transcript triage, saved review step, or returned client item.
- Keep completed events in Timeline and remove resolved work from Inbox.
- Give Today one appointment/session status using the documented priority order; never stack badges.

### Acceptance criteria

- Completing a session cannot silently lose a draft note.
- Resolved work leaves Inbox.
- The therapist can return to Today and immediately see whether anything still requires attention.

## Enabling architecture

The current browser-local session store is suitable only for a prototype. Before the session workflow is relied upon across devices or as a complete clinical record, add a user-scoped Supabase session model with:

- stable session ID and client/therapist ownership;
- started, completed, and closed timestamps;
- editable therapist notes and saved-at state;
- explicit workflow state;
- Zoom meeting and transcript references where available; and
- an incremental migration path from the existing local-session records.

Do not block the interaction improvements on an invented broad EHR schema. This is the smallest durability boundary that Phase Two needs.

## Delivery order

1. Remove Phase One noise and enforce attention-debt rules. **Complete in this checkout.**
2. Build preparation context and remove client-workspace placeholders.
3. Refine the active-session encounter and its save/dictation behaviour.
4. Add the close-and-return flow and derive the resulting Today/Inbox state.
5. Introduce durable session storage only with a reviewed Supabase migration and a safe compatibility path.
6. Verify with focused tests, production build, manual browser checks for preparation/session/close, and an Obsidian state update.

## Explicit exclusions

- No Clinical/formulation tab.
- No standalone notes, documents, messages, reports, assessments, or tasks application.
- No automatic AI summary, risk inference, diagnosis, treatment plan, or generated clinical task.
- No mixing therapist-private reflection/supervision with client material.
- No persistent status badges, empty work panels, or informational Inbox items.
