# Sprint One — Production hardening

Status: Sprint One engineering complete; production migration and promotion require explicit approval
Owner: Codex, acting as project manager and technical lead  
Approved: 26 July 2026  
Working branch: `agent/sprint1-hardening`

Related notes:

- [Current state](02-Current-State.md)
- [Working rules](03-Working-Rules.md)
- [Helio implementation roadmap](07-Implementation-Roadmap.md)

## Sprint objective

Make the existing therapist workflow materially safer and more reproducible before adding features. This sprint does not introduce the router, Pinia state consolidation, a general client portal, new AI capabilities, or additional integrations.

The sprint is complete only when:

> A signed-in therapist can create, resume, save and complete a durable session; completion produces one canonical Timeline event; webhook intake rejects forged Zoom events; multi-record writes are atomic or idempotent; tests and the production build pass in CI; and the repository migration history can account for the live schema.

## Verified baseline

Recorded against repository commit `7ecc8ee` and the hosted Supabase project on 26 July 2026.

| Area | Verified baseline |
| --- | --- |
| Automated tests | 41 tests: 35 passing, 6 failing |
| Local production build | Blocked because platform-specific `node_modules` are committed; the Linux Rollup binary is absent |
| Dependency audit | Clean install reports 11 advisories, including one critical issue in the unused `jspdf` dependency |
| GitHub CI | No workflow present |
| Sessions | Live `sessions` table exists but the enabled workspace uses browser `localStorage`; live table has zero rows |
| Timeline | Completed sessions are assembled from browser state rather than persisted as canonical Timeline events |
| Zoom webhook | Endpoint challenge is implemented; ordinary events are not signature/timestamp verified before processing |
| Reflection summaries | Live table exists, but reflection migrations dated 24–25 July are absent from recorded production migration history |
| Multi-record writes | Client completion, resource creation/request sending, and summary versioning contain non-transactional write sequences |
| Supabase advisors | Executable `SECURITY DEFINER` function, leaked-password protection disabled, inefficient RLS expressions, missing foreign-key indexes and duplicate integration indexes |
| Production deployment | Current Vercel production deployment is ready; low observed traffic is mostly successful and is not a substitute for workflow verification |

## Committed scope

### S1-01 — Authenticate and deduplicate Zoom webhook intake

Acceptance criteria:

- Validate `x-zm-signature` using the configured webhook secret before ordinary event processing.
- Reject missing, malformed, stale, or mismatched timestamps/signatures.
- Keep endpoint URL validation working.
- Make replayed deliveries idempotent.
- Do not log transcript content, credentials, signatures, or the complete provider payload.
- Cover valid, invalid, stale and replayed events with automated tests.

### S1-02 — Establish durable session truth

Acceptance criteria:

- Create and load user-scoped sessions from Supabase.
- Save therapist notes with an optimistic concurrency guard.
- Resume an existing open session instead of silently creating another.
- Complete a session through one idempotent database transaction.
- Create exactly one `session_completed` Timeline event in that transaction.
- Derive Inbox and transcript session choices from server sessions.
- Migrate legacy browser sessions once, verify persistence, and remove the clinical session payload from browser storage only after success.

### S1-03 — Make multi-record workflows atomic

Acceptance criteria:

- Resource plus initial version creation is one transaction.
- Client request plus request items is one transaction and retains idempotency.
- Client questionnaire submission, result, assignment state and Timeline event are one transaction.
- Reflection summary versioning has one canonical table and no non-transactional mirror.
- Failed calls leave no orphaned or partially advanced records.

### S1-04 — Reconcile migrations and harden RLS

Acceptance criteria:

- Add a forward-only repair migration; do not rewrite already-deployed migrations.
- Make the checked-in migration chain reproduce the required session, Timeline, transaction and summary schema.
- Restrict the new-user trigger function from direct `anon` or `authenticated` execution.
- Use explicit `TO authenticated` ownership policies and `(select auth.uid())` where appropriate.
- Add clearly justified missing foreign-key indexes and remove only proven duplicate indexes.
- Run Supabase security and performance advisors after preview/production application.

Leaked-password protection is a hosted Auth setting rather than a SQL migration. Enabling it remains a production configuration gate.

### S1-05 — Restore release gates

Acceptance criteria:

- Remove tracked `node_modules`; retain the lockfile and ignore generated dependencies.
- All unit tests pass without contradictory source assertions.
- Add GitHub Actions for clean install, tests and production build.
- Block high/critical dependency advisories in CI.
- Add focused tests for webhook verification, durable session behavior and transaction boundaries.
- Preview deployment must pass the critical therapist workflow before production promotion.

