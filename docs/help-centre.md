# Helios Help Centre

Status: implementation branch; not released to production. Content review: 27 September 2026.

## Purpose

This replaces slide-deck production as the proposed source of product guidance. Help explains why a therapist uses an area, what information enters it, which actions generate or save, where results go and what remains separate. Articles include worked fictional examples rather than captions repeating UI labels.

## Implementation contract

- `/help` and `/help/:articleId` are authenticated application routes, subject to the existing authentication and billing gate. `/support` remains the public contact page. No auth or billing behaviour is changed.
- One static article catalogue in `src/content/help/articles.js` powers the full Help page and contextual panel. The article IDs are stable deep-link identifiers.
- Contextual links open a native modal side panel above the existing workspace. Closing returns focus to the trigger without routing away, remounting the clinical form or saving its contents. Opening the full guide from the panel uses a separate tab.
- Search is local deterministic matching over reviewed Help articles only. It supports selected plain-language aliases, case/accent normalisation and word prefixes. It is not semantic AI search and does not promise arbitrary typo correction.
- Search strings are held in component memory only: no URL query, local/session storage, analytics event, database, Notion query or model request. Help routes remain excluded by the existing telemetry allowlist.
- Text is rendered using Vue interpolation and semantic elements, not unsanitised HTML. No clinical services are imported by the Help components or search library.
- No new package, schema, migration, API endpoint, paid service or runtime Notion synchronisation is introduced.

## Reviewed source basis

Base implementation: `stopinder/helio-therapist` at `1f0c71ded19d831bd770365e13f753fd6f061316`.

Internal editorial sources (do not embed private workspace URLs in the browser bundle):

- [User Interaction Map](https://app.notion.com/p/3c27404c23fc8114a7fecbc8417a87de)
- [Client and Reflection source audit](https://app.notion.com/p/3e87404c23fc81ebaccbd7d5ee70f54d)
- [Professional Development product record](https://app.notion.com/p/3b07404c23fc8155841fe069d6cf41a2)
- [Continuity direction, not implementation evidence](https://app.notion.com/p/3c37404c23fc81a6856bd6cad9aebdcc)

The earlier audit differentiates source review and a partial signed-in sample walkthrough. That is not a blanket certification. The source files below settle current UI labels and logic; earlier Notion release statements remain historical.

| Article ID | Implementation evidence |
| --- | --- |
| client-workspace | `src/views/ClientWorkspace.vue`; `src/components/workspace/ClientWorkspaceHeader.vue` |
| prepare-next-session | `ClinicalAttentionPanel.vue`; `CurrentCareFocus.vue`; `ClientFollowUps.vue` in `src/components/workspace/` |
| care-suggestions | `ClientCarePanel.vue`; `src/lib/clientCare.js`; `src/lib/clinicalLenses.js` |
| dictate | `ClientCarePanel.vue`: `toggleRecording`, `transcribeRecording`; speech inserts editable text into the thought field |
| session-material | `src/views/SessionWorkspace.vue`: tabs, generation and edit-save handlers; `ClinicalSummaryTab.vue`; `CompletedClinicalRecord.vue` |
| client-summary | `ClientDocumentComposer.vue`; `src/lib/clientDocuments.js`; `api/ai/client-session-summary.js`; `api/_lib/ai-client-session-summary.js` |
| private-reflection | `ReflectionTab.vue`; `src/lib/reflections.js`; `ProfessionalDevelopmentLayout.vue` |
| practice-map | `SupervisionInsights.vue`: authored mapping, case-insensitive matching, date windows; `ProfessionalDevelopmentLayout.vue`: 100-entry load |
| reflection-ai | `PrivateReflectionModal.vue`; `SupervisionReflections.vue`; reflective AI service |
| supervision-pack | `SupervisionWorkspace.vue`; `src/lib/reflections.js`; supervision selection/report handlers |
| therapeutic-stance | `src/views/supervision/PracticeReflection.vue`; `src/quiz/therapist/continuity.js`; product record PD-001 |

Component paths without a directory are under the corresponding `src/components/workspace`, `src/components/professional-development`, `src/views/supervision` or `src/layouts` directory.

## Reconciliation and limitations

- Dictate means the therapist speaks their own text into the field. It is not the client-session transcript workflow.
- The session-bound Generate summary path saves its generated draft and debounces subsequent edit saves. The document composer has a separate Generate client summary / Save Draft / Finalise PDF sequence. Do not generalise one workflow's saving behaviour to the other.
- Client-summary continuity chooses up to three eligible reviewed captures at/before an anchor; Practice Map groups authored reflective fields and recorded theme counts. Neither establishes that the broader proposed Continuity Engine exists as a standalone feature.
- The exact user entry/review path for all eligible Session Capture sources and any separate Over Time screen are still unresolved. The articles do not invent a route or a button to resolve that gap.
- A native microphone control is not promised beside every field. Microphone recording, live clinical approval, amendments and external sending are not exercised for this change.
- Saved practice-reflection snapshots are not evidence of a running longitudinal competence-assessment system.
- The first release concentrates on Client, Care, Sessions and Reflection. Calendar, account and integration setup guides are future content work, not silently assumed complete.

## Maintenance

Change the versioned article catalogue with the relevant feature PR. Run the catalogue/search tests, component interaction tests, build and focused browser checks. Review the article when the source workflow changes; update the review date only after review. Regenerate the editorial copy using `node scripts/export-help-content.mjs`, then update the linked Notion Help Centre and Product Map release state. Notion is a review record, not an unreviewed live content feed.

## Verification for this branch

- Full Node test suite: 621 passing.
- Full component suite: 65 passing after extending the icon mock and targeting Clear filters by its text rather than its styling. No assertions were removed.
- Dedicated localhost browser suite: six passing, including unsaved Care, Reflection and document-composer fields, Escape/focus return, authentication, deep links, search and responsive checks at 1440 and 390 pixels.
- Production build and git diff whitespace check pass. Existing chunk-size/dynamic-import warnings remain.
- `npm run test:help` runs the focused tests. The generic Playwright configuration excludes this spec because it requires its own isolated test server; the dedicated Help CI job runs it. No real user credentials or remote data are used.
- Editorial record: https://app.notion.com/p/3e87404c23fc8111a953cfd61496fd0b
- Preview review and production release are separate and not asserted by the local test results.
