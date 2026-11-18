import { SUMMARY_LENS_IDS, normalizeSummaryLens } from '../../src/lib/summaryLenses.js';
import { ACROSS_SESSION_REVIEW_VERSION, acrossSessionLensRule, buildAcrossSessionComparison } from './across-session-review.js';
import { summaryAuthoringPrompt, SUMMARY_POLICY_VERSION } from './summary-authoring-policy.js';
import { renderSummarySections } from '../../src/lib/summaryAuthoring.js';
import { summaryClinicalEvidence } from '../../src/lib/summaryEvidence.js';
import { isUnusableSummary } from '../../src/lib/summarySafety.js';
import { formatClinicalRecordForDocument } from '../../src/lib/clinicalRecordFormat.js';
export const CLIENT_SESSION_SUMMARY_PROMPT_VERSION = SUMMARY_POLICY_VERSION + '/' + ACROSS_SESSION_REVIEW_VERSION;
export const CLIENT_SESSION_SUMMARY_LENSES = SUMMARY_LENS_IDS;
export const CLIENT_SESSION_SUMMARY_FIELDS = Object.freeze(['opening','whatWeWorkedOn','patternsOverTime','changesAndExceptions','strengthsAndResources','perspectiveReflection','betweenSession','closing']);

const COMPARISON_TASKS = Object.freeze(['recurrence', 'change', 'stability', 'exceptions', 'resources', 'unfinished_threads', 'possible_connections']);
const CLIENT_SAFE_CARE_KINDS = new Set(['current_focus','shared_understanding','trying','change_noticed','learning','themes','interventions','outcomes']);
export const CLIENT_SESSION_SUMMARY_EVIDENCE_STRENGTHS = Object.freeze(['current_observation','recurring','explicit_change','accepted_care','therapist_guidance','tentative_connection']);
const EVIDENCE_STRENGTHS = new Set(CLIENT_SESSION_SUMMARY_EVIDENCE_STRENGTHS);

