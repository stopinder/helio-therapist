# Ask Helios — Phase 2A: durable conversational task context

**Status:** Draft feature branch `feat/ask-helios-context-routing`; do not merge until authenticated preview acceptance. Source based on deployed `main` commit `8e8cc02a`.

## Implemented

1. **Authenticated server-side task replay.** The Workspace API uses the existing therapist-owned `ask_helios_messages` records to reconstruct a bounded document task (type, draft/review status, page) after refresh, reopening a conversation or changing devices. Context is derived from the last 36 saved messages and the current signed-in user, not from client-authored filters. The server validates conversation ownership before querying messages.
2. **Safer intent selection.** Explicit requests for published research switch to Research even from Workspace; explicit practice questions switch to Workspace; contextual document requests remain in Workspace when a document task is active. Unclear general prompts retain the deliberately selected mode rather than triggering a metered research search indiscriminately. Switch notices match the destination. This is **deterministic high-confidence routing**, not a general AI agent/router, and should not be represented as one.
3. **Selected-record navigation and clarifications.** For a document result page, phrases like `open the first one`, `open the most recent one`, `open the second document` and `open the last one` resolve the actual owner-scoped listing and return one direct record reference. Ambiguous `open it` requests prompt clarification. The assistant does **not** automatically click through or change clinical records.
4. **Client document deep links.** `/documents?open=<uuid>` now redirects client-linked documents to the client workspace with `?document=<uuid>`, using its existing target-highlighting support. Practice draft links retain the existing editor and uploaded documents retain the existing authorised download behaviour.

## Privacy and correctness

- Workspace records remain retrieved through the signed-in user's Supabase client, explicit owner filters and existing RLS. No service-role read queries.
- No AI call is used for document routing, task replay, or record selection; no new AI credits or new database migrations are needed.
- Text of client documents is not injected into OpenAI. Follow-up search fields are reconstructed server-side.
- A new cross-task query invalidates prior document state, and ambiguous selection never guesses which document should open.
- The page number is bounded, and source references use DB-backed document UUIDs that are rechecked when opening.

## Verified locally

- Node tests: **745 passed** in the full suite.
- Vue tests: **80 passed** in the full suite.
- Production Vite build succeeded.
- Tests include restored search filters and pagination, owner-scoped history retrieval, no assistant-message instruction injection into context, selection ambiguity, rerouting, and reopen-after-refresh client request shape.

## Preview acceptance gates

1. Sign in and test: `Find my documents` → `show only consent forms` → `show only drafts` → `show more documents`.
2. Refresh, reopen the same Workspace conversation from history and ask `show more documents`. Check the next page and unchanged type/status.
3. Ask `open the first one`, click its reference; verify the exact practice document opens, or the correct client workspace and highlighted document.
4. Ask `open it` without specifying a record; verify a clarifying question, not an arbitrary file opening.
5. Switch to appointments/reminders and confirm `show more documents` does not silently reuse the old task.
6. Run the same cases with two distinct therapist accounts, including attempted cross-owner conversation and document IDs. The app must deny the access.
7. Verify Research and Reflect still work and the Free research allowance is unchanged.

## Deferred

- Broader natural-language interpretation of arbitrary queries and a dynamic tool planner; use controlled, auditable additions after observing actual test failures.
- Rich session preparation, client-selected clinical context sent to an AI model, action execution, and automatic multi-source summaries. These need separate clinical/privacy approvals.
- Persisting a structured context snapshot as a dedicated column is not required for this phase; historical replay is bounded to 36 messages. If conversations become longer, add a typed per-conversation context record with migration and RLS review.
