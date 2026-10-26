# NICE access in Ask Helios: external links only

## Implemented scope

Within the existing Research tab, a collapsible NICE guidance control opens the official NICE guidance library or a NICE search in a new tab. It is not a new sidebar section. The search field starts empty, is never populated from clinical records or chat, and is not persisted. Its reviewed topic is URL-encoded against the fixed official HTTPS host. No external request is made by this control until the clinician clicks a link. Links suppress the referrer.

An explicit NICE request in chat routes to Research, validates authentication and conversation ownership, and returns fixed official links before invoking the metered research workflow. The message explicitly says NICE content has not been read. A mixed NICE/literature request explains the boundary and invites a separate literature question; it does not manufacture a combined guideline answer. Ordinary literature requests keep the existing general PubMed/Europe PMC workflow.

Link replies use the existing owned chat history. Their metadata carries `kind: external_guidance`, which survives reloading. They are labelled as external guidance links rather than evidence references. No guideline IDs, titles, dates, recommendation text or version claims are invented.

## Deliberately not implemented

No scraping, guideline ingestion, caching, embeddings, AI summaries, NICE API access, licence application, new credentials, database changes or NICE branding. No claim of NICE endorsement or current guideline verification. Clinicians read recommendation wording, date/status, population and setting on the publisher's site.

Guideline-informed AI answers remain a separate, permission-dependent phase. Before implementing it, confirm the appropriate syndication licence, AI-use permissions, territory and cybersecurity requirements with NICE. Merely setting an environment variable is not evidence of permission.

Official policy references:
- https://www.nice.org.uk/reusing-our-content/nice-syndication-api
- https://www.nice.org.uk/reusing-our-content/nice-uk-open-content-licence
- https://www.nice.org.uk/reusing-our-content/use-of-our-content-internationally

Official outbound destinations:
- https://www.nice.org.uk/guidance
- https://www.nice.org.uk/search?q=<explicitly-entered-topic>

## Verification and acceptance

Automated tests cover fixed-host URL encoding, named-source routing without diagnosis lists, zero model calls for NICE requests, existing auth/ownership checks, correct link metadata after saving, preserved generic research handling, safe failure on persistence errors and UI input isolation. These tests do not certify NICE licensing or clinical recommendations.

Preview acceptance: open Ask Helios > Research > NICE guidance. Open the library, enter a non-identifying topic and follow Search NICE. In chat, ask `Find NICE guidance`, verify the boundary and official links, refresh and reopen the saved conversation. Repeat a normal literature query to confirm ordinary research remains available. The application does not read or summarise the external page.

This change is layered on PR #290's general research workflow. Do not merge either branch into production without release approval and the usual green checks.