const lensRules = {
  clinical: `Clinical lens: prepare a formal, provisional clinical formulation/report from the assessment information actually supplied. Organise presenting difficulties, relevant psychosocial context, predisposing, precipitating and perpetuating factors where supported, protective factors, clinical course, assessment limits and the actual plan. Distinguish participant report, documented clinical observation and explanatory hypotheses. Formulation is not diagnosis: do not infer a disorder, mental-state examination, risk clearance, psychometric score, prognosis, causal developmental history or completed assessment. Missing assessment information remains unassessed or not established. Describe each participant fairly in joint work; never infer mutual responsibility for abuse. Use professional, precise, readable language appropriate to the selected audience; do not import private reflection or call a newly generated formulation an established shared understanding.
For the existing storage fields: opening and whatWeWorkedOn contain assessment purpose, presenting difficulties, relevant context and available evidence; patternsOverTime and perspectiveReflection contain the supported contributing/maintaining factors and provisional formulation, with alternatives; changesAndExceptions describes course, dated differences and their limits; strengthsAndResources contains protective factors; closing records material assessment limits and unresolved clinical questions without inventing absent findings; betweenSession records the actual plan and review arrangements.`,
  gentle_cbt: `Gentle CBT lens: where supported, map situation or trigger / antecedent -> thoughts, emotions and body responses -> behaviour or coping response -> short-term consequence and longer-term consequence. Notice repeated maintenance cycles, interruptions or exceptions to a cycle, experiments, coping responses and changes over time. Explicitly look for what interrupts the usual sequence and what the client learns from trying something different. When supported, recognise what the client noticed, tested or learned and what helped them respond with more choice, even if the difficulty continues. Describe this specifically, not as a success verdict or compulsory homework. Never manufacture a complete CBT sequence when evidence is missing, and never force CBT language into client-facing prose when ordinary language is clearer.`,
  integrative: `Integrative lens: do not force a single model. Focus on explicitly supported emotional, relational, behavioural and contextual themes, shifts in understanding, unfinished threads, resources and alternative possible meanings. Reflect observed self-understanding, relational awareness, care or capacity when meaningful to the client. Preserve ambiguity where more than one meaning remains plausible; do not impose a positive interpretation.`,
  internal_family_systems: `Internal Family Systems (IFS) lens: use IFS as an organising perspective across the clinically interpretive parts of the summary when the evidence supports it, rather than confining IFS to one theory paragraph. Notice the client's own descriptions of parts or inner positions, protective intentions, blending and unblending, polarisation between parts, burdens that are explicitly named, and moments of greater curiosity, compassion, calm, clarity, confidence, courage, creativity or connectedness.

When two or more inner positions are supported, describe the relationship between them: what each seems to want, fear, prevent or make possible, and how the polarisation affects the client's choices. Do not collapse the formulation into a single “problem part”. Prefer the client's own language for parts and plain client-facing language before technical IFS terminology. Treat parts as a therapeutic way of organising experience rather than literal entities.

Assume positive or protective intent only as a hypothesis to be explored, never as a fact. Do not label a part “saboteur”, “resistant”, “self-sabotaging”, dysfunctional or irrational as a clinical conclusion. If the client or therapist uses such a label, translate it into curious, non-adversarial language about what that response may be trying to accomplish or protect against.

Crucially, do not explain away genuine discernment as defence. Uncertainty, lack of attraction, incompatibility, anger, reluctance, caution, preference, or a wish for distance may be valid information rather than evidence of a protector. When both ordinary discernment and a protective explanation are plausible, hold both possibilities explicitly and do not privilege the IFS explanation.

Notice evidence of greater space around reactions, curiosity toward inner experience, compassion, clarity, calm, confidence, courage, creativity, connectedness or choice. If demonstrated, a client-facing summary can naturally name clarity, curiosity or compassion as a capacity the client showed, not merely as a technical marker; for example, distinguishing a reaction from the self or responding with care to a younger part. One grounded observation is enough. These may be described as movement toward less blending or greater Self-led capacity when the evidence clearly supports that reading, but do not declare a Self state or “Self energy” unless the source establishes it. Do not infer an exile, fixed protector role, trauma history, burden, or childhood origin unless the source supports it. Do not present a part's intention as fact when it has not been explored; use tentative language such as “this part may be trying to…”, “we wondered whether…”, or “another possibility is…”.

For patternsOverTime, describe a recurring polarisation or protective sequence only when it meets the same cross-session evidence threshold as any other pattern. For changesAndExceptions, look for supported signs of unblending, more choice, more curiosity, or a different relationship between parts rather than assuming symptoms have improved. For strengthsAndResources, when therapeutically useful include demonstrated clarity, curiosity, compassion, care, perspective or ability to notice and differentiate inner positions; avoid praising the client for simply mentioning parts. For betweenSession, include IFS-consistent reflection or curiosity only when it was actually discussed, agreed or clearly left unfinished in the evidence; do not invent parts work as homework.`,
  transactional_analysis: `Transactional Analysis (TA) lens: start with observable exchanges: what each person says or does, what reaction follows, and whether a more collaborative exchange becomes possible. Where the sources justify it, explore possible Parent, Adult and Child ego-state shifts; reciprocal or crossed transactions; repeated expectations, scripts or drivers; and moments of Adult-to-Adult communication. Present ego states and script meanings as tentative ways to understand the interaction, never fixed labels, diagnoses or established motives. Distinguish a reported relational sequence from any proposed explanation. Prefer a concrete description of what changed in an interaction over theoretical jargon. Do not import IFS-specific protector, exile, Self-energy, blending or unblending interpretations merely because earlier notes used that model. Where observed, reflect a moment of increased Adult awareness, ability to pause, recognition of a familiar transaction or movement towards clearer communication, without treating it as lasting change. A TA summary should offer a recognisably transactional interpretation without changing the underlying facts or inventing script history.`
};

export function clientSessionSummaryLensRule(lens = 'integrative') { return lensRules[normalizeSummaryLens(lens)] || lensRules.integrative; }
export function clientSessionSummarySystemPrompt(lens = 'integrative', options = {}) { return summaryAuthoringPrompt(clientSessionSummaryLensRule(lens), options, 'session_summary', normalizeSummaryLens(lens)); }

export function clientAcrossSessionReviewSystemPrompt(lens = 'integrative', options = {}) {
  return summaryAuthoringPrompt(clientSessionSummaryLensRule(lens) + '\nLONGITUDINAL LENS TASK\n' + acrossSessionLensRule(lens), options, 'across_session_review', normalizeSummaryLens(lens));
}

