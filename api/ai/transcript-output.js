import OpenAI from 'openai'
import { requireAuthenticatedUser } from '../_lib/supabase.js'
import {
  MAX_OUTPUT_CHARACTERS,
  TRANSCRIPT_LENSES,
  TRANSCRIPT_OUTPUT_MODEL,
  TRANSCRIPT_OUTPUT_PROMPT_VERSION,
  buildTranscriptClinicalInput,
  isSupportedTranscriptLens,
  transcriptClinicalOutputSystemPrompt,
  validateTranscriptClinicalOutput,
  validateTranscriptSource
} from '../_lib/transcript-clinical-output.js'

const outputFields = 'id, transcript_id, client_id, session_id, lens, version, generation_status, generated_content, edited_content, model, prompt_version, failure_code, created_at, updated_at, approved_at'

function serialiseOutput(row) {
  return {
    id: row.id,
    transcriptId: row.transcript_id,
    clientId: row.client_id,
    sessionId: row.session_id,
    lens: row.lens,
    lensLabel: TRANSCRIPT_LENSES[row.lens]?.label || row.lens,
    version: row.version,
    status: row.generation_status,
    generatedContent: row.generated_content,
    content: row.edited_content,
    model: row.model,
    promptVersion: row.prompt_version,
    failureCode: row.failure_code,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    approvedAt: row.approved_at
  }
}

function apiError(status, code, message) {
  const error = new Error(message)
  error.status = status
  error.code = code
  return error
}

function normaliseContent(value) {
  const content = typeof value === 'string' ? value.trim() : ''
  if (!content || content.length > MAX_OUTPUT_CHARACTERS) {
    throw apiError(422, 'INVALID_DRAFT', `Draft content must be between 1 and ${MAX_OUTPUT_CHARACTERS} characters.`)
  }
  return content
}

async function readOutput(supabase, outputId, userId) {
  const { data, error } = await supabase
    .from('transcript_clinical_outputs')
    .select(outputFields)
    .eq('id', outputId)
    .eq('therapist_user_id', userId)
    .maybeSingle()
  if (error) throw error
  if (!data) throw apiError(404, 'OUTPUT_NOT_FOUND', 'Clinical draft not found.')
  return data
}

async function listOutputs(supabase, userId, query) {
  let request = supabase
    .from('transcript_clinical_outputs')
    .select(outputFields)
    .eq('therapist_user_id', userId)
    .order('created_at', { ascending: false })

  if (query.transcriptId) request = request.eq('transcript_id', query.transcriptId)
  if (query.sessionId) request = request.eq('session_id', query.sessionId)
  if (query.approved === 'true') request = request.eq('generation_status', 'approved')

  if (!query.transcriptId && !query.sessionId) {
    throw apiError(400, 'MISSING_CONTEXT', 'A transcript or session id is required.')
  }

  const { data, error } = await request
  if (error) throw error
  return (data || []).map(serialiseOutput)
}

