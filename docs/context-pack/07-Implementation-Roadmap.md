# Helio implementation roadmap

Last updated: 26 July 2026.

This note turns the current MindWorks product intent, repository inventory, and supplied therapist-interface captures into an implementation sequence. It is a blueprint, not a claim that every visible control is already wired or production-ready.

Related notes:

- [Product intent](00-Product-Intent.md)
- [Architecture decisions](01-Architecture-Decisions.md)
- [Current state](02-Current-State.md)
- [Working rules](03-Working-Rules.md)
- [Clinical exchange architecture](05-Clinical-Exchange-Architecture.md)
- [Phase Two — Client workspace sprint](06-Phase-Two-Client-Workspace-Sprint.md)

## Executive recommendation

Build and verify one authoritative vertical slice before expanding integrations:

`client → session → completed session → clinical Timeline`

Calendar events, Zoom transcripts, therapist-approved AI outputs, resources, and the constrained client-completion flow should attach to that spine. They must not create parallel client, session, note, or timeline records.

The first release gate is:

> A therapist can create or open a client, start a session, refresh and resume it, save notes, complete it exactly once, and see one correct Timeline event. Cross-therapist access is denied by tested RLS policies.

## Evidence and limits

This roadmap combines:

- the application and database inventory dated 26 July 2026;
- the existing Obsidian context pack;
- the Today, Clients, Add Client, client drawer, client record, Sessions, Inbox, Transcript Review, Reflections, and Settings captures; and
- the current repository structure described by the project.

The captures describe intended interaction and visual hierarchy. They do not prove that handlers, deployed functions, migrations, policies, provider scopes, or environment variables are correct.

The following surfaces were not fully demonstrated and require direct repository and deployed-app verification:

- sign-in, sign-up, password recovery, role resolution, and failure states;
- the constrained client completion route and all expired/invalid-token states;
- an active session, autosave, completion, and clinical-tool persistence;
- AI output approval, resource selection, assignment, upload, and response review;
- loading, empty, permission-denied, offline, and partial-failure states.

## Product boundaries to preserve

- **Today** is daily orientation and schedule reference.
- **Clients** is search-first retrieval.
- **Inbox** contains only genuine unresolved decisions or finishing actions.
- **Client workspace** is timeline-first and supports preparation, encounter, and closure.
- **Sessions** are encounter and source-material boundaries inside a client, not a top-level application.
- **Reflections** is therapist-private professional writing and never part of the client record.
- AI may notice, structure, or draft only when invoked. It does not diagnose, infer risk, create treatment plans, or write automatically to the clinical record.
- Raw transcripts remain secondary source material. They do not become clinical notes automatically.
- No standalone Messages, Reports, Documents, Assessments, Tasks, Resources, or Measures application is introduced.

## Target application architecture

### Routing and recoverable identity

Replace `selectedNav` as the sole navigation state with `vue-router` while preserving the existing shell and visual hierarchy. Route parameters are the source of record identity; small Pinia stores cache lightweight projections and recover from route hydration.

Recommended routes:

| Route | Purpose |
| --- | --- |
| `/today` | Clinical day and schedule reference |
| `/clients` | Searchable client directory |
| `/clients/:clientId` | Client Timeline and current focus |
| `/clients/:clientId/sessions` | Session history within the client |
| `/clients/:clientId/sessions/:sessionId` | Active or historical encounter |
| `/inbox` | Derived unresolved-work queue |
| `/inbox/transcripts/:transcriptId` | Transcript assignment and review choices |
| `/reflections` | Therapist-private reflection workspace |
| `/reflections/:reflectionId` | Private reflection and summary versions |
| `/settings` | Account and integration configuration |
| `/complete?token=…` | Existing assignment-specific client completion flow |

The `/complete` route remains a constrained, opaque-token workflow. It is not a general client portal unless a separate product and authorization decision is made.

### Responsibility boundaries