export function clientSessionSummaryResponseFormat(validSourceIds = []) {
  const sourceIds = [...new Set(
    [...validSourceIds]
      .filter(id => typeof id === 'string' && id.trim())
      .map(id => id.trim())
  )];
  if (!sourceIds.length) throw new Error('Client session summary schema requires at least one valid source ID');

  const sectionProperties = Object.fromEntries(
    CLIENT_SESSION_SUMMARY_FIELDS.map(field => [field, { type: 'string' }])
  );

  return {
    type: 'json_schema',
    json_schema: {
      name: 'helios_client_session_summary',
      strict: true,
      schema: {
        type: 'object',
        properties: {
          sections: {
            type: 'object',
            properties: sectionProperties,
            required: [...CLIENT_SESSION_SUMMARY_FIELDS],
            additionalProperties: false
          },
          claims: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                section: { type: 'string', enum: [...CLIENT_SESSION_SUMMARY_FIELDS] },
                text: { type: 'string' },
                sourceIds: {
                  type: 'array',
                  items: { type: 'string', enum: sourceIds }
                },
                evidenceStrength: { type: 'string', enum: [...CLIENT_SESSION_SUMMARY_EVIDENCE_STRENGTHS] }
              },
              required: ['section', 'text', 'sourceIds', 'evidenceStrength'],
              additionalProperties: false
            }
          }
        },
        required: ['sections', 'claims'],
        additionalProperties: false
      }
    }
  };
}

function clinicalDate(capture) { return capture?.occurredAt || capture?.occurred_at || capture?.sessions?.occurred_at || ''; }
export function selectClinicalIntelligenceSources(captures = [], { anchorSessionId = null, limit = 3 } = {}) {
  const ordered = [...captures].filter(item => item?.sessionId || item?.session_id).sort((a,b) => {
    const dateOrder=String(clinicalDate(b)).localeCompare(String(clinicalDate(a)));
    if(dateOrder)return dateOrder;
    return String(b.reviewedAt||b.reviewed_at||'').localeCompare(String(a.reviewedAt||a.reviewed_at||''));
  });
  const anchor = anchorSessionId ? ordered.find(item => (item.sessionId||item.session_id)===anchorSessionId) : ordered[0];
  if(!anchor)return [];
  const anchorDate=clinicalDate(anchor);
  const eligible = ordered.filter(item => String(clinicalDate(item))<=String(anchorDate));
  if(limit === null || limit === 'all' || limit === Infinity) return eligible;
  const count = Number.isFinite(Number(limit)) ? Math.max(1, Math.floor(Number(limit))) : 3;
  return eligible.slice(0, count);
}

