# Ask Helios: conversational practice workspace

Status: feature branch, **not yet production accepted**. The existing Research mode remains available.

## Product intent

One Ask Helios assistant spans three deliberate contexts: **Workspace** (what has been recorded and what needs attention), **Research** (published clinical evidence), and **Reflect** (curious therapist-owned professional reflection). There is also an explicit-approval action boundary. Ask Helios is not a supervisor, an autonomous clinician or a clinical-record author.

## Implemented in phase 1

- Mode-switching sliding panel; per-mode welcome prompts, persistent non-sensitive panel/mode preferences, mode-labelled conversation titles.
- Workspace read-only, authenticated, tenant-scoped retrieval for next-seven-day Helios appointments (UTC), open reminders, sessions not marked complete, documents, clients and high-level non-client CPD themes.
- Explicit client selection enables a **factual** preparation brief from that client's recorded current focus, session metadata and recent timeline events. The text is not sent to OpenAI.
- Research retains PubMed/Europe PMC source retrieval, citations and the existing budgeted AI call.
- Reflect mode: the AI receives only the therapist's own entered question and bounded conversation history, **not** client records. It runs through the existing Ask Helios metered AI feature. Private conversations persist under therapist RLS.
- Two approved actions: create a therapist-owned Today reminder; edit and save the therapist's own text as a professional reflection without client linkage. Both require confirmation. No arbitrary tool execution, email sending, calendar mutation, automatic client note save or diagnostic claim.
- Existing research conversations open in Research mode. New modes use labelled titles in the same RLS-protected conversation tables, avoiding a production database migration in this slice.
- Account sign-out clears module-scoped conversation state to avoid accidental in-memory cross-account display.

## Data security rules

1. Every workspace query uses `getSupabaseUserClient(req)`, validates the signed-in identity, filters by user ID and limits result columns/rows. Supabase RLS remains the primary boundary.
2. No service-role database client reads practice data. Authentication and atomic quota reservation continue to use their existing trusted-server boundaries.
3. No client data is automatically loaded by Reflect or Research. Session preparation requires a selected client ID owned by the therapist; its output is explicitly factual and not a diagnosis.
4. External research comes from PubMed and Europe PMC. Research citations and workspace records are visually distinct.
5. Writes happen only via `POST /api/ai/actions` after a deliberate browser approval. The server permits just `create_reminder` and `save_private_reflection` and always sets therapist ownership from the verified user token.
6. AI questions and Reflect history use input-length and history bounds. Quota checks run before OpenAI. The existing `ask_helios.research` budget feature is reused for Reflect until a separately migrated feature allowlist is implemented.

## Milestones after phase 1

### Phase 2: deeper workspace intelligence
- All-calendar read-only reconciliation (Google/Zoom and Helios) with explicit timezone, source indication and no conflated events.
- Richer date/client/document searches with stable internal deep links and correct pagination.
- Structured therapist-approved session preparation with source references to the exact session/document, clear uncertainty and consent/configuration to use selected clinical data with AI.
- Two-user negative authorization tests for every retrieval and action; opt-in context disclosure before any AI call containing clinical records.

### Phase 3: research and clinical reasoning integration
- Compare reviews, controls, effects, harms, confidence, evidence strength, and publication limitations.
- Present separate **Research evidence**, **Recorded context**, and **Questions for consideration**. Each clinical claim should link to its paper or exact selected record.
- Do not assert parts, diagnoses, trauma histories or formulations as facts derived from a few notes.

### Phase 4: practice assistant / action approvals
- Draft messages, session summaries and resources without sending them.
- Add safe confirmed reminders and simple scheduling actions, then extend to more consequential writes only with dry-run previews, explicit approvals, idempotency, appropriate audit trails and rollback.
- Do not automatically approve clinical records, send emails, alter financial records or schedule appointments.

### Phase 5: professional development
- Therapist-controlled CPD reading and logging, selected-reflection summaries, bibliography, theme exploration and supervised learning goals.
- No automatic promotion of private reflections into client records or supervision records.

### Phase 6: operational readiness and pricing
- Authenticate live preview flow in all three modes; test Free quota reservation, paid access, refresh/reopen/delete, and source links with two separate therapist accounts.
- Add explicit mode column through reviewed migration before moving beyond conversation title labels.
- Decide research conversation retention, export/delete, client-identifier minimisation and provider processing disclosures.
- Meter costs across modes and design Free/Professional limits from measured usage, not assumed prices.

## Known phase-1 limits

- Workspace produces deterministic, bounded answers rather than an unconstrained agent. It does not interpret all natural-language questions and cannot search full document bodies.
- The appointment view is based on Helios appointment rows only, not a merged third-party calendar; dates are explicitly UTC for this first step.
- Selected-client preparation retrieves a few factual records but does not infer treatment or send the material to OpenAI.
- Reflection saving is an edited therapist-authored note, not an AI-authored clinical formulation. The generated AI answer is not silently copied to CPD.
- Proposed actions themselves are transient UI state, not persisted authorisations. The resulting reminder or reflection persists in the existing authorised table.
- No database migration, production release, auto-sending or cross-client ingestion is included.

## Acceptance evidence

Local source on branch `feat/ask-helios-workspace-reflect`. Tests: `test/ask-helios-workspace.test.js`, `test/ask-helios-actions.test.js`, `src/components/ui/AskHeliosPanel.spec.js`, full `npm test`, full `npm run test:components` and `npm run build`. Hosted Vercel/GitHub checks and authenticated staging must also pass before any merge.
