# Modality-specific clinical intelligence - preview

## Scope and release boundary

This preview replaces the one-template authoring path in the encounter and longitudinal summary screens with a source-aware, three-stage workflow. Production is not changed. The preview is based on the unmerged regression repair branch from PR #369, preserving that work rather than reverting it.

## Independent modality paths

The public registry in `src/lib/summaryModalities.js` describes each modality's own formulation fields and client section contract. Server strategies live separately under `api/_lib/modality-intelligence/profiles/`. CBT, IFS, Integrative, General and Transactional Analysis each have distinct evidence priorities, formulation instructions, examples and composition strategy. To add a modality, register its public contract, implement its server strategy, and add synthetic comparison cases. The registry fails closed when a strategy is missing; no unknown modality falls back to General.

The actual orchestration performs:
1. Model-neutral source extraction with exact supporting passages and one to three clinically important priorities.
2. The selected modality's structured working formulation, with supported material, hypotheses and unknowns kept distinct.
3. Client-facing composition under that modality's own contract. Therapist formulation mode stops after stage two.

The shared four-section format remains readable for existing documents and legacy callers; it is not the new composition contract. Prompt and profile versions are recorded with the generated client draft, as are stage durations and aggregate token usage.

## Zoom summary and source hierarchy

Zoom notes are read on demand through the authenticated gateway. Reading a note does not invoke a model. The inclusion checkbox is off by default, and changing the session/evidence window resets inclusion. The original transcript and therapist-reviewed material take priority. A Zoom note is explicitly a secondary AI interpretation from the same encounter, never independent corroboration.

The source loader verifies owner, client and anchor before reading material. It retains separate source IDs and shared encounter identity. It excludes private reflection/supervision stores and private/safety-only care categories. It records missing evidence instead of inventing continuity, and rechecks the source snapshot after generation. Source-review flags remain blocking. A source-only view never rewrites or deletes the saved note.

Supporting passages are available in a therapist reference disclosure alongside the client draft and proposed revision. They are not rendered in the client PDF. Exact quotation matching and reference checks are mechanical checks, not proof of semantic entailment or clinical correctness.

## Therapist-only working formulation

A working formulation is a separate in-memory view, clearly marked provisional and unsaved. It has no client `draft.body`. Both UI installation paths and shared client persistence helpers reject private-formulation markers. It is never inserted into Client Documents, an approved Clinical Record, or the client PDF. Copying this view requires an explicit local review checkbox and retains its uncertainty statements. Changing clinical context invalidates the view. There is no automatic save, sharing, approval or migration of private material.

## Explicit therapist deliverables

Exercises are generated in a separate practice structure. Requested six/eight-point sequences must have the exact number of sequential steps; a requested somatic check-in requires actionable additional steps. A promise, general description or list of body areas is not completion. Named methods are not treated as authoritative without supplied material. Requests for the exact taught sequence stop with a clear clarification error when the sequence is not established, rather than inventing it. General adaptations are labelled. The output requires permission to stop or modify.

Prospective guidance is stripped before an earlier summary is reused as encounter evidence, including the somatic check-in. Method instructions cannot be cited as completed session events. New output receives one bounded correction pass; an unresolved failure leaves the existing client draft unchanged.

## Cost, runtime and preview limits

One opaque server-side workflow reservation covers the complete request. Small selections retain the four-call ceiling, 500,000 aggregate input characters and 16,500 allocated output tokens. Larger selections use a preflighted plan of at most eight evidence batches, one cross-batch focus pass and the existing formulation/composition/one-repair stages: at most 12 calls, 1,500,000 aggregate input characters and 33,400 allocated output tokens. Provider retries are disabled. No per-batch allowance is consumed. All source-size and serialization checks happen before reservation. Per-stage usage is still recorded. Existing database allowance rules remain authoritative and fail closed. No subscription configuration or database schema is changed.

This extended workflow exceeds the existing short-request Free caps. Free accounts are rejected before consuming an action; paid and grandfathered access remains governed by the existing allowance function. The fixed Sample Practice demonstrations are deliberately not represented as live modality reasoning: the new gateway returns an explicit no-charge preview-unavailable message for those samples. These are preview limitations, not new pricing claims.

