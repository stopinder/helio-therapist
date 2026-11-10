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

One opaque server-side workflow reservation covers at most four provider calls, 500,000 aggregate input characters and 16,500 maximum allocated output tokens; provider retries are disabled for the workflow. Per-stage usage is still recorded. Existing database allowance rules remain authoritative and fail closed. No subscription configuration or database schema is changed.

This extended workflow exceeds the existing short-request Free caps. Free accounts are rejected before consuming an action; paid and grandfathered access remains governed by the existing allowance function. The fixed Sample Practice demonstrations are deliberately not represented as live modality reasoning: the new gateway returns an explicit no-charge preview-unavailable message for those samples. These are preview limitations, not new pricing claims.

Generation supports at most 30 sessions and 160,000 source characters per request. Over-limit requests fail explicitly rather than silently truncating clinical material. The anchor picker considers up to 200 recent encounters and summary documents. Therapist formulations are not persisted across a page reload. No cross-client/shared evidence cache is introduced.

## Design

Both screens reuse the same controls and existing Helios tokens, typography, icon language, borders and spacing. The two output choices form a balanced desktop row and stack on narrow screens. Zoom notes are in a progressive disclosure rather than a permanent large text panel. Evidence passages and uncertainty remain available without overwhelming the primary writing surface. Source text is escaped; no raw HTML rendering is used.

## Verification and clinical acceptance

Run the full Node suite and Vue component suite, the Vite build, and `node scripts/verify-modality-preview.mjs`. The browser harness bundles the real composer and components with the actual design tokens and synthetic local services, renders them in memory, blocks all network access, and checks desktop/mobile layout, Zoom opt-in, private output separation and failure preservation. It does not validate a live authenticated account or live model clinical quality. External font imports are omitted only in that network-free harness; production font configuration is unchanged.

`node scripts/evaluate-modality-intelligence.mjs` produces a contract comparison, explicitly labelled as not a model run. `--live` runs one fixed synthetic case across all five modalities with at most 20 provider calls; it requires separately configured provider credentials and never reads a database. The resulting side-by-side outputs need therapist review against the included rubric. No numeric clinical-quality score is claimed.

Before any production promotion: review live synthetic outputs for genuine modality differentiation, inspect a signed-in preview using appropriate clinical sources, review the Free/sample limitations, and resolve or explicitly assess the separately known broader browser acceptance failures inherited from PR #369. Do not describe a successful build or mocked contract run as clinical validation.
