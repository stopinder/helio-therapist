# Clinical document preparation - first release

Status: preview candidate; not approved for production. The approved programme also includes working formulations and Care-plan proposals, but those are later increments and are not exposed by this release.

## What is implemented

One shared preparation service powers the session quick-summary action and the Client Documents composer. The existing quick action is retained. Summary options opens the composer from a session; Client Documents also offers Review recent sessions.

- Purposes: Session summary; Review of recent sessions. These have distinct section structures.
- Perspectives: General, Gentle CBT, Transactional Analysis, Integrative.
- Audience: client-facing draft or therapist working document. A draft with text or existing saved content keeps its audience; another audience requires a separate document. Therapist documents do not offer Prepare email.
- Sources: one encounter for a summary; last three reviewed encounters or an explicit selection of two to six reviewed encounters for a review. Sources and actual dates are shown before generation.
- Current accepted Care is opt-in and explicitly not a historical snapshot. Therapist additions are separately attributed.
- Generated prose remains editable. Composer saves/finalises are explicit. The pre-existing session quick action still saves its resulting summary draft.
- Regeneration asks before replacement. Up to five prior composer drafts, their sources and generation metadata are retained on save; restoration keeps the earlier document type, audience and dates.

## Source and interpretation boundaries

Catalogue and preview requests authenticate the user and use the user-scoped Supabase client plus explicit owner/client filters. They do not call AI or reserve an allowance action. A source fingerprint binds generation to the previewed options and source contents; changed content requires a fresh preview. Only generation calls the existing metered client.session_summary feature, once. Existing account limits still apply; no bypass or new key is introduced.

Multi-session reviews use reviewed Session Captures only, ordered by encounter date, not review or import date. An older anchor excludes later encounters. An unavailable explicit anchor is not silently replaced by a newer one. Picker coverage is the most recent 100 sessions plus an explicitly opened older encounter, with a visible coverage warning. Too few or excessive sources fail before AI use.

A single-session draft can use a linked original transcript without forcing another review step. The original is preferred to the Zoom summary; the two do not count as independent sources. Source labels say when material is not a reviewed capture. Soft-deleted transcripts are excluded. The original transcript may itself contain sensitive material: the client-facing prompt and clinician review remain necessary, not a guarantee of automated redaction.

Reviewed capture fields are allowlisted. Client-facing capture input omits the risk/safeguarding field; therapist input retains that recorded field. Private reflection and supervision tables are never fetched. No generation writes Care, approves a Clinical Record, sends email or finalises a document.

The model returns claim records, not unrestricted section prose. The renderer uses only structurally validated claims with known source identifiers. Recurring claims require distinct reviewed encounter IDs and different content hashes. Therapist-only tentative interpretations are labelled and rejected in client-facing output. This does not prove semantic accuracy: matching source IDs and different hashes cannot determine whether an interpretation is supported or whether a past event is merely being retold. Therapist review remains essential.

## Storage and compatibility

Existing documents JSON stores preparation, audience, sources, claims and bounded history. Existing optimistic version checks and finalised-document protections remain. No database migration or new environment variable is required. Legacy requests remain supported by both summary endpoints for already-open tabs; the legacy direct prompt also now uses the actual encounter timestamp rather than today's date.

## Verification

Run:

```sh
npm test
npm run test:components
npm run build
node node_modules/@playwright/test/cli.js test --config=playwright.documents.config.js
node node_modules/@playwright/test/cli.js test --config=playwright.help.config.js
```

Browser acceptance uses fictional accounts, intercepted API responses and blocked external traffic. It tests the real UI and rich editor at 1440px and 390px: select a perspective, generate, edit, regenerate, restore, save and reopen. It does not establish real-model clinical quality or live-account billing behaviour. The Quality workflow runs the document browser suite.

Before production acceptance, review real preview output against its selected sources: one ordinary summary, a CBT multi-session review, a TA review, one historical selection, and a regeneration preserving edited wording. Check both usefulness and unsupported inferences. Do not describe the next formulation/Care-plan increments as delivered.