Generation supports at most 30 sessions and 600,000 source characters per request, subject to the eight-batch serialized-input ceiling. Each batch contains at most 100,000 source characters and 135,000 serialized source characters. Long sources use contiguous overlapping ranges while keeping original source IDs, encounter IDs and dates. No source tail is truncated or replaced with a prior summary. Every batch must succeed and its quotations must match the supplied range before formulation proceeds; a source concern in any batch blocks the whole result. Identical repeated observations are deduplicated without merging distinct encounters. A focus pass chooses one to three priorities, but all verified observations and gaps remain available for formulation. Up to four batch calls run concurrently, with an overall 210-second pipeline deadline inside the 240-second function limit. Coverage metadata records submitted ranges, not a claim of clinical completeness. Over-limit requests fail explicitly rather than silently truncating clinical material. The anchor picker considers up to 200 recent encounters and summary documents. Therapist formulations are not persisted across a page reload. No cross-client/shared evidence cache is introduced.

## Evidence-limit recovery

A selection exceeding the explicit batch ceiling returns `EVIDENCE_WINDOW_TOO_LARGE` before model work. Both summary screens offer **Adjust evidence**, which opens/focuses the existing session-window control without changing the selection, generating automatically, or replacing the current draft. An identical retry is not offered as a remedy. Zoom notes remain available to read independently of generation capacity.

## Design

Both screens reuse the same controls and existing Helios tokens, typography, icon language, borders and spacing. The two output choices form a balanced desktop row and stack on narrow screens. Zoom notes are in a progressive disclosure rather than a permanent large text panel. Evidence passages and uncertainty remain available without overwhelming the primary writing surface. Source text is escaped; no raw HTML rendering is used.

## Verification and clinical acceptance

Run the full Node suite and Vue component suite, the Vite build, and `node scripts/verify-modality-preview.mjs`. The browser harness bundles the real composer and components with the actual design tokens, renders them in memory, and drives the real evidence/formulation/composition pipeline through three long synthetic recent sessions with a controlled provider. It blocks all external network access and checks desktop/mobile layout, source-quotation identity, Zoom opt-in, private output separation and failure preservation. It does not validate a live authenticated account or live model clinical quality. External font imports are omitted only in that network-free harness; production font configuration is unchanged.

`node scripts/evaluate-modality-intelligence.mjs` produces a contract comparison, explicitly labelled as not a model run. `--live` runs one fixed synthetic case across all five modalities with at most 20 provider calls; it requires separately configured provider credentials and never reads a database. The resulting side-by-side outputs need therapist review against the included rubric. No numeric clinical-quality score is claimed.

Before any production promotion: review live synthetic outputs for genuine modality differentiation, inspect a signed-in preview using appropriate clinical sources, review the Free/sample limitations, and resolve or explicitly assess the separately known broader browser acceptance failures inherited from PR #369. Do not describe a successful build or mocked contract run as clinical validation.


## Passage-reference reliability repair (preview 2.1.0)

The 10 November preview runtime reported `UNVERIFIED_SOURCE_QUOTE` after the larger-window repair. The previous extractor asked the model to reproduce verbatim quotations; a single mismatch aborted the complete request. That error also conflated malformed observation identifiers with quotation mismatches. Logs intentionally contain no clinical source text, so the rejected wording was not inspected.

The extractor now selects opaque passage IDs from server-prepared contiguous slices, rather than typing quotes or source IDs. All selected text remains present, including punctuation and boundary characters. The server resolves each ID to its exact original text and checks it against the same submitted batch range before the independent evidence verifier runs. Original source/encounter/date/secondary status is retained. Unknown IDs, injected quote fields, cross-source/range references and altered source text are rejected. This is mechanical provenance, not proof that the model's observation is semantically supported or clinically correct; explicit therapist review remains necessary.

Passage references fit the structured-output enum ceiling and add no model calls or allowance reservations. Existing batching, source-review blocking, source-version checks and no-partial-summary behaviour remain. Malformed observation references now have their own error code. Both summary screens use a compact branded failure notice with explicit retry and evidence adjustment; neither action automatically saves or approves a draft. Over-limit selections still offer adjustment instead of an identical retry.

Regression verification includes the actual composer, client service, request projection, API handler, source selection, evidence batching, passage resolution, formulation, composition and editable output. Authentication, database and provider responses are synthetic fixtures; completed summary responses are not stubbed. Three long sessions preserve their internal original text and dated citations. Invalid references and truncated responses produce no partial draft, genuine review concerns still block generation, and an explicit successful retry offers a reviewable replacement without saving or overwriting the existing draft.

The two previously failing component tests are fixed by restoring the real preservation reassurance, not deleting the assertions. The shared notice adds that reassurance once for generic errors and avoids repeating server messages. Browser verification covers desktop/mobile with the real pipeline and editor, and checks for no unexpected writes or console errors. Full Node/component suites, audit, build, contract comparison and browser checks are mandatory before the atomic preview publication step. No live client regeneration or therapist clinical acceptance is claimed.
