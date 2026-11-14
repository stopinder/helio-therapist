# Therapy Focus over time

The client overview shows one current entry per clinical category, including change and learning even when other entries were edited more recently. Additional entries remain available in the full Therapy Focus. Missing categories are explicit; they do not imply that a clinical phenomenon is absent.

Review with Helios defaults to the entire available history and meaningful updates. Evidence remains reviewed Session Captures or transcript-backed session summaries. Raw unreviewed transcripts are not silently incorporated. The review reports selected and total recorded session counts and source dates. A single source is a snapshot rather than an observed longitudinal pattern.

The shared authoring prompt distinguishes observations, tentative formulations, proposed/agreed/tried interventions, reported outcomes, actual learning, uncertainty and grounded next-session threads. It requires dates for comparisons and preserves client priorities. Missing or invalid source references cause a history suggestion to be dropped. This is structural validation, not a guarantee that a model's clinical interpretation is correct; therapist review remains required.

Accepted items persist source metadata and the review's coverage snapshot in `client_care_items.evidence`. Existing entries are unchanged and explicitly show unknown evidence coverage. The overview flags recorded sessions outside the latest saved review; it does not claim to detect every subsequent edit to a source. Rerun Review with Helios to refresh clinical content, then accept and save the appropriate changes.

`save_reviewed_care_item` checks ownership and session provenance and atomically archives a replaced entry while inserting its successor. Earlier entries remain in history. Successful items are marked saved immediately during batch saves, preventing their duplication on a retry after a later failure. The additive migration must precede application deployment.