export function buildClinicalIntelligenceSessionCandidates({ captures = [], summaryDocuments = [], sessions = [], transcriptRows = [], includeClinicalRecords = false } = {}) {
  const sessionDateById = new Map(
    sessions
      .filter(item => item?.id && item?.occurred_at)
      .map(item => [String(item.id), item.occurred_at])
  );
  const transcriptSessionById = new Map(
    transcriptRows
      .filter(item => item?.id && item?.session_ref)
      .map(item => [String(item.id), String(item.session_ref)])
  );
  const transcriptById = new Map(transcriptRows.filter(item => item?.id).map(item => [String(item.id), item]));
  const bySession = new Map();

  // Completed, saved Clinical Records are first-class source material for a
  // longitudinal therapist record. Draft or in-progress notes are never used.
  for (const session of includeClinicalRecords ? sessions : []) {
    const notes = formatClinicalRecordForDocument(session?.notes).trim();
    if (!session?.id || session.status !== 'completed' || session.notes_status !== 'saved' || !notes) continue;
    const sessionId = String(session.id);
    const occurredAt = session.occurred_at || '';
    if (!occurredAt) continue;
    bySession.set(sessionId, {
      session_id: sessionId,
      content: { existingClinicalRecord: notes },
      reviewed_at: session.completed_at || session.updated_at || occurredAt,
      sessions: { id: sessionId, occurred_at: occurredAt },
      evidence_source: 'clinical_record',
      source_types: ['clinical_record']
    });
  }

  for (const capture of captures) {
    const sessionId = String(capture?.session_id || capture?.sessionId || '');
    if (!sessionId) continue;
    const existing = bySession.get(sessionId);
    bySession.set(sessionId, existing ? {
      ...existing,
      ...capture,
      content: { ...(existing.content || {}), ...(capture.content || {}) },
      evidence_source: 'session_capture',
      source_types: [...new Set([...(existing.source_types || ['clinical_record']), 'session_capture'])]
    } : { ...capture, evidence_source: 'session_capture', source_types: ['session_capture'] });
  }

  const orderedDocuments = [...summaryDocuments].sort((a, b) =>
    String(b?.updated_at || b?.created_at || '').localeCompare(String(a?.updated_at || a?.created_at || ''))
  );

  for (const document of orderedDocuments) {
    if(isUnusableSummary(document.content))continue;
    const body = typeof document?.content?.body === 'string' ? document.content.body.trim() : '';
    if (!body) continue;
    const manifest = Array.isArray(document?.source_manifest) ? document.source_manifest : [];
    const transcriptSource = manifest.find(item => item?.kind === 'zoom_transcript' && (item?.sessionId || item?.id));
    if (!transcriptSource) continue;
    const sessionId = String(transcriptSource.sessionId || transcriptSessionById.get(String(transcriptSource.id || '')) || '');
    if (!sessionId) continue;
    const occurredAt = sessionDateById.get(sessionId) || transcriptSource.occurredAt || '';
    if (!occurredAt) continue;
    const linkedTranscript = transcriptSource.transcriptId || transcriptSource.id
      ? transcriptById.get(String(transcriptSource.transcriptId || transcriptSource.id))
      : null;
    const recordedVersion = transcriptSource.sourceVersion || transcriptSource.source_version;
    const staleSummary = Boolean(linkedTranscript && recordedVersion && String(recordedVersion) !== String(linkedTranscript.source_version));
    if (staleSummary) {
      // A changed transcript invalidates its derivative summary. Once the
      // therapist has confirmed the current source, use that source directly
      // for the longitudinal record instead of requiring a separate summary
      // regeneration first. Unresolved sources are still blocked at generation.
      const existing = bySession.get(sessionId);
      if (existing) {
        delete existing.content?.existingSessionSummary;
        existing.sourceDocumentId = null;
        existing.document_id = null;
        existing.document_status = null;
        existing.source_types = (existing.source_types || []).filter(type => type !== 'session_summary');
        if(existing.evidence_source==='session_summary')existing.evidence_source='zoom_transcript';
        existing.source_types = [...new Set([...(existing.source_types || []), 'zoom_transcript'])];
        existing.transcript_id = String(linkedTranscript.id);
        existing.transcript_version = linkedTranscript.source_version || null;
        existing.transcript_review_state = linkedTranscript.source_review?.state || 'unreviewed';
      } else {
        bySession.set(sessionId, {
          session_id: sessionId,
          content: {},
          reviewed_at: linkedTranscript.updated_at || occurredAt,
          sessions: { id: sessionId, occurred_at: occurredAt },
          evidence_source: 'zoom_transcript',
          source_types: ['zoom_transcript'],
          transcript_id: String(linkedTranscript.id),
          transcript_version: linkedTranscript.source_version || null,
          transcript_review_state: linkedTranscript.source_review?.state || 'unreviewed'
        });
      }
      continue;
    }
    const existing = bySession.get(sessionId);
    if(existing?.source_types?.includes('zoom_transcript'))continue;
    const summaryEvidence = {
      existingSessionSummary: body
    };
    if (existing) {
      if (!existing.content?.existingSessionSummary) {
        existing.content = { ...(existing.content || {}), ...summaryEvidence };
        existing.sourceDocumentId = existing.sourceDocumentId || document.id || null;
        existing.document_status = existing.document_status || document.status || 'draft';
        existing.source_types = [...new Set([...(existing.source_types || []), 'session_summary'])];
      }
      continue;
    }
    bySession.set(sessionId, {
      session_id: sessionId,
      content: summaryEvidence,
      reviewed_at: document.updated_at || document.created_at || occurredAt,
      sessions: { id: sessionId, occurred_at: occurredAt },
      evidence_source: 'session_summary',
      source_types: ['session_summary'],
      document_id: document.id || null,
      document_status: document.status || 'draft'
    });
  }

  return [...bySession.values()];
}

