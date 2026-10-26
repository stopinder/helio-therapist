# Ask Helios: general research workflow

Preview implementation; not a production release. Replaces topic-by-topic query rules and supersedes the unmerged patch in PR #289. Reflect prompt work in PR #288 remains separate.

## Flow
1. Authenticate and validate ownership/mode of the saved Research conversation before any spending. Read only that research history, never client records or browser-injected history.
2. Reserve one existing ask_helios.research action. Use the existing OPENAI_API_KEY and existing paid/Free model selection.
3. Obtain a structured question-specific search plan: standalone question, evidence needs, and up to two short queries. No diagnosis or therapy dictionaries.
4. Retrieve PubMed and Europe PMC metadata/abstracts, interleave search results and deduplicate. Preserve all labelled PubMed abstract sections, including results and conclusions.
5. Assess relevance and coverage. Permit one refined search round (up to two new queries) when findings are missing, irrelevant or one-sided.
6. Synthesize supplied abstracts. Findings paragraphs require real source IDs; the server constructs the reference links from provider metadata. Invalid source IDs reject the answer rather than deleting markers and retaining unsupported prose.
7. Save the answer/references under therapist RLS. Saving errors preserve the answer with a visible warning.

## Bounds
- Three model calls maximum: planning, assessment, synthesis. One allowance reservation and one aggregated usage event.
- Free: existing 12,000-character aggregate input cap and 1,000 allocated output tokens shared across stages (220/180/600). Existing gpt-4o-mini model unchanged.
- Paid: existing configured Research model; 30,000 input characters and 2,400 allocated output tokens in total.
- Workflow deadline: 55 seconds. Research function duration: 60 seconds. Bounded provider calls and no silent model retries.
- NCBI requests paced within each running process. This is not a distributed IP-wide rate limiter; provider throttling remains a disclosed service limitation.
- As with existing failed AI calls, an attempted request remains charged after reservation, even if later retrieval is empty or fails: the planning step now itself uses AI. No skipBudget flag or quota bypass.

## Honesty and safety
A real reference verifies provenance, not the correctness of every clinical inference. Relevance decisions and synthesis are still model-generated and need clinical judgement. Answers identify abstract/metadata access, not a full-text appraisal or systematic review.

Successful empty searches, provider failures, missing abstracts, invalid model JSON and invalid citations are distinct outcomes. Models cannot choose arbitrary external domains, execute tools, modify diagnoses or write clinical records. Planning requests removal of identifiers, but this is not guaranteed de-identification; do not include identifying client material in research questions.

## Verification
Automated tests cover general plan validation, one-sided/empty-result refinement, outages, structured abstracts, source validation, exact aggregate budgets and one credit per request. Actual handler tests cover auth, cross-user denial, cross-mode denial, trusted history and save failure.

Full local baseline: 755 Node tests and 102 Vue tests passed; the changed focused workflow suite also passed after the final refinements; production build passed. Public-database smoke checks retrieved abstracts for mortality, therapy comparison and alliance repair queries. These use manually supplied queries and are not full AI-answer verification.

Optional developer connectivity check (no credentials, AI usage or client data):

    node scripts/smoke-research-retrieval.mjs "a public bibliographic query"

The practical acceptance test is the actual Ask Helios Research panel in the new preview. Test a comparison, an outcome question, an unrelated professional topic and a follow-up. Inspect findings against the cited papers. No new key, separate evaluation service, dependency or database migration is required. Do not merge until accepted.
