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
- Use Today only for a resource or measure that needs a clear therapist action, such as review or follow-up; do not duplicate the resource library there.
- Use Today only for real, actionable underlying state. It is not a duplicate task system.
- The Transcript Inbox is source-material triage only. Hand off to Session Workspace after triage.
- Preserve normal Zoom functionality by opening Zoom separately; do not embed a fragile video call in Helio.
- Avoid client names in externally visible Zoom meeting titles.

## Engineering rules

- State whether a claim has been verified in code, deployed, or tested in production; do not collapse those into one claim.
- Keep changes small, reversible, and tied to a real therapist workflow.
- Do not expose secrets, `.env` files, service-role keys, meeting links, recordings, or clinical source material in the repository.
- Prefer durable, user-scoped server data for clinical records; do not silently rely on browser-local state as if it were a shared record.