| Layer | Owns | Must not own |
| --- | --- | --- |
| Vue views/components | Interaction, validation feedback, optimistic UI, route transitions | Provider secrets, service-role operations, multi-record clinical transactions |
| Pinia stores | Auth projection, selected client, calendar range, session draft indicators | Permanent clinical truth or full transcript copies |
| Supabase browser client | Ordinary signed-in, RLS-protected reads and writes | OAuth token exchange, privileged deletion, OpenAI keys |
| Vercel Functions | Third-party APIs, AI, webhooks, privileged and multi-step workflows | Long-lived UI state |
| PostgreSQL | Canonical records, constraints, RLS, timestamps, idempotency | Provider-specific presentation logic |
| Private storage | Documents, response files, and retained source objects | Public clinical URLs or permanent unsigned access |

### Transaction rule

Use direct Supabase CRUD for single-record, user-scoped changes. Use a Postgres RPC or authenticated Vercel Function when one user action must change multiple records atomically.

Examples:

- starting or saving one session draft can use RLS-protected CRUD;
- completing a session and creating its Timeline event must be one idempotent transaction;
- saving transcript assignment/review choices must validate client/session compatibility in one transition;
- approving an AI output and making it part of an approved record or share flow must be explicit and recoverable.

## Data and lifecycle decisions

### Canonical ownership

| Domain | Canonical records | Required boundary |
| --- | --- | --- |
| Identity | `auth.users`, `profiles` | Role projection is server-backed |
| Clients | `clients` | One owner/therapist scope; explicit archive semantics |
| Sessions | `sessions` | Stable ID, client/therapist ownership, workflow timestamps |
| Timeline | `client_timeline_events` | Meaningful clinical story, not an audit log |
| Calendar | Normalized provider event projection | Provider + external event ID is unique |
| Transcripts | `zoom_transcripts` plus retained source | Secondary source linked to one client/session |
| AI outputs | Dedicated session/transcript output record | Provenance, state, therapist approval |
| Reflections | `private_reflections` | Therapist-only security domain |
| Supervision summaries | One versioned summary table | Derived artefact; no non-transactional mirror |
| Clinical exchange | Resource/version/request/item/response/result records | Exact assigned version and role-specific access |

### Required state machines

**Session**

`open → completed`

Optional cancellation or reopening must be deliberate and auditable. Completion and Timeline creation are atomic and idempotent.

**Transcript**

`received → assigned → choices saved → processing → output ready → approved or rejected → retained or deleted`

Saving review choices does not start analysis. Generation is a separate therapist action. Deletion cannot run before approval and retention conditions are satisfied.

**Integration**

`disconnected → connecting → connected → reauthorisation required or error`

Connection status comes from server-held integration state, never browser storage.

**Reflection summary**

`not requested → generating → ready → edited and saved → superseded`

The original reflection is saved first and remains unchanged.

**Client request item**

`draft → sent → opened → submitted → reviewed or closed`

Client access is assignment-specific; a client ID alone is never authorization.

### Schema verification and migration work

- Verify the actual `clients`, `sessions`, transcript, reflection, and clinical-exchange schemas against the checked-in migrations and generated Supabase types.
- Confirm whether client-session state still depends on browser storage anywhere. Migrate it incrementally to a user-scoped durable session model before relying on it across devices.
- Add or verify optimistic concurrency for session notes so an older tab cannot overwrite a newer save.
- Add `source_type` and `source_id` uniqueness for Timeline events so retries cannot duplicate clinical events.
- Keep appointment/client matching explicitly provisional until calendar records have a durable `client_id` association.
- Record transcript review state, requested output, processing state, approval state, retention policy, and deletion lifecycle separately.
- Keep AI output provenance: model, prompt version, source IDs, status, created time, approval identity, and client visibility.
- Make versioned supervision summaries canonical in one table. Remove any mirrored reflection column or maintain it only within one transaction.
- Store provider account identity, scopes, token expiry, last sync, last error, and reauthorisation status. Refresh tokens remain server-side and encrypted.

## Screen wiring checklist

### Today

