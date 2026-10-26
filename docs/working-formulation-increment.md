# Working formulations and in-session preparation

Increment 2 builds on the unmerged document workflow in PR #292. Preview only.

## User feedback and change

Summary options previously mounted the full-screen document composer. It now opens
an inline workbench inside the current session, without changing URL, obscuring the
session header or creating a modal. The existing summary remains available when
options are closed. Only Document and Perspective are initially shown. Session
selection, audience and extra context are disclosed on demand; the current audience,
selected session dates and any source limitations remain visible.

The full document composer remains available explicitly in Client Documents for
formatting and PDF finalisation. The inline workbench reuses the same preparation,
source validation, model, billing and draft-save services. It is not another AI path.

## Formulation boundary

Working formulation is a therapist-only purpose, enforced by the request contract.
It requires reviewed Session Captures (one to six), not raw transcripts. A single
capture can support an explicitly limited provisional formulation, never a claimed
longitudinal pattern. Current accepted Care is opt-in and identified as current,
not a historical snapshot. Private reflection and supervision tables are not read.

Sections distinguish recorded observations, tentative understanding, contrary
evidence and alternatives, resources, uncertainty, questions to review and relevant
recorded safety context. Unsupported sections should be omitted. Hypotheses are
labelled and cannot use the observation section in the structured contract. These
checks validate structure and source IDs, not truth, entailment or clinical quality.

## Separate client summary

The inline action creates a fresh preparation from only the selected session IDs,
anchor and perspective. It carries no formulation text, claims, previous draft
history, therapist additions or accepted Care hypotheses. Audience is client and
Care is off. Sources are freshly fetched with the client-facing field selection.
The internal draft is retained separately, including unsaved edits. Saving the
client summary creates a different document; nothing is sent to the client.

## Persistence and safety

Generation remains an unsaved draft in the inline workbench. Saving is explicit.
Previous versions, optimistic save checks, source fingerprint checks and existing
account isolation remain. Closing, changing session views and navigating away guard
unsaved work. No Care mutation, diagnosis entry, Clinical Record approval, schema
migration, model change or new credential is included. Care-plan proposals remain
increment 3 and are not implemented here.

## Acceptance

- Summary options stays on the same session URL; no full-screen composer opens.
- Two primary choices are visible; additional controls and provenance expand only on request.
- A working formulation distinguishes observations from hypotheses and preserves uncertainty.
- No unsupported recurrence is accepted from one capture; source dates respect the anchor.
- A separate client draft does not copy an internal formulation or its additions.
- Edits survive regeneration, restoration and saving/reopening; Care remains untouched.
- Software tests use fictional data. A signed-in model response still needs therapist review.
