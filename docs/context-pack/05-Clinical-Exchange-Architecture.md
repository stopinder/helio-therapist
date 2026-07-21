# Clinical exchange architecture

## Decision

Resources, worksheets, measures, homework and returned files are one **clinical exchange** capability. They are not separate top-level applications and they are not aliases for the existing therapist-owned `documents` upload feature.

The flow is:

`Resource library → client assignment → client response → therapist review → client timeline / Today when action is required`

The existing `documents` table remains appropriate for therapist-uploaded reports and approved documents. It must not be stretched to represent a reusable resource, a sent copy, a structured response, a score, or a review decision.

## Where it connects

| Existing area | Resource-exchange responsibility |
| --- | --- |
| Today | Shows only derived, actionable items: returned worksheet, uploaded document, completed measure, or an item needing follow-up. It never lists the whole library or every sent assignment. |
| Clients | No change. It remains retrieval only. |
| Client workspace | Add a **Resources & measures** client view. It lists that client's assignments and provides the brief **Send to client** flow. |
| Timeline | Shows only clinically meaningful milestones: sent, completed/returned, reviewed, and discussed in a session. Delivery and reminder mechanics stay hidden unless they fail. |
| Sessions | An assignment or review may be linked to a session, but neither requires one. A therapist can explicitly mark a returned item as discussed in a session. |
| Messaging | No standalone Messages application. Sending is an assignment action; any later client-facing notification channel is delivery infrastructure, not a second resource model. |
| Existing documents | Remains a therapist-side report/document capability. A client-uploaded response belongs to an assignment response, even if its file storage is implemented using the same private-storage patterns. |

## Revised information architecture

Primary navigation remains **Today, Clients, Transcripts, Settings**. No Resources, Measures, Forms, Homework, Uploads or Documents item is added to primary navigation.

Within a selected client's workspace:

`Timeline | Sessions | Resources & measures | Documents`

**Resources & measures** is the client-specific working list. Its states are:

- Sent
- Opened
- In progress
- Completed
- Awaiting review
- Reviewed

Its primary action is **Send to client**. The normal flow is deliberately short:

`Client workspace → Send to client → search or recent item → optional instruction → optional due date → Send`

The resource library is a contextual picker, reached from that action. It is not a folder browser in routine clinical work.

## Core data concepts

These concepts must remain distinct.

| Concept | Meaning | Key rule |
| --- | --- | --- |
| Resource | Reusable source material owned by a therapist: worksheet, psychoeducation, diagnostic tool, outcome measure, PDF, link, or therapist-authored item. | It is never the record that a client completed. |
| Resource version | Immutable publishable revision of a resource. Includes its form definition, scoring definition and/or source file. | Editing creates a new version. |
| Assignment | A client-specific send of one exact resource version, with optional instruction and due date. | Holds a snapshot of the sent version's client-facing details. |
| Response | The client’s structured answers and/or returned work. | Belongs to an assignment, never directly to the library item. |
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

1. **Send a resource** — therapist opens a client, selects **Send to client**, searches or chooses a recent resource, adds optional instruction/due date, and sends. An assignment and “resource sent” timeline event are created.
2. **Assign a measure** — same flow, with a measure-specific completion expectation. The assignment carries the exact measure/scoring version.
3. **Complete in Helio** — client opens a structured assignment, saves progress where allowed, submits answers, and receives clear confirmation. A response, any permitted score, and an awaiting-review state are created.
4. **Upload a completed copy** — client opens the assignment, chooses upload, adds one or more permitted files, and submits. The files attach to the response, not to general Documents.
5. **Review a returned item** — therapist opens it from Resources & measures, Timeline, or Today; reviews the response and explicitly marks it reviewed.
6. **See a measure before a session** — Today shows “measure completed — review” until reviewed. The appointment preparation context may also surface that one relevant pending item.
7. **Compare measures** — therapist opens a repeated measure’s history and sees completion dates, results and change calculated from the same measure identity/version family.
8. **Discuss in session** — therapist explicitly records “discussed during session” against a completed assignment; the client timeline shows that meaningful event.

## Routes, screens and components to add in implementation

Therapist routes/components:

- `ClientResourcesMeasures.vue` — the client-specific list and state filters.
- `SendResourceDialog.vue` — recent items, search, optional instruction/due date, and send confirmation.
- `ResourcePicker.vue` — contextual library search, never a primary page.
- `AssignmentReview.vue` — therapist review of structured answers and returned files.
- `MeasureHistory.vue` — repeated-measure comparison, introduced after reliable scoring data exists.

Client-facing routes/components (only after client authentication and consent boundaries are designed):

- `/client/assignments/:accessToken` or an authenticated client-portal equivalent;
- `ClientAssignmentView.vue` — structured completion or upload return;
- `ClientUploadResponse.vue` — private attachment upload and confirmation.

Server endpoints to introduce with those screens:

- `GET /api/resources?recent=1&q=`
- `POST /api/resource-assignments`
- `GET /api/clients/:clientId/resource-assignments`
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

It deliberately does **not** add generic tasks, messages, reminders, client logins, email delivery, or a public client upload endpoint. The initial row-level policies are therapist-owned only, so deploying the schema cannot accidentally expose clinical records to a client.

## Phased implementation

### Phase 1 — useful clinical exchange

- Resource picker with a small therapist-owned library and recent resources.
- Send an exact resource version to a selected client.
- Client completes one structured item in Helio **or** uploads a completed copy.
- Therapist sees it in Resources & measures, reviews it, and sees the review action in Today.
- Timeline records sent, returned/completed and reviewed.

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
- No client access until authentication, consent, retention and out-of-hours boundaries are designed.
- No low-value operational events in the timeline.
