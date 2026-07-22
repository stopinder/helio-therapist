import crypto from 'crypto'
import { getSupabaseClient } from './_lib/supabase.js'
import { calculatePhq9, isPhq9Definition } from '../src/lib/phq9.js'

const hash = token => crypto.createHash('sha256').update(String(token || '')).digest('hex')
const tokenFrom = value => String(value || '').trim()
const present = assignment => ({
  title: assignment.sent_snapshot?.title || assignment.resource_versions?.client_title || 'Questionnaire',
  description: assignment.sent_snapshot?.description || assignment.resource_versions?.client_description || '',
  instruction: assignment.client_requests?.therapist_instruction || assignment.therapist_instruction || '', dueAt: assignment.client_requests?.due_at || assignment.due_at || null,
  formDefinition: assignment.resource_versions?.form_definition || {}, status: assignment.status
})
async function findAssignment(supabase, token) {
  if (token.length < 32) return null
  const { data, error } = await supabase.from('client_request_items')
    .select('id,client_request_id,user_id,client_id,status,due_at,therapist_instruction,sent_snapshot,client_access_expires_at,resource_version_id,client_requests(therapist_instruction,due_at),resource_versions(resource_id,client_title,client_description,form_definition)')
    .eq('client_access_token_hash', hash(token)).maybeSingle()
  if (error) throw error
  if (!data || (data.client_access_expires_at && new Date(data.client_access_expires_at) < new Date())) return null
  return data
}

export default async function handler(req, res) {
  try {
    const token = tokenFrom(req.method === 'GET' ? req.query.token : req.body?.token)
    const supabase = getSupabaseClient(), assignment = await findAssignment(supabase, token)
    if (!assignment) return res.status(404).json({ error: 'This questionnaire link is unavailable. Please contact your therapist.' })
    if (req.method === 'GET') return res.status(200).json({ assignment: present(assignment) })
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
    if (['completed', 'awaiting_review', 'reviewed', 'cancelled'].includes(assignment.status)) return res.status(409).json({ error: 'This item has already been submitted.' })
    if (!isPhq9Definition(assignment.resource_versions?.form_definition)) return res.status(400).json({ error: 'This item cannot yet be completed in Helio.' })
    const score = calculatePhq9(req.body?.answers)
    if (!score) return res.status(400).json({ error: 'Please answer every question before submitting.' })
    const submittedAt = new Date().toISOString()
    const { data: response, error: responseError } = await supabase.from('client_resource_responses').insert({ assignment_id: assignment.id, user_id: assignment.user_id, response_kind: 'structured', structured_answers: req.body.answers, submitted_at: submittedAt }).select().single()
    if (responseError) throw responseError
    const { error: updateError } = await supabase.from('client_request_items').update({ status: 'awaiting_review', completed_at: submittedAt }).eq('id', assignment.id)
    if (updateError) throw updateError
    const { data: measureResult, error: resultError } = await supabase.from('outcome_measure_results').insert({ assignment_id: assignment.id, response_id: response.id, user_id: assignment.user_id, client_id: assignment.client_id, resource_id: assignment.resource_versions.resource_id, resource_version_id: assignment.resource_version_id, calculation_version: score.calculationVersion, scores: { total: score.total, itemScores: score.itemScores }, completed_at: submittedAt }).select('id').single()
    if (resultError) throw resultError
    // Completion is workflow state. The score is the clinical information worth carrying forward.
    const { error: eventError } = await supabase.from('client_timeline_events').insert({ user_id: assignment.user_id, client_id: assignment.client_id, client_request_id: assignment.client_request_id, client_request_item_id: assignment.id, event_type: 'outcome_measure_recorded', subject_type: 'measure_result', subject_id: measureResult.id, occurred_at: submittedAt, summary: `${present(assignment).title} score: ${score.total}` })
    if (eventError) throw eventError
    return res.status(201).json({ submitted: true })
  } catch (error) {
    console.error('[Client completion]', error)
    return res.status(error.status || 500).json({ error: error.message || 'Unable to submit this item.' })
  }
}