export function buildClinicalIntelligenceEvidenceMap({ captures = [], careItems = [], therapistGuidance = '' } = {}) {
  const reviewedSessions = captures.map((capture, index) => ({
    id: `session:${capture.sessionId || capture.session_id}`,
    sourceType: capture.sourceType || (capture.evidence_source === 'session_summary' ? 'transcript_backed_session_summary' : capture.evidence_source === 'zoom_transcript' ? 'current_transcript' : 'reviewed_session_capture'),
    position: index === 0 ? 'current' : `previous_${index}`,
    sessionId: capture.sessionId || capture.session_id || null,
    occurredAt: capture.occurredAt || capture.occurred_at || null,
    reviewedAt: capture.reviewedAt || capture.reviewed_at || null,
    sourceDocumentId: capture.sourceDocumentId || capture.document_id || null,
    sourceStatus: capture.sourceStatus || capture.document_status || null,
    sourceTypes: capture.source_types || [capture.evidence_source === 'session_summary' ? 'session_summary' : capture.evidence_source === 'clinical_record' ? 'clinical_record' : capture.evidence_source === 'zoom_transcript' ? 'zoom_transcript' : 'session_capture'],
    content: capture.content && typeof capture.content === 'object' ? {...capture.content, ...(typeof capture.content.existingSessionSummary === 'string' ? {existingSessionSummary:summaryClinicalEvidence(capture.content.existingSessionSummary)} : {}), ...(typeof capture.content.existingClinicalRecord === 'string' ? {existingClinicalRecord:summaryClinicalEvidence(capture.content.existingClinicalRecord)} : {})} : {}
  }));

  const currentAcceptedCareContext = careItems
    .filter(item => item?.body && (!item.status || item.status === 'current') && CLIENT_SAFE_CARE_KINDS.has(item.kind))
    .map(item => ({
      id: `care:${item.id || `${item.kind}:${item.provenance_session_id || 'current'}`}`,
      sourceType: 'accepted_care',
      kind: item.kind || null,
      content: String(item.body).trim()
    }));

  return {
    reviewedSessions,
    currentAcceptedCareContext,
    therapistAuthoredContext: {
      id: 'therapist:guidance',
      sourceType: 'therapist_guidance',
      content: String(therapistGuidance || '').trim().slice(0, 12000)
    },
    comparisonTasks: [...COMPARISON_TASKS]
  };
}

export function buildClientSessionSummaryInput({ lens = 'integrative', window = 'last_three', captures = [], careItems = [], therapistGuidance = '', refinementRequest = '', previousDraft = '', summaryOptions = {} }) {
  const evidenceMap = buildClinicalIntelligenceEvidenceMap({ captures, careItems, therapistGuidance });
  return JSON.stringify({
    task: window === 'current' ? 'Prepare structured Clinical Intelligence for a therapist-reviewable client summary.' : 'Prepare a therapist-facing longitudinal clinical record showing how therapy is developing across the selected encounters.',
    documentKind: window === 'current' ? 'session_summary' : 'across_session_review',
    selectedSessionCount: captures.length,
    ...(window !== 'current' ? { comparisonFrame: buildAcrossSessionComparison(captures) } : {}),
    lens,
    window,
    evidenceMap,
    editorialRefinement: refinementRequest.trim() ? {
      therapistApprovedRequest: String(refinementRequest).trim().slice(0, 1800),
      previousDraftForComparisonOnly: String(previousDraft).slice(0, 10000),
      boundary: 'This is an editorial request and prior draft, not clinical evidence. Ground clinical statements in selected sources. Label optional future exercises as proposed and unagreed.'
    } : null,
    editorialPreferences: { audience: summaryOptions.audience || 'auto', addition: summaryOptions.addition || 'none' },
    reasoningInstructions: {
      sequence: ['map evidence by source type', 'compare reviewed sessions', 'identify evidence strength', window === 'current' ? 'draft client-facing sections' : 'draft therapist-facing clinical record sections'],
      recurrenceThreshold: 'two or more session sources with substantially similar evidence',
      currentObservationRule: 'one-session evidence remains a current observation',
      connectionRule: 'possible connections remain tentative unless explicitly established',
      changeRule: 'change requires explicit comparative evidence; silence is not improvement'
    },
    outputFields: CLIENT_SESSION_SUMMARY_FIELDS
  });
}

function coerceClientSummaryText(value) {
  if (typeof value === 'string') return value;
  if (value == null) return '';
  if (Array.isArray(value) && value.every(item => typeof item === 'string')) return value.join('\n\n');
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    for (const key of ['text', 'content', 'body', 'summary', 'value']) {
      if (typeof value[key] === 'string') return value[key];
    }
  }
  return value;
}

