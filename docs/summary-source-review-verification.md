# Summary source review: implementation and verification

## Implemented

Both session-summary generation endpoints use explicit ready, needs_review and generation_failed outcomes. Operational warnings cannot be saved as successful generated summaries. Existing drafts remain intact on review/failure. Legacy warning-only bodies are excluded from longitudinal evidence.

Original transcript, imported Zoom note, assigned encounter and therapist clarification have separate provenance. The shared instructions explicitly reject treating topic changes, several relationships, couples work or IFS parts as proof of separate appointments. Review quotations are checked against the named source and transcript line references are derived from actual text.

The review panel supports explicit confirmation with participant context, or reviewed, ordered, non-overlapping conversation ranges with separate client/encounter assignment. Splitting is atomic, preserves the original, and never copies a whole-recording Zoom note or speaker map into a child. Source edits/reassignment invalidate confirmations. Owner checks, audit RLS and service-role-only review RPC execution are enforced. Sharing/finalisation and document persistence check source state/version.

## Verification completed November 6, 2026

- `npm run build`: passed (existing bundle warnings).
- Focused source outcome, migration/isolation, summary UI and archive regression suite: 69 passed, zero failed.
- All repository migrations applied to an isolated PGlite database before database tests. Verified owner separation, RPC permissions, stale versions, protected metadata, overlapping ranges, exact child text, immutable original, and blocked document writes.
- Chromium UI checks using the actual bundled component and synthetic data: four passed. Desktop 1280px and mobile 390px confirmation (no horizontal overflow or browser errors); splitting with exact ranges/client destinations; rejected stale-source confirmation.
- Browser UI checks used an offline bundle because this execution environment blocks localhost navigation. External font imports were omitted from this offline harness only; application CSS was not changed.
- The broader Node suite has baseline/environment failures; it is not represented as fully green. Tests do not establish clinical interpretation accuracy. No live AI generation or real client transcripts were used.

## Release order

This change includes `20261105201218_summary_source_review.sql`. Apply the migration to the intended environment before releasing the code; verify its service-role grants, RLS policy and triggers there. Then deploy and exercise the authenticated assignment/review/generation journey. This implementation work did not alter production clinical records or apply the production migration.

The source-review branch includes the earlier transcript-to-summary handover work from PR #338. One-time workspace/install/integration workflows and scripts have been removed after integrating the actual source files.
