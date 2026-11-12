# Transcript assignment recovery

Preview implementation, stacked on draft PR #371. No production release and no clinical record corrections have been performed.

## Therapist flow

Transcript Inbox and the client's Transcripts panel expose **Change assignment** directly. Session-source review also opens the same correction panel.

The panel verifies the current source, client and encounter, then offers:

- Assign to another client and a new imported or existing open encounter.
- Detach and return to Unassigned.
- Detach and archive.
- Detach and permanently delete the imported source.

An explicit attestation is required. Changing the action or target clears the attestation. Delete is last and clearly irreversible. The original in Zoom is unaffected.

Successful reversible corrections offer checked Undo. Success, conflicts and failures appear within the panel. The Inbox refreshes without remounting. Archive feedback stays visible when a card leaves the queue. Archived and Unassigned views provide explicit destinations.

## Clinical boundaries

The database locks and rechecks source version, update time, ownership, encounter and related clinical/billing work. It moves source links only. Existing session notes, documents, approved records, billing, private reflections and separated sources are never automatically moved or deleted.

Related work is listed before confirmation. Protected work blocks a move or deletion and offers its original encounter/client workspace for review. A separate explicit action marks the assignment disputed and pauses use of that source. It does not claim the assignment has been corrected. Approved records require their existing explicit correction/amendment process.

An empty original encounter is retained for Undo because legacy sessions do not prove that they were created solely for this import. Undo refuses changed sources, unavailable owners/clients, changed previous encounters, or later related work. Deletion wipes imported source text and retains an identifier tombstone to suppress automatic re-import; audit metadata contains no copy of transcript text.

## Archive model

`inbox_archived_at` records explicit archiving. `attention_cleared_at` continues to support automatic assignment handoff. Clinical `source_review` is independent: archiving hides an item from the queue but does not clear a source warning or make it safe evidence.

The API never falls back to a pretend archive. Read-only preview access supports the old schema; archive and correction writes require the additive migration. Versioned results are checked before the UI shows success.

## Deployment status

Migration: `supabase/migrations/20261112123000_transcript_assignment_recovery.sql`.

The user explicitly approved installation on 12 November 2026. The migration is now installed on the shared database as version `20261112115534` (`transcript_assignment_recovery`). The archive column and both service-only routines were verified. No existing clinical records were altered.

Live synthetic verification exercised inspect, detach, stale-write rejection, Undo, detach/archive, reassignment, protected-document blocking, disputed-source holds and deletion/tombstones. All assertions passed inside a rolled-back transaction; no synthetic accounts or records were retained.

The protected-preview fetch remains blocked by automatic approval review because that tool creates/reuses a temporary share link; synthetic testing approval did not explicitly authorize that sharing mechanism. No workaround was used. The deployed application is available for the therapist's own testing; direct authenticated preview endpoint verification is not claimed.

The migration adds an archive timestamp and service-only SECURITY INVOKER routines, with fixed search paths and existing owner-readable audit storage. It contains no update/delete of existing clinical rows. Runtime corrections occur only after an authenticated therapist explicitly confirms an action.

## Verification

Focused API, PostgreSQL/PGlite and component tests cover ownership isolation, explicit confirmation, read-only impact checks, stale writes, detach, archive, reassignment, delete erasure/tombstones, protected work, source holds and Undo. Browser fixtures exercise the actual Vue panel on desktop/mobile, reopening, reassignment, deletion, protected-work review and visible failure. Screenshots are inspected for layout and overflow. Tests use synthetic data, not live clinical records.

Broader repository Quality failures must be distinguished from these focused checks and remain a production-release blocker.


Latest code validation: the focused recovery, Inbox handoff, source-review dialog and summary-first safety workflows pass, including all six desktop/mobile browser scenarios and the application build. The preview deployment for application commit `68a050aace840268004c0ac5abfb9e76364c8f53` is READY. Broader Quality and Help Centre workflows remain red, so this is not a production release.