## Explicitly deferred

- `vue-router` and URL/deep-link migration.
- Pinia state consolidation and decomposition of `App.vue`.
- Full persistence of every CBT, EMDR and IFS tool.
- General client accounts, uploads, messaging, reports or analytics.
- New AI analysis or automatic clinical record generation.
- Calendly token-storage redesign, except where a security blocker requires disabling the unsafe path.

## Delivery order

1. Repository hygiene, failing-test correction and CI.
2. Zoom webhook verification and replay protection.
3. Forward-only database hardening migration.
4. Durable sessions and atomic completion.
5. Atomic resource, request, completion and summary flows.
6. Clean install, unit, build and static security checks.
7. Preview migration/deployment and workflow verification.
8. Production approval gate, migration, promotion and post-deploy checks.

## Risk register

| Risk | Impact | Control |
| --- | --- | --- |
| Browser-only sessions exist on a therapist device | Notes could be lost during migration | One-time import; delete local payload only after server read-back; retain a count-only migration marker |
| Live schema is ahead of migration history | A repair migration may conflict with manually created objects | Use idempotent forward-only DDL and inspect exact live constraints before application |
| Session completion retries | Duplicate Timeline events | Transactional RPC plus unique session-completion index |
| Stale session tab overwrites newer notes | Clinical note regression | Row version check; return a conflict without overwriting |
| Webhook replay or forgery | False transcript intake or provider abuse | HMAC verification, timestamp tolerance and unique delivery fingerprint |
| Large repository cleanup | Review noise from removing dependencies | Isolate generated-file deletion in its own commit and verify clean install |
| Production migration changes active workflows | Interruption or partial incompatibility | Additive schema first, compatible code second, explicit rollback and post-deploy queries |

## Production approval gate

Production changes are not automatic. Before applying the migration or promoting the code, present:

- the exact migration and affected objects;
- proof from a clean test/build run;
- preview verification results;
- Supabase advisor results;
- rollback SQL or forward-repair procedure;
- expected user-visible behavior and downtime, if any.

No destructive production database change is authorized by the sprint approval alone.

## Rollout and rollback plan

### Preview

1. Supply an isolated Supabase preview environment. The current organization is not eligible for branches without upgrading to Pro; use a branch after an approved upgrade or an explicitly approved alternative staging project.
2. Reconcile the preview migration ledger with the verified live-schema objects.
3. Apply `20260726113823_sprint_one_hardening.sql`.
4. Run Supabase security and performance advisors.
5. Deploy the application branch to a Vercel preview.
6. Verify sign-in, client retrieval, session create/resume/save/complete, one Timeline event, resource request, PHQ-9 completion, reflection save/summary versioning, forged Zoom webhook rejection, and a signed Zoom delivery.

### Production

1. Confirm a current recovery point and record preflight row counts.
2. Repair only the known migration-ledger drift; do not replay migrations whose schema already exists.
3. Apply the forward migration before promoting code.
4. Run the same smoke checks and advisors.
5. Promote the reviewed application commit.
6. Observe Vercel function errors, Supabase Postgres/Auth logs, session counts, Timeline uniqueness, webhook failures, and assignment completion for at least one workflow cycle.

### Rollback

- Application: roll back to the previous Vercel deployment. The migration is designed to retain old tables and columns required by that deployment, including the deprecated reflection summary column.
- Database: do not run a blind down migration. New session columns, indexes and canonical records are retained. If a constraint or policy blocks a verified production workflow, ship a narrowly scoped forward repair.
- Webhooks: if verified Zoom events are rejected, keep the endpoint deployed but pause the Zoom event subscription while raw-body/signature configuration is corrected; do not bypass verification.
- Browser session import: the original `helio_sessions` payload is removed only after every legacy identifier is read back from Supabase. On failure it remains available for retry.

## Sprint log

### 26 July 2026 — Sprint opened

- Sprint One approved.
- Clean working branch created.
- Repository, tests, deployment and live Supabase baseline rechecked.
- No production database mutation performed.

### 26 July 2026 — Implementation gate passed

