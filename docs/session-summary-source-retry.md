# Confirmed transcript-backed summary failures

## Verified trace

At baseline `ee3286aa`, the displayed source and generation both read
`zoom_transcripts.original_transcript`. The workspace sends its transcript ID;
the API selects that exact owned, client/session-linked row. The full current
transcript enters the initial request and cautious retry. The retry excludes
the Zoom note when an original transcript exists.

The reported error does **not** establish that the transcript is missing.
After a confirmed encounter's initial non-hard review outcome, an invalid,
failed or unavailable retry previously fell through to that same message.
The retry had no format repair. A later editorial review could also replace a
usable draft with an unverified concern. These paths were reproduced with
synthetic fixtures before changing behavior.

Non-content production metadata showed a recently confirmed transcript-backed
source, a confirmation matching its live source version, and one linked source.
Recent AI usage records showed successful calls without an editorial-review
prompt suffix. They cannot distinguish a malformed cautious retry from a second
unverified review outcome, or conclusively bind those attempts to the reported
browser action. The affected encounter has **not** been verified fixed.

## Changes

- Pin the displayed transcript version before the first model call. Recheck the
  source again before returning any new draft or source-review action.
- Supply the exact confirmed primary passages as attributed review context.
  They do not resolve unrelated or new contradictory evidence.
- Repair malformed cautious-retry JSON/claims once against the same transcript,
  without restoring the excluded Zoom note or weakening the output validator.
- Retain an already validated, single-encounter, transcript-only draft after a nonblocking
  editorial revision that supplies no new primary evidence. Insufficient-source
  outcomes, new verified primary passages and blocking additions still stop.
- Verify editorial quotes against original transcript line offsets, rather than
  offsets shifted by trimming the prompt copy.
- Report the actual attached source and preserve review/draft state on failure.

## Content-free diagnostics

Logs contain only fixed codes, stage enums and source-presence/pinning booleans.
They contain no source IDs, versions, hashes, client identity, text or output.
The UI exposes a fixed diagnostic reference for support.

| Code | Meaning |
| --- | --- |
| `SS_DISPLAYED_VERSION_CHANGED` | Displayed and selected versions differ; no AI call |
| `SS_INITIAL_INVALID` | Initial/format-repaired output failed validation |
| `SS_RETRY_INVALID` | Retry and its format repair failed validation |
| `SS_RETRY_UNAVAILABLE` | Cautious retry or its repair could not complete |
| `SS_RETRY_TRUNCATED` | Retry was cut off; no partial draft accepted |
| `SS_RETRY_GENERATION_FAILED` | Retry explicitly returned generation failure |
| `SS_RETRY_REVIEW_UNVERIFIED` | Latest retry still lacks a resolvable primary boundary |
| `SS_CONFIRMED_PASSAGES_REPEATED` | Only previously confirmed passages were repeated |
| `SS_EDITORIAL_BLOCKED` | Required instruction/addition check prevented release |
| `SS_EDITORIAL_REVIEW_UNVERIFIED` | Editorial source-review outcome prevented release |
| `SS_SOURCE_REVIEW_REQUIRED` | Primary or insufficient-source boundary remains |
| `SS_READY` | Validated editable draft returned; therapist approval still required |

The usage prompt suffixes `/source-retry`, `/source-retry-repair`, and
`/editorial-review` distinguish model-call stages without storing their content.

## Validation and release limits

Synthetic route/client tests cover transcript inclusion, Zoom-note exclusion,
strict repair, unsafe/truncated output rejection, repeated versus new passages,
source-version mismatch, diagnostic privacy and unchanged saved review/draft.
The broader selected regression run reproduces the baseline's three Node failures
in `client-summary-generation-flow.test.js` and five component failures in the
longitudinal authoring cases of `globalSummaryRoutes.spec.js`.

The production bundle builds and `npm audit` reports no vulnerabilities. The
existing Windows prebuild wrapper cannot launch `npm.cmd`; audit and Vite build
were also run separately. A Ready preview establishes deployability, not success
on the affected encounter. Production deployment and a therapist-initiated
verification of that encounter remain separate release steps.
