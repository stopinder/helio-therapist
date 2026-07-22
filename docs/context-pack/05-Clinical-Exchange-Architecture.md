# Clinical exchange architecture

## Decision

Resources, worksheets, measures, homework and returned files are one **clinical exchange** capability. They are not separate top-level applications and they are not aliases for the existing therapist-owned `documents` upload feature.

The flow is:

`Resource library → client request → request item → client response → therapist review → client timeline / Today when action is required`

The existing `documents` table remains appropriate for therapist-uploaded reports and approved documents. It must not be stretched to represent a reusable resource, a sent copy, a structured response, a score, or a review decision.

## Where it connects

| Existing area | Resource-exchange responsibility |
| --- | --- |
| Today | Shows only derived, actionable items: returned worksheet, uploaded document, completed measure, or an item needing follow-up. It never lists the whole library or every sent assignment. |
| Clients | No change. It remains retrieval only. |
| Client workspace | Timeline is the default clinical story. It contains contextual actions that open the shared Resource Picker; assignments appear as meaningful events, not as a document-type destination. |
| Timeline | Shows only clinically meaningful milestones: sent, completed/returned, reviewed, and discussed in a session. Delivery and reminder mechanics stay hidden unless they fail. |
| Sessions | An assignment or review may be linked to a session, but neither requires one. A therapist can explicitly mark a returned item as discussed in a session. |
| Messaging | No standalone Messages application. Sending is an assignment action; any later client-facing notification channel is delivery infrastructure, not a second resource model. |
| Existing documents | Remains a therapist-side report/document capability. A client-uploaded response belongs to an assignment response, even if its file storage is implemented using the same private-storage patterns. |

## Revised information architecture

Primary navigation remains **Today, Clients, Transcripts, Settings**. No Resources, Measures, Forms, Homework, Uploads or Documents item is added to primary navigation.

Within a selected client's workspace:

`Timeline | Sessions` (with **Clinical** reserved only if it later earns a distinct clinical purpose).

Timeline and an active session have one contextual action: **Send to client**. It opens the shared picker for supported resources, measures, questionnaires and documents. The assignment lifecycle remains sent, opened, in progress, completed, awaiting review, and reviewed, but it is shown through clinically meaningful timeline events rather than a tab.

The normal flow is deliberately short:

`Client workspace → Send to client → search or recent item → optional instruction → optional due date → Send`

The resource library is a contextual picker, reached from that action. It is not a folder browser in routine clinical work.

## Core data concepts

These concepts must remain distinct.

| Concept | Meaning | Key rule |
| --- | --- | --- |
| Resource | Reusable source material owned by a therapist: worksheet, psychoeducation, diagnostic tool, outcome measure, PDF, link, or therapist-authored item. | It is never the record that a client completed. |
| Resource version | Immutable publishable revision of a resource. Includes its form definition, scoring definition and/or source file. | Editing creates a new version. |
| Client request | One clinician send action for one client. | Owns recipient, shared instruction, due date, delivery channel and sent metadata. |
| Client request item | One exact resource version included in a request. | Owns its snapshot, completion link and independent lifecycle. |
| Response | The client’s structured answers and/or returned work. | Belongs to a request item, never directly to the library item. |
| Response file | A scanned worksheet, photo, completed PDF, external report or other uploaded return. | Kept privately and attached to the response. |
| Measure result | A structured interpretation-ready result: raw item answers, calculation version, score(s), and completion time. | Helio calculates and organises; it does not diagnose. |
| Review | A therapist’s state and timestamp, with optional internal note. | It is separate from completion. |
| Timeline event | A concise, clinically useful historical event. | Derived or written only for meaningful milestones. |
| Attention item | A derived next action, such as "PHQ-9 completed — review." | Not a generic stored task list. |

## Versioning and outcome measures

An assignment permanently references `resource_version_id` and also stores a client-facing snapshot. Later edits to a resource create another version and cannot alter an earlier assignment, response, score, or timeline history.

Measures are resources with `resource_kind = outcome_measure` and a structured form definition. Their version stores:

- item and response definitions;
- a scoring definition and calculation version;
- score labels only where clinically approved; and
- whether repeat comparison is supported.

Each submitted structured response preserves raw answers plus calculated score data. Repeated comparisons query completed responses for the same measure identity and calculate change over time. The interface should present values, dates and change—not diagnoses, automatic risk conclusions, or treatment recommendations.

## Required journeys

1. **Send resources** — therapist opens a client, selects one or more resources, adds an optional shared instruction/due date, and sends. One client request, individual request items and meaningful “resource sent” timeline events are created.
2. **Assign a measure** — same flow, with a measure-specific completion expectation. The assignment carries the exact measure/scoring version.
3. **Complete in Helio** — client opens a structured assignment through an opaque, expiring link, submits answers, and receives clear confirmation. A response, any permitted score, and an awaiting-review state are created.
4. **Upload a completed copy** — client opens the assignment, chooses upload, adds one or more permitted files, and submits. The files attach to the response, not to general Documents.
5. **Review a returned item** — therapist opens it from Timeline or Today, reviews the response and explicitly marks it reviewed.
6. **See a measure before a session** — Today shows “measure completed — review” until reviewed. The appointment preparation context may also surface that one relevant pending item.
7. **Compare measures** — therapist opens a repeated measure’s history and sees completion dates, results and change calculated from the same measure identity/version family.
8. **Discuss in session** — therapist explicitly records “discussed during session” against a completed assignment; the client timeline shows that meaningful event.

