# Working rules

## Clinical safety and truthfulness

- Never invent clinical data, risk, diagnosis, treatment plans, modality content, events, or client findings.
- Keep the clinical model minimal and CBT-first unless a therapist explicitly selects another supported tool or framework.
- Keep private therapist supervision/reflection separate from client records and client-facing material.
- Clearly label original transcripts as unchanged source material.
- Do not imply that AI has analysed, drafted, reviewed, or approved anything unless that action actually occurred and is visible to the therapist.
- No automatic clinical conclusion, risk decision, or record entry. The therapist interprets, decides, and relates.

## Product and interface rules

- Protect therapist attention; reduce clicks, context switching, and memory burden.
- Separate **retrieval** (Clients) from **attention** (Today).
- The client workspace is the default home for client-related material.
- Treat therapist-to-client worksheets, measures and returned material as a clinical exchange: reusable resource → versioned assignment → response → therapist review. Do not collapse this lifecycle into a generic document upload.
- Today is the time-based daily workspace. It is for preparation before an appointment, working through the day, and returning to orient after a session; it is not a duplicate task system.
- Inbox contains only real, actionable underlying state that requires a therapist decision or finishing action. It must not contain informational activity such as a completed sync, a client opening a resource, or an automatically generated item.
- The transcript flow is source-material triage inside Inbox. Hand off to Session Workspace after triage; do not expose transcripts as a separate product area.
- Client directory rows show one contextual cue only. They never become a dashboard of statuses, badges, or workflow history.
- Preserve normal Zoom functionality by opening Zoom separately; do not embed a fragile video call in Helio.
- Avoid client names in externally visible Zoom meeting titles.

## Engineering rules

- State whether a claim has been verified in code, deployed, or tested in production; do not collapse those into one claim.
- Keep changes small, reversible, and tied to a real therapist workflow.
- Do not expose secrets, `.env` files, service-role keys, meeting links, recordings, or clinical source material in the repository.
- Prefer durable, user-scoped server data for clinical records; do not silently rely on browser-local state as if it were a shared record.
