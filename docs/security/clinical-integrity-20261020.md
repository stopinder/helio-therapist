# Clinical data-integrity hardening — 20 October 2026

**Status:** reviewed source migrations and isolated tests only. **Not applied to the production database.**

## The three independent migrations

1. `20261020102012_block_direct_completed_session_inserts.sql` adds an authenticated-session **BEFORE INSERT** trigger. Authenticated attempts to insert a row as `completed`, or to set `completed_at` on insertion, fail with SQLSTATE `42501`. Existing drafts and the trusted service-role/Postgres restoration path remain available. The existing `complete_session` RPC and update/delete guards remain unchanged.
2. `20261020102117_protect_finalised_document_storage.sql` replaces only the owner UPDATE/DELETE policies on `storage.objects` in bucket `client-documents`. A file whose path is referenced by a `documents` row with `status='completed'` or non-null `finalized_at` cannot be updated, moved or deleted by an authenticated owner. Private SELECT and INSERT policies are unchanged. Owners can still modify/remove unfinalised draft or temporary files.
3. `20261020102149_freeze_published_resource_versions.sql` adds an UPDATE/DELETE trigger on `resource_versions`. Once `published_at` is non-null, the row cannot be changed or deleted (including retirement metadata). New versions can still be published as new rows through the existing publishing RPC; unpublished drafts remain editable or deletable.

All changes use existing table ownership constraints, schema-qualified relations and existing Supabase storage policies. No tables or clinical records are dropped, no client-facing UI/API behaviour is changed, and existing published/finalised records are protected immediately on migration.

## Independent evidence

- `node --test test/clinical-integrity-hardening.test.js`: all three scenarios pass using **PGlite, disposable in-memory PostgreSQL** with the **complete ordered repository migration chain** and `authenticated` role plus JWT `auth.uid()` RLS simulation. Zero live network/database calls.
- Negative paths exercised: insert completed session; insert forged completion timestamp; mutate/delete a finalised Storage file; mutate/delete an existing published resource version; mutate a just-published draft version.
- Positive paths exercised: insert valid in-progress session; owner update/delete of temporary and draft files; cross-owner Storage denial; edit/delete unpublished resource versions before publishing.
- Run `npm test` and `npm run test:components` / `npm run build` on the review branch. GitHub CI must pass before merge.

## Approval gates before production

1. **No automatic production rollout from this PR.** Confirm and review the actual deployed Supabase policies/functions/triggers again immediately before scheduling migration.
2. Back up the schema/policies and verify no later-added permissive `storage.objects` policies allow alternative UPDATE/DELETE access to `client-documents`. PostgreSQL permissive RLS policies combine with OR.
3. Apply the exact three migrations to a separate staging Supabase project first. Re-run negative authorisation tests against *staging* JWT users and verify ordinary therapist flows: start session then complete with RPC; upload, finalise and download a document; update/delete working files; publish a fresh questionnaire/resource version and view previously sent assignments.
4. Obtain explicit production-change approval. Apply in migration order with a monitored maintenance window and read-back of triggers, policies and migration history. Verify policy-denial results with throwaway records only; do **not** attempt writes against existing patients' data.

## Operational limitations and rollback

- `service_role` bypasses Storage RLS, as Supabase documents; privileged server credentials must stay server-side and carefully protected. The session insertion trigger also intentionally allows trusted migration/service roles for historical-data restoration. These controls enforce end-user paths rather than replacing all administrator controls.
- Storage metadata tests cannot simulate physical blob lifecycle; staging must verify Storage API operations and signed downloads. Never delete Storage files through direct SQL.
- If staging finds a regression, revert the relevant **new trigger/policy definition** after reviewing its exact original definition. For Storage, restoring the preceding owner UPDATE/DELETE policies would *reopen* the vulnerability, so this requires explicit security approval and is not an automatic rollback.
- No rollback, production DDL, data mutation, credentials change, deployment, or merge is included in this work.