## Implementation status and next routes/components

Built therapist routes/components:

- `ResourcePicker.vue` — shared contextual picker. Selection is a single draft state shared by results and the **Selected** summary; optional instruction and due date appear only after an item is selected. It groups recent items, measures, worksheets, psychoeducation, sleep, behavioural experiments and custom resources.
- `GET/POST /api/resources` — therapist-owned reusable resource creation and contextual picker data.
- `GET/POST/PATCH /api/resource-assignments` — request creation, independently actionable request items, review queue and therapist review state.
- `GET /api/client-timeline` — clinically meaningful exchange history for the selected client.

Built therapist review path:

- `NeedsAttention.vue` opens a completed structured response, shows the submitted PHQ-9 answers and calculated total with a clear non-diagnostic boundary, and lets the therapist explicitly mark it reviewed. That removes the derived Today item and writes the meaningful reviewed Timeline event.

Next therapist component:

- `MeasureHistory.vue` — repeated-measure comparison, introduced after reliable scoring data exists.

Client-facing route/components now built for the constrained first measure:

- `/complete?token=…` — an opaque, assignment-specific link, hashed at rest and expiring after 30 days;
- `ClientCompletion.vue` — mobile-first PHQ-9 completion and confirmation;
- `POST /api/client-completion` — validates all nine answers, stores raw answers and calculated score, transitions the assignment to awaiting review, and writes one clinically meaningful Timeline event.

This is not a general client portal: it does not expose the client record, library, attachments or other assignments. Email delivery is not yet implemented; the therapist copies the one-time assignment link through their chosen approved channel.

If a client gives a non-zero answer to PHQ-9 item 9, the completion form immediately tells them not to wait for therapist review and to use local emergency/crisis support if they may harm themselves or cannot stay safe. Helio still does not treat the score or that response as an automated clinical conclusion.

Server endpoints to introduce with those screens:

- `GET /api/resource-assignments/:id`
- `POST /api/resource-assignments/:id/responses`
- `POST /api/resource-assignments/:id/review`
- `GET /api/measures/:resourceId/history?clientId=`

All must authorise against the authenticated therapist or the future, deliberately designed client-access mechanism. A random client ID alone is never authorisation.

## Reserved persistence model

Migration `20260721120000_add_clinical_resource_exchange_architecture.sql` reserves:

- `resource_library_items` and immutable `resource_versions`;
- `client_resource_assignments`;
- `client_resource_responses` and `client_response_files`;
- `outcome_measure_results`; and
- `client_timeline_events` for clinically meaningful events.

Migration `20260722100000_add_client_requests_and_request_items.sql` evolves this without discarding existing clinical records. `client_requests` is the shared send envelope; the former assignment records are renamed `client_request_items`, retaining all existing response, score and token links. New timeline events reference the item and optionally the parent request. A read-only compatibility view preserves the former `client_resource_assignments` name during rollout.

It deliberately does **not** add generic tasks, messages, reminders, client logins, email delivery, or a public client upload endpoint. The initial row-level policies are therapist-owned only, so deploying the schema cannot accidentally expose clinical records to a client.

## Phased implementation

### Phase 1a — therapist assignment and timeline foundation — complete

- Small therapist-owned resource library and contextual picker.
- Send one or more exact immutable resource versions in one client request, with shared optional instruction and due date; each item progresses independently.
- Contextual actions in Timeline and an active session, all using the same picker.
- Resource-sent and reviewed events displayed in Timeline; completed/returned event shapes are reserved for secure client return.
- Completed/returned assignments surface in Today while awaiting review; reviewed items leave Today and remain in Timeline.
- Dedicated, therapist-owned persistence schema with no client exposure.

### Phase 1b — secure structured return — partially complete

- PHQ-9 can be completed in Helio through an opaque, expiry-bound assignment link; raw answers and an auditable calculation version are saved.
- Completion creates the derived Today review action and Timeline event; existing therapist review removes it from Today.
- The first mobile form includes immediate urgent-support guidance for a non-zero response to item 9; it is not an emergency service and does not automate a clinical risk conclusion.
- Next: client uploads, authenticated portal/consent decisions, measure history, and a clear review/discussion-in-session control.

### Phase 2 — structured measures

- Validated form definitions and transparent scoring implementation.
- Outcome-measure results, completion dates and therapist review state.
- Repeated-measure history and simple change-over-time view.
- Session association and “discussed in session.”

### Phase 3 — library maturity

- Therapist resource authoring and version publishing.
- Templates, folders/tags used only inside the picker, and recent/favourites.
- Delivery reminders and failure visibility.
- More than one response/revision where clinically needed.

## Explicit boundaries

- No diagnosis, automated clinical judgement, or risk conclusion from a score.
- No generic Document record in place of an assignment/response/review lifecycle.
- No top-level Resources or Measures app.
- The only unauthenticated client surface is an opaque, expiring, assignment-specific PHQ-9 completion link; it reveals no general client information and accepts no files.
- No low-value operational events in the timeline.
