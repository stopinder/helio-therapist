# Therapist style reflection — integration review

Status: proposed implementation contract. No Helios runtime, database, auth or deployment changes are made by this document.

Quiz foundation: `stopinder/therapy-orientation-quiz`, branch `feature/therapist-style-reflection`, `docs/therapist-style/SPRINT-01.md` and `src/quiz/therapist/`.
Product decision: `stopinder/mindworx-architecture/05-Decisions/2026-09-09-Therapist-Style-Reflection.md`.

## User journey

Authenticated Helios Reflect → quiz-only `/therapist-style` on the existing quiz Vercel project → report → return to authenticated Helios preview → explicit Keep, optional use in private mapping, or discard. No landing pages, email gate, client/session association or supervision insertion.

Save and mapping permission are distinct. Mapping permission starts false. Viewing or returning does not itself save a permanent reflection. A saved item can be viewed, annotated separately, copied/printed and deleted. A one-off snapshot, not a durable type or a repeating assessment programme.

## Verified repository boundaries

- `src/lib/reflections.js`: `createQuickReflection` supports therapist-only records without a client/session. `normalizeWorkspaceReflection` preserves only a narrow set of fields plus `quick_capture`; it does not preserve the proposed therapist-style payload. Do not pass a new artifact through that normaliser and assume the data survives.
- `src/layouts/ProfessionalDevelopmentLayout.vue`: loads up to 100 private reflections; provides generic reflection and AI modals. A dedicated source lookup is needed for quiz context rather than assuming it is in the latest 100 rows.
- `src/views/supervision/SupervisionInsights.vue`: Practice Map groups explicitly written `reflectiveMap.innerPosition` values and counts reflection/theme activity. It is not presently an inferred therapeutic-style engine. Quiz-derived material must not be counted as therapist-authored observations or manufacture inner positions.
- `api/_lib/ai-reflection.js`: `buildReflectionInput` currently accepts a reflection plus optional bounded client context. It has no dedicated therapist-style context argument. Adding that is new integration work, not an already completed capability.
- `src/components/workspace/ReflectionTab.vue`: explicitly identifies therapist-authored mapping and requires client/session props. Do not use this session-bound form as the only launch point for a general personal quiz.

These findings are from the feature branch based on commit `7c9ade882f0d57b7b97de5a02c5814530bef3fda`. Verify current code and migrations before changing anything; do not assume a branch review proves production schema or deployment identity.

## Proposed permanent storage

Reuse `private_reflections` only if its constraints and source separation support this safely. A dedicated source-aware helper/validator is preferable to widening a clinical/session normaliser indiscriminately.

Owner: server-resolved authenticated therapist. `client_id` and `session_ref` are null. `included_in_supervision` is false. Do not fill `reflectiveMap` or infer a `theme` from the quiz.

Proposed `workspace_content` shape:

```json
{
  "captureSource": "therapist_style_quiz",
  "artifactVersion": 1,
  "therapistStyle": {},
  "report": {},
  "reportVersion": "therapist-style-report-v1-draft",
  "provenance": {
    "sourceApp": "therapy-orientation-quiz",
    "sourceResultId": "server-verified-result-id",
    "completedAt": "server-recorded-time"
  },
  "continuity": {
    "allowed": false,
    "allowedAt": null
  },
  "therapistAnnotation": ""
}
```

`therapistStyle` is the canonical versioned profile built by the quiz server, not an arbitrary browser JSON object. `report` is schema-validated narrative with evidence references. The human-readable body must be identified as AI-written from a self-report quiz, never therapist-authored clinical evidence. Personal annotations remain a separate provenance layer.

The six dimensions are direction, structure, mode, timeOrientation, meaningMaking and therapeuticAim. The latter is change ↔ understanding only. Relationship attention is a supported contextual theme, not conflated with understanding.

Keep sourceResultId idempotent per owner. JSON metadata alone does not give database uniqueness under concurrency. Propose the smallest transactional constraint/import mechanism required. No new Supabase project, vector store, profile database or auth system.

## Handoff security review — must be resolved before wiring real APIs

Reuse an existing secure handoff mechanism only after locating its code and tests. Otherwise specify a bounded authorization-code-style exchange. Do not implement fake state checks in the browser and call them authentication.

Required properties:

1. Helios authenticates the therapist and creates a short-lived launch bound to that account and intended quiz environment.
2. URLs contain only opaque short-lived codes/state, never the report, answer profile, email, user ID, access/refresh tokens or secrets. Codes themselves are sensitive: redact logs, remove them from browser history after exchange, disable analytics capture, use no-store and a restrictive referrer policy on handoff pages.
3. The quiz backend redeems/verifies the launch with a narrowly scoped server-side trust mechanism. No Helios service-role key or user session token goes to the quiz browser. Quiz completion requires a valid launch and bounded answer IDs; the server recomputes the profile.
4. Completed output is exchanged over an authenticated backend channel, not accepted as an unsigned profile posted from an arbitrary browser. Helios validates schema/version, owner, state, audience/environment, expiry and one-time use.
5. Return destinations come from server-side configuration/registry with exact approved origins and paths. No arbitrary `return_to`, no wildcard `*.vercel.app`, no trusting a supplied hostname or Referer as authentication. Confirm the stable project alias; do not guess it from repository names.
6. Redemption/import is atomic and idempotent. Specify cancellation, expired session, wrong-account login, two tabs, refresh, duplicate callback, multiple Keep clicks and error recovery.
7. Temporary report/flow storage expires and is cleaned up, including abandoned flows. Never use process memory as the only serverless replay/ownership store. A signed stateless token alone cannot guarantee single use.
8. Real model calls need launch authorization, request limits, bounded retries, timeout/refusal/truncation handling and rate/cost controls before an endpoint is exposed, including on previews.

A small handoff-state migration within existing infrastructure may be justified. This has not been ruled out. Do not force expiring transfer state into permanent private-reflection records to avoid a migration. Propose SQL and tests for review; do not apply production migrations.

## Continuity semantics

Persisting and mapping are separate. The engine reads only an explicitly permitted, supported-version, retained artifact owned by the current therapist. Fetch it directly by source/type, not by reinterpreting report prose or scraping the newest 100 reflections.

Display it separately in Practice Map as “A snapshot from your style reflection” with date, provenance, view/delete controls and permission state. Preserve existing therapist-authored maps and frequency counts.

Optional reflection-AI input can include a compact deterministic subset: qualitative tendencies, supported themes, evidence references, source version/date and therapist corrections. No raw numerical score, invented identity or copied report text promoted to evidence. Do not inject it into clinical-note, diagnosis, treatment, risk, client document or supervision generators.

Current therapist-authored material wins. Differing behaviour is not inconsistency or pathology. Do not force current work to fit the quiz. Suggestions remain tentative; the therapist can reject any interpretation. Do not infer hidden motives, attachment, trauma, competence or modality suitability.

Permission revocation removes it from subsequent prompts without deleting the readable report. Deletion removes the source from active mapping and future prompts and invalidates any derived cache/context keyed to it. Recheck existence/permission before persisting concurrent model output; deletion/revocation wins. Document backup/provider retention separately and do not promise remote copies already downloaded by the therapist can be recalled.

## Architect Builder GPT assignment

Perform a read-only integration review of both repositories and relevant migrations. Do not edit quiz questions, alter live settings, read client records, retrieve secrets or deploy.

Return:

- A verified file/function map for launch, callback, private-reflection storage, Practice Map, AI input assembly, deletion and exports.
- The smallest secure handoff design, including actual stable origins when discoverable, authentication binding, expiry, replay defence and atomic idempotency.
- The smallest source-aware storage change, including preservation through update paths and separation from therapist-authored map counts/supervision/client outputs.
- Exactly how Keep, mapping permission, revocation, annotation and delete change state.
- A numbered file-by-file implementation plan and any proposed migration SQL (not applied).
- Tests proving wrong-account, cross-tenant, replay, duplicate import, malformed-version, revoked-context and deletion behaviour.
- Clear distinctions between code verified, production verified and proposed. Identify blockers without substituting assumed services or an invented continuity engine.

Review the quiz sprint document too. The report style remains draft until compared with the actual example report; do not claim to have read an unavailable upload.

## Release gate

No runtime handoff or production migration until the authentication/storage contract is reviewed. Core quiz content/scoring and a mocked isolated UI can progress independently on the feature branch. Preview validation must demonstrate the complete launch/report/return/keep/revoke/delete journey before production release.
