# Open questions

Only unresolved decisions belong here. Completed decisions should be moved into the architecture notes or decision history.

## Product validation

1. Which three or four repeated workflows must be excellent for independent therapists to pay in the first release: transcript handling, session notes, preparation/continuity, documents, questionnaires, or something else?
2. What pricing and trial structure can test reduced administrative time, easier context recovery, and greater therapist presence without overpromising AI capability?

## Session and data model

3. What is the minimum durable Supabase session model: fields, ownership, retention, and audit needs, before moving session state out of browser local storage?
4. What should the explicit therapist-controlled retention choices be for transcript source material, notes, derived drafts, and generated documents?
5. Which timeline events are clinically useful enough to show by default, and which should remain hidden unless filtered?

## Messaging and client capabilities

6. When messaging is introduced, what safeguards, response expectations, consent language, and out-of-hours boundaries are required before it becomes a client-facing channel?
7. Which message, questionnaire, document, or appointment events should create a Today item, and when is an item considered resolved?

## Integrations and rollout

8. Does a real Zoom start-session and transcript-return test succeed after the required Zoom scope, re-consent, webhook, and database migration are complete?
9. What is the safest first production rollout and data-retention posture for a single therapist before supporting a wider pilot?

## Deferred business scope

10. When, if at all, should organisational and supervision pricing be designed after the single-therapist workspace is validated? Consumer discovery, academy, coaching, workforce intelligence, and broad behavioural-investigation products remain deferred.