- Read authenticated calendar events for the visible day, week, or month and server-confirmed integration state.
- Put the next matched client and preparation context before **Today’s schedule**.
- Persist calendar range and view in the URL or recoverable store.
- Open a linked client/session when the association is durable; otherwise prompt rather than guessing.
- Show stale data with a clear warning if refresh fails. Do not claim “Synced just now” without server confirmation.

Done when refresh and deep links preserve the same range, time zones are correct, provider events cannot duplicate, and an event consistently opens the same clinical context.

### Clients and Add Client

- Query only RLS-scoped clients with server-supported search, status, count, and sort.
- Validate a trimmed name and normalize optional email.
- Rename **Quick note (optional)** to **Current focus (optional)** and write the same canonical field shown in the client record.
- Insert once, select the returned ID, and route directly to the new client.
- Keep archive reversible and derive outstanding work from real session, transcript, or response state.

Done when a retry cannot duplicate a client, field errors are inline, and a reload opens the same record.

### Client drawer and client record

- Resolve the same client ID in the drawer and full record.
- Read current focus, next linked appointment, recent sessions, and meaningful Timeline events.
- Support edit focus, open record, start session, and Timeline/Sessions switching without losing route context.
- Prevent archived or unauthorized clients from starting sessions.
- Use **Send resource** for the clinical-exchange picker unless an action genuinely shares a reviewed output. Never imply that the clinical Timeline itself is client-visible.

### Sessions and active encounter

- Create one open session with client, therapist, source, and start time.
- If an open session exists, ask whether to resume it; never silently create or reuse.
- Debounce note/tool-state saves and show saving, saved, and actionable error states.
- Flush or explicitly guard unsaved work before navigation.
- Use a version or `updated_at` guard against stale-tab overwrite.
- Complete through one transaction that updates the session and creates one Timeline event.
- Derive the Inbox item from the open session; remove it when completion succeeds.

### Inbox

- Build Inbox as a database view/RPC or a small aggregation of unresolved underlying records.
- Include only open sessions, transcript decisions, approved-output decisions, client responses awaiting review, and integration reauthorisation.
- Give every item a stable source key and one clear action.
- Remove items when the source record resolves. Do not create informational debt for syncs, storage, views, or completed background work.

### Transcript review

- Validate client/session assignment and clear or revalidate an incompatible session when the client changes.
- Serve transcript view/download through an authenticated response or short-lived signed URL.
- Never log transcript text or place it in a query string.
- Persist requested output and retention policy without starting analysis.
- Offer a separate **Generate requested output** action.
- Validate structured AI output, preserve model/prompt/source provenance, and require therapist approval.
- Default retention to keep-until-review; run deletion as an auditable post-approval action.

### Reflections

- Save `private_reflections` only for the authenticated therapist.
- Keep reflection content outside client/session/Timeline queries and exports.
- Save the reflection before requesting a supervision summary so generation failure cannot lose writing.
- Save edited summaries as versions attached to the original reflection.
- Keep voice transcription editable and discard temporary audio by default.
- Preserve the existing non-diagnostic, therapist-invoked AI boundary and the single calm reflection workspace.

### Settings and integrations

- Render provider status, account label, token expiry/reauthorisation, last sync, and last error from server state.
- Start OAuth with a stored state/PKCE boundary where appropriate; exchange and store tokens server-side.
- On disconnect, confirm, revoke remotely where possible, disable credentials and jobs, and preserve imported clinical records.
- Keep verified Google and Zoom paths active.
- Mark Calendly, Outlook, Notifications, and AI Settings as disabled or coming soon until their full schema, API, and recovery behavior exists.

### Clinical exchange and client completion

- Preserve immutable `resource_versions` and the multi-item request model.
- Finish therapist review, uploads, and outcome history only through explicit, role-tested authorization.
- A client completes exactly the assigned version; later library edits never change historical work.
- Use signed storage access, file type/size limits, and a malware-scanning strategy before enabling uploads.
- Add Timeline events only for clinically meaningful outcomes, with explicit therapist/client visibility.
- Do not turn the current assignment-specific completion link into a general portal by accident.

