# Sprint Two — Clinical output flow

Last updated: 26 July 2026.

Status: **Preview-ready on `agent/sprint2-clinical-output-flow` in draft PR #29. Not deployed to production.**

Preview transcript processing through OpenAI was explicitly approved on 26 July
2026 for Sprint Two validation only. That approval does not authorize production
promotion.

## Why this sprint exists

A real Zoom recording completed the production intake path successfully: the recording transcript returned to Helio and was stored in the transcript Inbox. The failure was interaction design and workflow completion, not transport. A therapist could download the original transcript and save a requested lens, but the screen did not generate a clinical draft or make the next action clear.

Sprint Two turns that proven intake into one explicit workflow:

`open transcript → confirm client → confirm session → choose lens → generate → edit → approve → open session`

The first-time usability target is to reach the requested draft within 30 seconds without instructions.

## Approved scope

- Generate real transcript-derived drafts for:
  - Clinical summary
  - Draft clinical note
  - CBT formulation
  - IFS reflection
  - EMDR review
- Put visible lens choices and the generation action in the transcript review screen.
- Keep the original Zoom transcript secondary, unchanged, and downloadable.
- Make every output editable before approval.
- Require explicit therapist approval before an output is attached to a session.
- Preserve generation versions, model, prompt version, source, status, and approval time.
- Show approved AI-derived outputs in the linked session without replacing the therapist note.
- Give transcript, session, and reflection states persistent browser URLs with Back support.
- Make the existing supervision-summary action immediately discoverable in Reflections.
- Test source boundaries, clinical lenses, failure state, regeneration, versioning, approval, routing, and cross-tenant access.

## Architectural decisions

### Clinical-record boundary

`sessions.notes` remains the therapist-authored primary clinical note. Approval does not paste an AI draft into that field. Approved material is stored in `transcript_clinical_outputs` and linked to the canonical transcript, client, and session.

### Version and approval lifecycle

`generating → draft → approved`

Additional terminal/history states are `failed` and `superseded`. Regeneration creates a new version. Approval atomically supersedes an earlier approved version for the same transcript and lens, completes transcript review, and updates the session workflow.

### Ownership and writes

- Browser users may read only their own output rows through RLS.
- Browser insert, update, and delete are revoked.
- Generation and mutation run through an authenticated Vercel Function.
- Service-only PostgreSQL functions allocate versions, save edits, and approve atomically.
- The API derives the therapist from the verified JWT and reads the transcript server-side; raw clinical text is not accepted from the browser as generation source or written to operational logs.

### AI boundary

The existing `gpt-4o-mini` model is retained for this sprint. The transcript is delimited as untrusted source material. Prompts prohibit invented facts, diagnosis, risk conclusions, and automatic clinical-record changes. Unsupported or ambiguous content must remain uncertain and visible for therapist review.

### Routing

This sprint introduces a small recoverable History/hash route layer for:

- `#/inbox/transcripts/:transcriptId`
- `#/clients/:clientId/sessions/:sessionId`
- `#/reflections/:reflectionId`

This delivers deep links, refresh recovery, and browser Back without a high-risk shell rewrite. A full `vue-router` component decomposition remains a later architecture task.

## Production gate

Production remains unchanged until all of the following pass:

- [x] full migration-chain integration test;
- [x] unit and workflow tests;
- [x] clean production build and dependency audit;
- [x] Supabase branch migration, RLS, lifecycle, and index verification;
- [x] GitHub Quality workflow and Vercel preview deployment;
- [ ] therapist preview generation, edit, regeneration, approval, and session display;
- [ ] first-use flow review against the 30-second target;
- [ ] explicit production promotion decision.

The Supabase preview branch is temporary and billed at **$0.01344 per hour**
until it is removed. The preview should remain open only for the manual
acceptance checks above.