async function createOutput(req, supabase, user) {
  const transcriptId = typeof req.body?.transcriptId === 'string' ? req.body.transcriptId : ''
  const lens = req.body?.lens
  const sourceRetention = req.body?.sourceRetention || 'keep_until_review'
  const allowedRetention = new Set(['keep_until_review', 'delete_after_approved_output'])
  if (!transcriptId) throw apiError(400, 'TRANSCRIPT_REQUIRED', 'A transcript id is required.')
  if (!isSupportedTranscriptLens(lens)) throw apiError(400, 'LENS_UNSUPPORTED', 'Choose a supported clinical lens.')
  if (!allowedRetention.has(sourceRetention)) throw apiError(400, 'RETENTION_UNSUPPORTED', 'Choose a supported source-retention preference.')
  if (!process.env.OPENAI_API_KEY) {
    console.error('[Transcript Clinical Output] OPENAI_API_KEY is missing')
    throw apiError(503, 'SERVICE_UNAVAILABLE', 'Draft generation is not available right now. Please try again later.')
  }

  const { data: transcript, error: transcriptError } = await supabase
    .from('zoom_transcripts')
    .select('id, original_transcript, client_id, session_ref')
    .eq('id', transcriptId)
    .eq('therapist_user_id', user.id)
    .maybeSingle()
  if (transcriptError) throw transcriptError
  if (!transcript) throw apiError(404, 'TRANSCRIPT_NOT_FOUND', 'Transcript not found.')
  if (!transcript.client_id || !transcript.session_ref) {
    throw apiError(409, 'TRANSCRIPT_NOT_LINKED', 'Assign a client and link a session before preparing a draft.')
  }

  const source = validateTranscriptSource(transcript.original_transcript)
  if (!source.valid) throw apiError(422, source.code, source.message)

  const { data: pending, error: pendingError } = await supabase.rpc('create_transcript_clinical_output', {
    p_user_id: user.id,
    p_transcript_id: transcriptId,
    p_lens: lens,
    p_model: TRANSCRIPT_OUTPUT_MODEL,
    p_prompt_version: TRANSCRIPT_OUTPUT_PROMPT_VERSION
  })
  if (pendingError) throw pendingError

  const pendingId = pending?.id
  if (!pendingId) throw apiError(500, 'DRAFT_CREATION_FAILED', 'The draft could not be prepared.')

  try {
    const { error: retentionError } = await supabase
      .from('zoom_transcripts')
      .update({ source_retention: sourceRetention, updated_at: new Date().toISOString() })
      .eq('id', transcriptId)
      .eq('therapist_user_id', user.id)
    if (retentionError) throw retentionError

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    const response = await openai.responses.create({
      model: TRANSCRIPT_OUTPUT_MODEL,
      temperature: 0.2,
      max_output_tokens: 2500,
      input: [
        { role: 'system', content: transcriptClinicalOutputSystemPrompt },
        { role: 'user', content: buildTranscriptClinicalInput(source.transcript, lens) }
      ]
    })
    const content = validateTranscriptClinicalOutput(response.output_text)
    if (!content) throw apiError(502, 'INVALID_AI_RESPONSE', 'The draft could not be prepared safely. Please try again.')

    const { data, error } = await supabase
      .from('transcript_clinical_outputs')
      .update({
        generation_status: 'draft',
        generated_content: content,
        edited_content: content,
        failure_code: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', pendingId)
      .eq('therapist_user_id', user.id)
      .eq('generation_status', 'generating')
      .select(outputFields)
      .maybeSingle()
    if (error) throw error
    if (!data) throw apiError(409, 'DRAFT_STATE_CHANGED', 'The draft changed before generation completed. Please try again.')
    return serialiseOutput(data)
  } catch (error) {
    const failureCode = error.code === 'INVALID_AI_RESPONSE' ? 'invalid_ai_response' : 'generation_failed'
    const { error: failureError } = await supabase
      .from('transcript_clinical_outputs')
      .update({
        generation_status: 'failed',
        failure_code: failureCode,
        updated_at: new Date().toISOString()
      })
      .eq('id', pendingId)
      .eq('therapist_user_id', user.id)
      .eq('generation_status', 'generating')
    if (failureError) console.error('[Transcript Clinical Output] Failed to record generation failure:', failureError.message)
    if (error.code === 'INVALID_AI_RESPONSE') throw error
    throw apiError(
      error.status === 429 ? 429 : 502,
      'AI_GENERATION_FAILED',
      'The draft could not be prepared. The original transcript was not changed; please try again.'
    )
  }
}

async function updateOutput(req, supabase, user) {
  const outputId = typeof req.body?.outputId === 'string' ? req.body.outputId : ''
  const action = req.body?.action
  const content = normaliseContent(req.body?.content)
  const sourceRetention = req.body?.sourceRetention || 'keep_until_review'
  if (!outputId) throw apiError(400, 'OUTPUT_REQUIRED', 'A clinical draft id is required.')
  if (!['save', 'approve'].includes(action)) throw apiError(400, 'ACTION_UNSUPPORTED', 'Choose save or approve.')
  if (action === 'approve' && !['keep_until_review', 'delete_after_approved_output'].includes(sourceRetention)) {
    throw apiError(400, 'RETENTION_UNSUPPORTED', 'Choose a supported source-retention preference.')
  }

  const functionName = action === 'approve'
    ? 'approve_transcript_clinical_output'
    : 'save_transcript_clinical_output_draft'
  const rpcArguments = {
    p_user_id: user.id,
    p_output_id: outputId,
    p_edited_content: content
  }
  if (action === 'approve') rpcArguments.p_source_retention = sourceRetention
  const { data, error } = await supabase.rpc(functionName, rpcArguments)
  if (error) throw error
  const row = await readOutput(supabase, data?.id || outputId, user.id)
  return serialiseOutput(row)
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('Content-Type', 'application/json')

  try {
    const { supabase, user } = await requireAuthenticatedUser(req)
    if (req.method === 'GET') {
      return res.status(200).json({ success: true, outputs: await listOutputs(supabase, user.id, req.query || {}) })
    }
    if (req.method === 'POST') {
      return res.status(201).json({ success: true, output: await createOutput(req, supabase, user) })
    }
    if (req.method === 'PATCH') {
      return res.status(200).json({ success: true, output: await updateOutput(req, supabase, user) })
    }
    return res.status(405).json({
      success: false,
      error: { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed.' }
    })
  } catch (error) {
    const status = error.status || (error.code === 'P0002' ? 404 : 500)
    if (status >= 500) console.error('[Transcript Clinical Output] Error:', error.message)
    return res.status(status).json({
      success: false,
      error: {
        code: status === 401 ? 'UNAUTHORIZED' : (error.code || 'TRANSCRIPT_OUTPUT_FAILED'),
        message: status === 401
          ? 'Please sign in again.'
          : status >= 500
            ? 'The draft could not be prepared. The original transcript was not changed; please try again.'
            : error.message
      }
    })
  }
}
