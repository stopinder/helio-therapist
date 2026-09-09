# CPD practice reflection — native library integration draft

## Decision and existing architecture
This is a private exercise inside Reflect / CPD, not a separate product. The prototype's abandoned ADHD configuration is not used. The source prototype was reviewed in `stopinder/therapy-orientation-quiz`, branch `therapist-style-replacement`. The main app was inspected at `7c9ade882f0d57b7b97de5a02c5814530bef3fda`, including its router, ProfessionalDevelopmentLayout, reflection library, private reflection modal, migrations, Tailwind and main.css. Notion's Professional Development and Clinical Model & Safety documentation establish private reflection and deliberate supervision/AI inclusion boundaries.

The native route is `/supervision/practice-reflection`, reached from **Reflect → Reflections → Reflect on your therapeutic stance**. The existing authenticated AppShell and ProfessionalDevelopmentLayout surround the component. No new top-level navigation, brand, login, iframe, cross-origin credentials, database table or runtime dependency is added. All existing routes remain intact.

## Scrolling
The 15 scenarios appear as a continuous list. A pointer click on an answer card scrolls to the next question after a short acknowledgement interval. Progress is sticky and measured to keep the next heading below it. Context answers also advance. Keyboard selection does not unexpectedly move focus; Continue remains available. Reduced-motion preferences and the automatic-scroll toggle are respected. Selecting the last answer does not save or call AI; it scrolls to explicit review.

## Two distinct saving actions
- **Save reflection as text** creates a local download; it does not create a library record.
- **Save to my reflection library** validates the snapshot, refreshes the authenticated identity and inserts into existing `private_reflections`. Success is shown only after the returned row is confirmed. It then refreshes the current library and offers **View my reflection library**.

`body` stores the readable reflection and provenance notice. Existing `workspace_content` JSONB stores `{captureSource:'practice_reflection', practiceReflection:snapshot}`. Existing owner-only RLS applies through the ordinary Supabase client; there is no service-role credential or user ID supplied by questionnaire content. `client_id` and `session_ref` remain null; `included_in_supervision` starts false.

A report receives a stable UUID and completion timestamp once. Save retries use that UUID; the adapter reads an existing matching row instead of upserting over historical material. A lost response is checked before reporting failure. A conflicting ID never overwrites another reflection. Re-reading an unchanged report in the same exercise preserves its saved state. A new completion creates a new dated entry. Database `created_at` is the save time; `completedAt` is explicitly browser-reported, not an authenticated clinical timestamp.

The body has the existing 20,000-character limit. Oversized content is refused rather than silently truncated. No production migration is needed or applied. Existing data is not altered by development/testing.

## Evidence for later continuity work
The snapshot separates selected response IDs, deterministic interpretation, narrative text, provisional question/scoring/interpretation versions and provenance. It starts `continuity.status='not_analysed'`. The existing reflectiveMap fields are not populated from quiz answers. No longitudinal engine or AI analysis is invoked by saving or reloading.

Future prompt-engineered continuity work should deliberately select therapist-owned source snapshots, check compatible versions, cite dates/source selections, and keep AI interpretation distinct from therapist amendments. Changed answers do not measure growth, deterioration, competence or diagnosis. The initial snapshot has an empty amendments list; no new editing workflow is claimed here.

The host route currently sets `report-endpoint=''`: authored reflection and persistence are available without exposing the prototype's anonymous AI endpoint. Live AI writing and prompt/model provenance need a separate authenticated integration and report-reference review. Unknown provider metadata is stored as null, not invented. The existing report sample remains unavailable. Neither clinical validity nor production readiness is established by automated tests.

## Files
- `src/quiz/therapist/`: versioned questions, editorial scoring, report content, progress and snapshot contracts copied into the main app; no remote imports. After acceptance the main-app copy becomes the maintained implementation and the separate prototype should be frozen/retired rather than independently extended.
- `src/views/TherapistQuizView.vue`: reusable exercise, scroll interaction, text download and injected library-save action.
- `src/views/supervision/PracticeReflection.vue`: authenticated host wrapper, existing-library refresh and return navigation.
- `src/lib/practiceReflectionLibrary.js`: owner-scoped insert-only adapter and save confirmation.
- `src/router/index.js`: one lazy protected child route.
- `src/views/supervision/SupervisionReflections.vue`: one contextual entry link.
- `test/unit/practice-reflection.test.js`: deterministic snapshot, save failures/retries and local PostgreSQL RLS checks using existing policies.
- `scripts/check-cpd-library.mjs` and `.github/workflows/cpd-practice-reflection.yml`: built-main-app browser checks with synthetic accounts and simulated REST responses. No real therapist/client data, hosted database writes or AI calls.

## Release boundary
Draft branch only. Do not merge or promote without review. Verify the actual workflow and native Vercel preview; successful mocked browser saves/local RLS tests do not establish a live hosted Supabase save. Confirm the existing `workspace_content` migration is present in the target environment, then use a deliberate test reflection in the authenticated preview to confirm saving and re-opening. No production data, secrets, environment settings, Notion pages, Maps or continuity prompts are changed by this draft.