## API boundary

| Capability | Recommended boundary |
| --- | --- |
| Client/current-focus CRUD | Supabase browser client under RLS |
| Start/save session draft | Supabase browser client under RLS with concurrency guard |
| Complete session | Transactional RPC or authenticated Vercel Function |
| Calendar list/sync | Authenticated Vercel Function |
| OAuth callback/disconnect | Provider-specific Vercel Functions |
| Zoom webhook intake | Public, signature-verified, idempotent Vercel Function |
| Transcript review transition | RLS RPC or authenticated Function |
| Transcript AI output | Authenticated AI Function |
| Reflection save/history | Supabase browser client under therapist-only RLS |
| Supervision summary/transcription | Authenticated AI Functions |
| Resource assignment/submission | Existing authenticated Functions or strict RLS RPCs |

Every write derives the authenticated user, validates authorization before processing sensitive content, uses an idempotency key where retries are possible, returns typed errors, and avoids echoing clinical content into logs.

## Delivery sequence

### Phase 0 — repository and schema audit

- Run the existing tests and production build.
- Inventory mock data, `localStorage`, placeholders, disabled controls, TODOs, swallowed errors, API routes, and environment requirements.
- Compare repository migrations, generated types, live constraints, RLS, and storage policies.
- Trace each visible control from click to final persisted state.
- Produce small tickets with frontend, API, migration, tests, and acceptance criteria.

### Phase 1 — routing, auth projection, and shared UI states

- Introduce `vue-router` and route guards.
- Add small auth, client, session, and calendar stores.
- Standardize loading, empty, saving, success, error, retry, and toast behavior.
- Preserve the current navigation and reflective visual language.

### Phase 2 — client/session/Timeline vertical slice

- Finish Add Client, directory retrieval, current focus, session start/resume/autosave/complete, session history, and atomic Timeline creation.
- Make unresolved sessions power Inbox.
- Pass the milestone gate before expanding any sharing surface.

### Phase 3 — calendar and integration foundation

- Harden Google OAuth, silent refresh, sync, event normalization, and time-zone behavior.
- Add durable appointment/client association.
- Wire Today and preparation to normalized records.
- Verify Zoom connection status and disable unimplemented providers.

### Phase 4 — transcript lifecycle and therapist approval

- Harden webhook signature verification and idempotency.
- Complete assignment, source access, choices, explicit generation, therapist approval/rejection, provenance, and retention deletion.

### Phase 5 — private reflections

- Verify private save/history/detail and dictation.
- Verify summary generation and versioned edits.
- Remove or transactionalize any dual-write summary model.

### Phase 6 — clinical exchange and constrained client completion

- Finish assignment, response/file handling, therapist review, outcome history, and client-visible rules.
- Preserve the existing assignment-specific access boundary.

### Phase 7 — clinical tools

- Inventory CBT, EMDR, and IFS tools individually.
- Persist session-linked tool state.
- Define AI inputs, draft outputs, approval, and visibility for each tool.
- Verify that tool state survives reload without entering the clinical record automatically.

### Phase 8 — production hardening

- Run role/RLS, migration, preview, observability, performance, accessibility, backup, and rollback checks.
- Verify the deployed app with real Google, Zoom, microphone, transcription, and completion flows.

## Verification strategy

### Automated

- Database/RLS: two therapists, client completion access, cross-tenant denial, archive behavior, transcript/reflection separation, storage policies, and service-role-only operations.
- Migration: clean database and production-like upgrade; verify constraints, indexes, backfills, and forward repair.
- Components: validation, workflow transitions, date/time-zone handling, route hydration, save state, and provider status mapping.
- APIs: unauthenticated calls, invalid payloads, provider timeouts, replayed webhooks, duplicate idempotency keys, AI validation failures, and retries.
- End to end: sign in, create/search client, start/autosave/complete session, resolve Inbox, review transcript, generate/approve output, save reflection, connect/disconnect provider, and complete an assignment.
- Keep `npm test` and `npm run build` as release gates.

