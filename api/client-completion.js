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
    const { data, error } = await supabase.rpc('submit_client_completion', {
      p_assignment_id: assignment.id,
      p_answers: req.body.answers,
      p_scores: { total: score.total, itemScores: score.itemScores },
      p_calculation_version: score.calculationVersion,
      p_submitted_at: submittedAt
    })
    if (error?.code === '23505') return res.status(409).json({ error: 'This item has already been submitted.' })
    if (error) throw error
    if (!data?.submitted) throw new Error('Completion transaction returned an invalid result.')
    return res.status(201).json({ submitted: true })
  } catch (error) {
    console.error('[Client completion]', error)
    return res.status(error.status || 500).json({ error: error.message || 'Unable to submit this item.' })
  }
}
