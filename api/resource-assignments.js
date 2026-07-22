import { requireAuthenticatedUser } from './_lib/supabase.js'
import crypto from 'crypto'

const clean = (value, maximum = 1200) => String(value || '').trim().slice(0, maximum)
const tokenHash = token => crypto.createHash('sha256').update(token).digest('hex')
const idempotencyKey = value => clean(value, 160)

export default async function handler(req, res) {
  try {
    const { supabase, user } = await requireAuthenticatedUser(req)
    if (req.method === 'GET') {
      const assignmentId = clean(req.query.assignmentId, 80)
      if (assignmentId) {
        const { data, error } = await supabase.from('client_request_items')
          .select('id,client_request_id,client_id,status,sent_at,completed_at,reviewed_at,review_note,client_requests(therapist_instruction,due_at,delivery_channel),resource_versions(client_title,form_definition,resource_library_items(title,resource_kind)),client_resource_responses(id,response_kind,structured_answers,submitted_at),outcome_measure_results(scores,calculation_version,completed_at)')
          .eq('id', assignmentId).eq('user_id', user.id).maybeSingle()
        if (error) throw error
        if (!data) return res.status(404).json({ error: 'Assignment not found.' })
        return res.status(200).json({ assignment: data })
      }
      if (req.query.needsAttention === 'true') {
        const { data, error } = await supabase.from('client_request_items')
        .select('id,client_request_id,client_id,status,completed_at,sent_at,resource_versions(client_title,resource_library_items(title,resource_kind))')
          .eq('user_id', user.id).in('status', ['completed', 'awaiting_review']).order('completed_at', { ascending: false })
        if (error) throw error
        return res.status(200).json({ assignments: data || [] })
      }
      const clientId = clean(req.query.clientId, 80)
      if (!clientId) return res.status(400).json({ error: 'Client is required.' })
      const { data, error } = await supabase
        .from('client_request_items')
        .select('id,client_request_id,status,sent_at,opened_at,completed_at,reviewed_at,review_note,client_requests(therapist_instruction,due_at,delivery_channel),resource_versions(client_title,completion_mode,resource_library_items(title,resource_kind))')
        .eq('user_id', user.id).eq('client_id', clientId).order('sent_at', { ascending: false })
      if (error) throw error
      return res.status(200).json({ assignments: data || [] })
    }
    if (req.method === 'PATCH') {
      const assignmentId = clean(req.body?.assignmentId, 80)
      const action = clean(req.body?.action, 40)
      if (!assignmentId || action !== 'mark_reviewed') return res.status(400).json({ error: 'A valid assignment review action is required.' })
      const { data: current, error: currentError } = await supabase.from('client_request_items')
        .select('id,client_request_id,client_id,status,resource_versions(client_title)').eq('id', assignmentId).eq('user_id', user.id).maybeSingle()
      if (currentError) throw currentError
      if (!current) return res.status(404).json({ error: 'Assignment not found.' })
      const reviewedAt = new Date().toISOString()
      const { data: assignment, error } = await supabase.from('client_request_items').update({ status: 'reviewed', reviewed_at: reviewedAt, reviewed_by: user.id, review_note: clean(req.body?.reviewNote) }).eq('id', assignmentId).eq('user_id', user.id).select().single()
      if (error) throw error
      return res.status(200).json({ assignment })
    }
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
    const clientId = clean(req.body?.clientId, 80)
    const resourceVersionIds = [...new Set((Array.isArray(req.body?.resourceVersionIds) ? req.body.resourceVersionIds : [req.body?.resourceVersionId]).map(id => clean(id, 80)).filter(Boolean))]
    const requestKey = idempotencyKey(req.headers['idempotency-key'] || req.body?.idempotencyKey)
    if (!clientId || !resourceVersionIds.length) return res.status(400).json({ error: 'Client and at least one resource are required.' })
    const [{ data: client, error: clientError }, { data: versions, error: versionError }] = await Promise.all([
      supabase.from('clients').select('id').eq('id', clientId).eq('user_id', user.id).maybeSingle(),
      supabase.from('resource_versions').select('id,client_title,client_description,completion_mode,resource_id,resource_library_items!inner(id,audience,resource_kind)').in('id', resourceVersionIds).eq('user_id', user.id)
    ])
    if (clientError) throw clientError
    if (versionError) throw versionError
    if (!client) return res.status(404).json({ error: 'Client not found.' })
    if ((versions || []).length !== resourceVersionIds.length) return res.status(404).json({ error: 'One or more resources could not be found.' })
    if (versions.some(version => version.resource_library_items?.audience === 'therapist')) return res.status(403).json({ error: 'Therapist-only resources cannot be sent to a client.' })
    const instruction = clean(req.body?.instruction), dueAt = req.body?.dueAt || null
    if (requestKey) {
      const { data: existing, error: existingError } = await supabase.from('client_requests').select('*,client_request_items(*)').eq('user_id', user.id).eq('idempotency_key', requestKey).maybeSingle()
      if (existingError) throw existingError
      if (existing) return res.status(200).json({ request: existing, assignments: existing.client_request_items, duplicate: true })
    }
    const { data: request, error: requestError } = await supabase.from('client_requests').insert({ user_id: user.id, client_id: clientId, therapist_instruction: instruction, due_at: dueAt, delivery_channel: 'copy_link', idempotency_key: requestKey || null }).select().single()
    if (requestError) throw requestError
    const tokens = versions.map(() => crypto.randomBytes(32).toString('base64url'))
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    const itemsToInsert = versions.map((version, index) => ({
      user_id: user.id, client_id: clientId, client_request_id: request.id, resource_version_id: version.id,
      sent_snapshot: { title: version.client_title, description: version.client_description, completionMode: version.completion_mode, resourceVersionId: version.id },
      client_access_token_hash: tokenHash(tokens[index]), client_access_expires_at: expiresAt
    }))
    const { data: assignments, error } = await supabase.from('client_request_items').insert(itemsToInsert).select()
    if (error) { await supabase.from('client_requests').delete().eq('id', request.id).eq('user_id', user.id); throw error }
    return res.status(201).json({ request, assignments, clientAccessTokens: tokens })
  } catch (error) {
    console.error('[Resource assignments]', error)
    return res.status(error.status || 500).json({ error: error.message || 'Resource assignment request failed' })
  }
}
