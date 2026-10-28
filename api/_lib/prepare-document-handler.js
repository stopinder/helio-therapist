import { randomUUID } from 'node:crypto';
import { requireAuthenticatedUser, getSupabaseUserClient } from './supabase.js';
import { AI_FEATURES, runTextAI } from './ai-execution.js';
import { isBudgetError } from './ai-budget.js';
import { validatePreparation, preparationError } from '../../src/lib/documentPreparation.js';
import { loadDocumentCatalogue, prepareDocumentSources } from './document-sources.js';
import { DOCUMENT_PROMPT_VERSION, preparedDocumentPrompt, validatePreparedDocument } from './ai-prepared-document.js';

// Shared by both existing summary endpoints. No clinical/document writes here.
// Preview and catalogue calls never reserve an AI action or send source text to AI.
export async function handlePreparedDocument(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ success: false, error: { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed' } }); }
  try {
    const { user } = await requireAuthenticatedUser(req);
    const db = getSupabaseUserClient(req);
    const options = validatePreparation(req.body || {});
    if (req.body.preview !== undefined && typeof req.body.preview !== 'boolean') throw preparationError('INVALID_REQUEST', 'Invalid preview request.');
    if (req.body.catalogue !== undefined && typeof req.body.catalogue !== 'boolean') throw preparationError('INVALID_REQUEST', 'Invalid source-list request.');
    const catalogue = await loadDocumentCatalogue(db, user.id, options.clientId, options.anchorSessionId);
    if (req.body.catalogue === true) return res.status(200).json({ success: true, data: catalogue });
    const bundle = await prepareDocumentSources(db, user.id, options, catalogue);
    const metadata = { sources: bundle.manifest, sourceVersion: bundle.sourceVersion,
      sessionCount: bundle.selected.length, selectedSessionIds: bundle.selected.map(s => s.sessionId),
      anchorSessionId: bundle.selected[0]?.sessionId || null, warnings: bundle.warnings,
      documentPurpose: options.documentPurpose, lens: options.lens, audience: options.audience,
      window: options.window, includeCare: options.includeCare, promptVersion: DOCUMENT_PROMPT_VERSION };
    if (req.body.preview === true) return res.status(200).json({ success: true, data: metadata });
    if (typeof req.body.sourceVersion !== 'string' || req.body.sourceVersion !== bundle.sourceVersion) {
      throw preparationError('SOURCE_PREVIEW_CHANGED', 'The sources or options have changed. Refresh the source preview before generating.', 409);
    }
    const { completion, model } = await runTextAI({
      feature: AI_FEATURES.CLIENT_SESSION_SUMMARY, userId: user.id, promptVersion: DOCUMENT_PROMPT_VERSION,
      messages: [
        { role: 'system', content: preparedDocumentPrompt(options) },
        { role: 'user', content: JSON.stringify({ documentPurpose: options.documentPurpose, audience: options.audience,
          selectedSessionCount: bundle.selected.length, sources: bundle.sources }) }
      ], responseFormat: { type: 'json_object' }, temperature: 0.2, maxTokens: 4500, timeout: 60000
    });
    const draft = validatePreparedDocument(completion.choices?.[0]?.message?.content, bundle, options);
    return res.status(200).json({ success: true, data: { ...metadata,
      generationId: randomUUID(), generatedAt: new Date().toISOString(), model,
      draft: { body: draft.body, sections: draft.sections }, claims: draft.claims,
      usage: { inputTokens: Number(completion.usage?.prompt_tokens || 0), outputTokens: Number(completion.usage?.completion_tokens || 0) }
    } });
  } catch (error) {
    const timedOut = error.name === 'APITimeoutError' || [408, 504].includes(error.status) || error.code === 'ETIMEDOUT';
    const status = timedOut ? 504 : [400, 401, 403, 404, 409, 413, 429, 502, 503].includes(error.status) ? error.status : 500;
    const safe = isBudgetError(error) || String(error.code || '').startsWith('SOURCE_') ||
      ['INVALID_PREPARATION', 'INVALID_WINDOW', 'CLIENT_NOT_FOUND', 'SESSION_NOT_FOUND', 'NO_SESSION_SOURCE', 'UNREVIEWED_ANCHOR',
       'INVALID_SELECTION', 'FUTURE_SESSION', 'INSUFFICIENT_REVIEWED_SESSIONS', 'EMPTY_SOURCE', 'UNREVIEWED_SOURCE',
       'NO_SOURCE_MATERIAL', 'DOCUMENT_INPUT_TOO_LARGE', 'INVALID_AI_RESPONSE'].includes(error.code);
    console.error('[Prepare Document]', error.code || status);
    return res.status(status).json({ success: false, error: { code: error.code || (timedOut ? 'TIMEOUT' : 'PREPARATION_FAILED'),
      message: status === 401 ? 'Please sign in again.' : safe ? error.message : 'Document generation is temporarily unavailable. Your existing draft is unchanged.' } });
  }
}