### Manual and deployed

- Refresh every deep link and use browser Back/Forward without losing identity.
- Interrupt the network during autosave, completion, generation, upload, and disconnect.
- Check desktop/mobile navigation, drawer behavior, focus, labels, contrast, and screen-reader announcements.
- Verify Europe/Madrid daylight-saving boundaries and provider event time zones.
- Inspect production logs for notes, transcripts, reflections, tokens, signed URLs, prompt bodies, and provider payloads.
- Promote only the preview deployment and commit that passed the critical flows.

## Security and clinical-data controls

- RLS protects every clinical table and private storage path; success with a service-role key is not evidence that policies work.
- Provider refresh tokens, OpenAI credentials, service-role keys, and webhook secrets stay server-side.
- Zoom signatures and timestamps are verified before payload processing; provider event IDs prevent replay and duplication.
- Signed URLs are short-lived. Uploads have explicit type/size limits and a retention policy.
- AI records preserve provenance and approval without placing raw clinical content in operational logs.
- No AI output affects the clinical record or client visibility without explicit therapist approval.
- Reflections remain a separate private security domain and never join client Timeline or export queries.
- Incident response, export/deletion, backups, jurisdictional review, and rollback procedures are documented before production reliance.

## Product decisions to lock

| Decision | Recommended answer |
| --- | --- |
| Add Client “Quick note” | Rename to **Current focus (optional)** and use the canonical client field |
| Calendar event without a client | Prompt for association; do not guess from names or email |
| Existing open session | Ask whether to resume; never silently create or reuse |
| Transcript retention default | Keep until therapist review |
| Save transcript choices | Do not start analysis; show a separate generation action |
| Timeline “Send to client” | Use **Send resource** unless sharing an explicitly reviewed output |
| Supervision summary storage | One canonical versioned summary table |
| Calendly/Outlook | Disable as coming soon until end-to-end behavior exists |
| Notifications/AI settings | Keep hidden until persistence and user-visible behavior are designed |
| Router migration | Complete before deeper workflow wiring |

## Definition of done

- Every enabled control has a real handler, authorization check, loading state, success state, actionable error, and retry behavior.
- Every screen reloads from its URL into the same authorized record; Back/Forward works.
- Every write is constrained, migration-backed, RLS-tested, typed, and safe against duplicate requests.
- Session completion, Timeline creation, transcript transitions, AI approval, and retention actions are transactional or explicitly recoverable.
- Private reflections cannot be read through client, Timeline, export, resource, or session-AI endpoints.
- Google and Zoom status reflects server state; disconnected, expired, and partial-failure states are honest.
- Tests and production build pass; a preview deployment passes the critical end-to-end workflows.
- Environment variables, migrations, callbacks, webhooks, storage policies, monitoring, backup, and rollback steps are documented.
- Raw clinical data, credentials, signed URLs, and provider payloads do not appear in logs or browser persistence.
- Unimplemented features are hidden or explicitly disabled.

## Immediate audit checklist

- Record the current commit and deployed Vercel commit; preserve unrelated work.
- Run `npm test` and `npm run build` before edits.
- Search for mock arrays, hard-coded records, `localStorage`, disabled controls, TODO/FIXME, coming-soon labels, and swallowed errors.
- Compare ordered migrations with the live Supabase schema, constraints, and RLS policies.
- Verify the exact reflection body constraint and any mirrored summary columns.
- Confirm that every frontend API call matches a deployed route and HTTP method.
- Inventory `VITE_*`, `SUPABASE_*`, `OPENAI_*`, `GOOGLE_*`, `ZOOM_*`, and callback URL requirements without printing values.
- Trace Start session, Save/Complete session, Review transcript, Save choices, Generate output, Save reflection, Summarise, Connect, Disconnect, Add client, and Send resource to final persisted records.
- Record each mismatch as a small implementation ticket with tests and acceptance criteria.
