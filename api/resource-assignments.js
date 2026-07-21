import { requireAuthenticatedUser } from './_lib/supabase.js'

const clean = (value, maximum = 1200) => String(value || '').trim().slice(0, maximum)

export default async function handler(req, res) {
  try {
    const { supabase, user } = await requireAuthenticatedUser(req)
    if (req.method === 'GET') {
      if (req.query.needsAttention === 'true') {
        const { data, error } = await supabase.from('client_resource_assignments')
          .select('id,client_id,status,completed_at,sent_at,resource_versions(client_title,resource_library_items(title,resource_kind))')
          .eq('user_id', user.id).in('status', ['completed', 'awaiting_review']).order('completed_at', { ascending: false })
        if (error) throw error
        return res.status(200).json({ assignments: data || [] })
      }
      const clientId = clean(req.query.clientId, 80)
      if (!clientId) return res.status(400).json({ error: 'Client is required.' })
      const { data, error } = await supabase
        .from('client_resource_assignments')
        .select('id,status,therapist_instruction,due_at,sent_at,opened_at,completed_at,reviewed_at,review_note,resource_versions(client_title,completion_mode,resource_library_items(title,resource_kind))')
        .eq('user_id', user.id).eq('client_id', clientId).order('sent_at', { ascending: false })
      if (error) throw error
      return res.status(200).json({ assignments: data || [] })
    }
    if (req.method === 'PATCH') {
      const assignmentId = clean(req.body?.assignmentId, 80)
      const action = clean(req.body?.action, 40)
      if (!assignmentId || action !== 'mark_reviewed') return res.status(400).json({ error: 'A valid assignment review action is required.' })
      const { data: current, error: currentError } = await supabase.from('client_resource_assignments')
        .select('id,client_id,status,resource_versions(client_title)').eq('id', assignmentId).eq('user_id', user.id).maybeSingle()
      if (currentError) throw currentError
      if (!current) return res.status(404).json({ error: 'Assignment not found.' })
      const reviewedAt = new Date().toISOString()
      const { data: assignment, error } = await supabase.from('client_resource_assignments').update({ status: 'reviewed', reviewed_at: reviewedAt, reviewed_by: user.id, review_note: clean(req.body?.reviewNote) }).eq('id', assignmentId).eq('user_id', user.id).select().single()
      if (error) throw error
      const title = current.resource_versions?.client_title || 'Resource'
      const { error: timelineError } = await supabase.from('client_timeline_events').insert({ user_id: user.id, client_id: current.client_id, event_type: 'resource_reviewed', subject_type: 'assignment', subject_id: assignment.id, occurred_at: reviewedAt, summary: `${title} reviewed` })
      if (timelineError) throw timelineError
      return res.status(200).json({ assignment })
    }
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
    const clientId = clean(req.body?.clientId, 80)
    const resourceVersionId = clean(req.body?.resourceVersionId, 80)
    if (!clientId || !resourceVersionId) return res.status(400).json({ error: 'Client and resource are required.' })
    const [{ data: client, error: clientError }, { data: version, error: versionError }] = await Promise.all([
      supabase.from('clients').select('id').eq('id', clientId).eq('user_id', user.id).maybeSingle(),
      supabase.from('resource_versions').select('id,client_title,client_description,completion_mode,resource_id').eq('id', resourceVersionId).eq('user_id', user.id).maybeSingle()
    ])
    if (clientError) throw clientError
    if (versionError) throw versionError
    if (!client) return res.status(404).json({ error: 'Client not found.' })
    if (!version) return res.status(404).json({ error: 'Resource version not found.' })
    const sentSnapshot = { title: version.client_title, description: version.client_description, completionMode: version.completion_mode, resourceVersionId: version.id }
    const { data: assignment, error } = await supabase.from('client_resource_assignments').insert({
      user_id: user.id, client_id: clientId, resource_version_id: version.id, sent_snapshot: sentSnapshot,
      therapist_instruction: clean(req.body?.instruction), due_at: req.body?.dueAt || null
    }).select().single()
    if (error) throw error
    const { error: timelineError } = await supabase.from('client_timeline_events').insert({
      user_id: user.id, client_id: clientId, event_type: 'resource_sent', subject_type: 'assignment', subject_id: assignment.id,
      summary: `${version.client_title} sent to client`
    })
    if (timelineError) throw timelineError
    return res.status(201).json({ assignment })
  } catch (error) {
    console.error('[Resource assignments]', error)
    return res.status(error.status || 500).json({ error: error.message || 'Resource assignment request failed' })
  }
}
