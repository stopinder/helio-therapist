# Helios Help Centre

Status: production product guidance. Content review: 1 November 2026.

## Purpose

This replaces slide-deck production as the proposed source of product guidance. Help explains why a therapist uses an area, what information enters it, which actions generate or save, where results go and what remains separate. Articles include worked fictional examples rather than captions repeating UI labels.

## Implementation contract

- `/help` and `/help/:articleId` are authenticated application routes, subject to the existing authentication and billing gate. `/support` remains the public contact page. No auth or billing behaviour is changed.
- One static article catalogue in `src/content/help/articles.js` powers the full Help page and contextual panel. The article IDs are stable deep-link identifiers.
- Contextual links open a native modal side panel above the existing workspace. Closing returns focus to the trigger without routing away, remounting the clinical form or saving its contents. Opening the full guide from the panel uses a separate tab.
- The full Help page is a small, browsable product manual grouped into the four reviewed areas: Clients, Therapy Focus, Sessions and Reflection. It deliberately has no separate search field, filter pills or result counts.
- Ask Helios remains the single global conversational assistant. Help does not imitate it with a second question/search interface; Help provides reviewed product documentation and stable deep links.
- Text is rendered using Vue interpolation and semantic elements, not unsanitised HTML. No clinical services are imported by the Help components. Help navigation state is not persisted in local/session storage or sent to a model.
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
- The first release concentrates on Client, Therapy Focus, Sessions and Reflection. Calendar, account and integration setup guides are future content work, not silently assumed complete.

## Maintenance

Change the versioned article catalogue with the relevant feature PR. Run the catalogue/navigation tests, component interaction tests, build and focused browser checks. Review the article when the source workflow changes; update the review date only after review. Regenerate the editorial copy using `node scripts/export-help-content.mjs`, then update the linked Notion Help Centre and Product Map release state. Notion is a review record, not an unreviewed live content feed.

## Release verification

For changes to Help, run the focused catalogue/component/browser suite with `npm run test:help`, the production build, and the Vercel preview for the exact release commit. The browser suite verifies authentication, grouped navigation, stable deep links, contextual Help preserving unsaved work, responsive layout and independent panel dismissal. No real user credentials or remote clinical data are used.