- Removed tracked dependency artifacts from the proposed repository tree and added clean-install CI.
- Added exact-raw-body Zoom signature/timestamp verification, replay fingerprinting and payload redaction.
- Replaced browser session truth with user-scoped Supabase sessions, optimistic note versions, guarded unsaved edits, one-time verified legacy import, and atomic completion/Timeline creation.
- Moved resource/version creation, client request/items, client completion/result/Timeline, and reflection summary versioning behind transactional RPCs.
- Added explicit tenant-aware RLS checks across referenced clinical records, revoked direct execution of the Auth trigger function, added justified foreign-key indexes, and removed duplicate integration indexes in the forward migration.
- Verified current production data is compatible with new uniqueness and length constraints. The existing legacy Timeline rows require the replacement event constraint to remain `NOT VALID`, which the migration now preserves.
- PostgreSQL 17 parser accepted all 117 migration statements.
- Removed unused `jspdf`, upgraded the supported Vite toolchain, and pinned compatible patched transitive packages. Full `npm audit` reports zero known vulnerabilities.
- Replaced an existing test's workstation-only `rg` dependency after the first clean GitHub runner exposed it.
- Clean gate: 51/51 automated tests pass, including a full 26-migration ephemeral PostgreSQL integration test; the Vite 8.1.5 production build succeeds, and the PostgreSQL 17 parser accepts the migration.
- GitHub Actions clean install, dependency audit, test and production-build gate passes on the draft PR.
- Draft PR [#27](https://github.com/stopinder/helio-therapist/pull/27) is open. The existing Git integration created a successful Vercel PR preview status automatically; clinical preview verification is still blocked on an approved Supabase preview branch and migration.
- No Supabase migration, hosted Auth change, Vercel production deployment or production promotion performed.

### 26 July 2026 — Hosted preview limitation recorded

- Supabase quoted `$0.01344/hour` for a preview branch and cost confirmation was accepted.
- Branch creation was rejected because branching requires the Pro plan; no preview branch was created and no branch charge was incurred.
- Production was not used as a substitute test target.
- Added a reproducible PGlite integration test that applies all checked-in migrations from the minimal Supabase platform baseline and verifies session completion/idempotency, one Timeline event, retention of legacy Timeline rows, reflection summary versioning, atomic resource/client-completion records, and cross-tenant RLS rejection.
- A hosted authenticated workflow and signed provider delivery remain required before production approval.

### 26 July 2026 — Closeout gate rechecked

- Published the PGlite migration integration test and evidence update to PR #27 at commit `1b9ab3c`.
- GitHub Quality run 4 passed with 51/51 tests, a zero-vulnerability audit and a successful production build.
- Vercel created a successful preview for the same commit.
- At that checkpoint, the Mindworks Supabase organization remained on the Free plan and already used both available projects.
- The second project contains active course data and was not repurposed as a staging database.
- Current production advisors and the 18-entry migration ledger were recorded read-only; no production mutation was performed.
- At that checkpoint, Sprint One remained blocked on an isolated hosted Supabase environment, post-migration advisors, and authenticated/provider workflow verification.

### 26 July 2026 — Hosted branch validation

- Upgraded the Mindworks Supabase organization to Pro and created a data-free development branch.
- The first hosted migration run exposed a missing historical dependency: `public.integrations` had been created manually before the repository's migration history began.
- Added an idempotent, backfilled baseline migration immediately before the first tracked integrations migration.
- Removed the test-only integrations bootstrap so the local integration suite now proves that the repository itself can build the application schema from a clean Supabase platform baseline.
- Applied all repository migrations in order to the isolated hosted branch.
- The post-migration security advisor reported no warnings; its informational no-policy notices apply only to deliberately service-owned integration and Zoom ingestion tables.
- The performance advisor exposed one equivalent Timeline index; added a forward migration that retains the older index and removes the duplicate.
- Reapplied the advisors after that repair: zero security or performance warnings. Remaining notices are informational service-only RLS tables, unused indexes expected on a data-free branch, and the branch Auth connection-allocation setting.
- Passed a rollback-only hosted clinical smoke test covering idempotent session completion and one Timeline event, reflection summary versioning, atomic resource/request/completion/result/Timeline writes, tenant-filtered reads, and rejection of a cross-tenant resource-version insert.
- No synthetic therapist or client data was retained.

### 26 July 2026 — Sprint One engineering gate closed

- Published the final index repair and hosted-validation evidence to PR #27 at commit `f293d2f`.
- GitHub Quality run 7 passed with 51/51 tests, a zero-vulnerability audit and a successful production build.
- Vercel created a successful preview for the same commit.
- Confirmed all 26 migrations were applied on the isolated Supabase branch and all sampled Auth and clinical tables remained at zero rows after the rollback-only tests.
- Deleted the preview branch after validation, stopping its hourly charge.
- Production remains unchanged. Migration-ledger reconciliation, production migration, a real signed Zoom delivery and production promotion remain inside the explicit production approval gate rather than the completed engineering sprint.