export function normalizeClientSessionSummaryResponse(value) {
  let parsed = value;
  if (typeof parsed === 'string') {
    try { parsed = JSON.parse(parsed); } catch { return value; }
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return parsed;

  const normalized = { ...parsed };
  if (parsed.sections && typeof parsed.sections === 'object' && !Array.isArray(parsed.sections)) {
    normalized.sections = { ...parsed.sections };
    for (const key of CLIENT_SESSION_SUMMARY_FIELDS) {
      if (Object.prototype.hasOwnProperty.call(normalized.sections, key)) {
        normalized.sections[key] = coerceClientSummaryText(normalized.sections[key]);
      }
    }
  }

  if (Array.isArray(parsed.claims)) {
    normalized.claims = parsed.claims.map(claim => {
      if (!claim || typeof claim !== 'object' || Array.isArray(claim)) return claim;
      return { ...claim, text: coerceClientSummaryText(claim.text) };
    });
  }

  return normalized;
}

export function validateClientSessionSummaryResponse(value, validSourceIds = null) {
  let parsed=value; if(typeof value==='string'){try{parsed=JSON.parse(value)}catch{
    console.warn('[Session Summary] AI response validation failed: invalid_json');
    return null;
  }}
  if(!parsed||typeof parsed!=='object'||Array.isArray(parsed)) {
    console.warn('[Session Summary] AI response validation failed: invalid_claim_shape'); // or similar
    return null;
  }
  const sectionsInput=parsed.sections;
  if(!sectionsInput||typeof sectionsInput!=='object'||Array.isArray(sectionsInput)) {
    console.warn('[Session Summary] AI response validation failed: missing_sections');
    return null;
  }
  const keys=Object.keys(sectionsInput); if(keys.length!==CLIENT_SESSION_SUMMARY_FIELDS.length||!CLIENT_SESSION_SUMMARY_FIELDS.every(key=>keys.includes(key))) {
    console.warn('[Session Summary] AI response validation failed: invalid_section_keys');
    return null;
  }
  const sections={}; for(const key of CLIENT_SESSION_SUMMARY_FIELDS){if(typeof sectionsInput[key]!=='string') {
    console.warn(`[Session Summary] AI response validation failed: invalid_section_type (${key})`);
    return null;
  }sections[key]=sectionsInput[key].trim().slice(0,7000)}
  if(!Array.isArray(parsed.claims)) {
    console.warn('[Session Summary] AI response validation failed: invalid_claim_shape');
    return null;
  }
  const claims=[];
  for(const claim of parsed.claims){
    if(!claim||!CLIENT_SESSION_SUMMARY_FIELDS.includes(claim.section)||typeof claim.text!=='string'||!claim.text.trim()||!Array.isArray(claim.sourceIds)||!claim.sourceIds.length||!EVIDENCE_STRENGTHS.has(claim.evidenceStrength)) {
      console.warn('[Session Summary] AI response validation failed: invalid_claim_shape_or_strength');
      return null;
    }
    const sourceIds=[...new Set(claim.sourceIds.filter(id=>typeof id==='string'))];
    if(sourceIds.length!==claim.sourceIds.length||(validSourceIds&&sourceIds.some(id=>!validSourceIds.has(id)))) {
      console.warn('[Session Summary] AI response validation failed: invalid_source_id');
      return null;
    }
    let evidenceStrength=claim.evidenceStrength;
    const sessionSourceCount=sourceIds.filter(id=>id.startsWith('session:')).length;
    if(evidenceStrength==='recurring'&&sessionSourceCount<2) {
      if(sessionSourceCount===1) {
        console.warn('[Session Summary] AI response evidence strength repaired: recurring -> current_observation (single session source)');
        evidenceStrength='current_observation';
      } else {
        console.warn('[Session Summary] AI response validation failed: invalid_evidence_strength (recurring requires session evidence)');
        return null;
      }
    }
    if(!sections[claim.section].toLocaleLowerCase().includes(claim.text.trim().toLocaleLowerCase())) {
      console.warn('[Session Summary] AI response validation failed: claim_not_present_in_section');
      return null;
    }
    claims.push({section:claim.section,text:claim.text.trim().slice(0,2000),sourceIds,evidenceStrength});
  }
  for(const key of CLIENT_SESSION_SUMMARY_FIELDS)if(sections[key]&&!claims.some(claim=>claim.section===key)) {
    console.warn(`[Session Summary] AI response validation failed: missing_claim_for_nonempty_section (${key})`);
    return null;
  }
  return {sections,claims};
}

export function renderClientSessionSummary(sections, lens='integrative', documentKind='session_summary') { return renderSummarySections(sections, documentKind, lens); }
