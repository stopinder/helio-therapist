# Native CPD exercise and private library save — draft

## Decision and scope
The user has requested automatic scrolling, sticky progress, and an explicit option to keep the completed exercise in their own reflection library as well as downloading the text. This is an exercise in the existing CPD app, not a product with its own identity.

This implementation mounts the locally reviewed questionnaire at `/supervision/practice-reflection` under the existing authenticated layout. Native mounting is the smallest safe way to use the therapist's existing account; it avoids copying auth credentials between domains, adding a public cross-origin write endpoint, or creating a second reflection database. The separate quiz repository remains an isolated development preview, not the library. This is an alternative to the older cross-server exchange proposal in PR #218, not an implementation of that protocol.

## Inspected existing boundaries
- `src/router/index.js`: existing sign-in guard and ProfessionalDevelopmentLayout.
- `src/lib/reflections.js`: user authentication, private_reflections, library loading and supervision selection. The session normaliser discards unfamiliar fields, so it is not reused for exercise snapshots.
- `private_reflections` migrations: existing UUID primary key, user ownership, nullable clinical context and workspace_content JSONB. No new schema or policy is introduced.
- Notion Professional Development and Clinical Model & Safety: private professional-development material remains separate from client records and requires deliberate selection.
- Current Map reads therapist-authored reflectiveMap. An exercise snapshot must not silently populate that field or inflate its counts.

## Files
- `src/quiz/therapist/`: reviewed questions, editorial scoring, interpretation, progress, versioned snapshot and inherited styling. Copied from the review prototype; no old ADHD content.
- `src/views/TherapistQuizView.vue`: complete exercise with pointer auto-scroll, keyboard Continue, sticky progress and optional library adapter. Text download remains available.
- `src/views/supervision/PracticeReflection.vue`: native adapter using the current account. Does not accept the layout's other reflection material as exercise input.
- `src/lib/stanceReflections.js`: validates/recomputes the snapshot, authenticates via the existing user Supabase client and inserts one private_reflections record. No service-role credential or AI call.
- `src/router/index.js`: one authenticated child route; other navigation preserved.
- `src/views/supervision/SupervisionReflections.vue`: entry link from the library.
- `src/layouts/ProfessionalDevelopmentLayout.vue` and `ExerciseReflectionModal.vue`: source-aware read-only detail so authored exercise prose is not passed to the ordinary observation-based AI workflow.
- `test/cpd-stance-library.test.js`, `e2e/cpd-stance-library.spec.js`, focused CI: synthetic checks of ownership, retries, scrolling, save errors and readback. Results must be verified at the final commit.

## Persistence and provenance
`private_reflections.body` contains exactly the same text as the downloadable reflection. `workspace_content.captureSource` is `therapeutic_stance_exercise`; `workspace_content.stanceSnapshot` preserves the selected response IDs, deterministic interpretation, rendered report, exercise/scoring/interpretation versions, completion timestamp and source distinctions.

The browser completion time is explicitly identified as a browser timestamp; database created_at remains the server save time. The stable v4 snapshot UUID doubles as the existing primary key for atomic duplicate prevention. A failed response can be retried: insert conflicts are verified against the authenticated user's identical saved record. No upsert, overwrite or client-supplied owner is used. Changed responses produce a new snapshot. No clinical client/session is attached and supervision inclusion starts false. Nothing automatically writes a mapping.

This first native slice accepts only the exact authored fallback report. The isolated prototype's optional AI endpoint is not copied into the main app. Native AI generation/persistence requires an authenticated adapter and recorded model/prompt provenance; those fields remain null rather than invented. Do not call this a tested live-AI feature.

## Longitudinal contract
The future refined continuity engine is not implemented or invoked here. Retain the original snapshot separately from later therapist-authored comments and AI hypotheses. Saved exercise selections are hypothetical self-report, not observed competence, a personality type or a client outcome. Future comparisons require compatible versions and explicit source selection; generated narrative must not be counted as additional independent evidence. Do not interpret changed choices as measured growth/deterioration. Deletion/revocation and provenance-aware input filtering belong in that future engine's design before launch.

## Rollout
Draft branch only. Do not merge or promote production until the new preview is reviewed, the existing live schema/ownership policies are confirmed and an authorised account-based save/readback is accepted. Automated tests use local servers and mocked auth/database responses, never real therapist/client records. No migration, secret, provider setting or Notion page is changed.
