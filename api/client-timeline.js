import { requireAuthenticatedUser } from './_lib/supabase.js'

const clean = (value, maximum = 80) => String(value || '').trim().slice(0, maximum)

export default async function handler(req, res) {
  try {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })
    const { supabase, user } = await requireAuthenticatedUser(req)
    const clientId = clean(req.query.clientId)
    if (!clientId) return res.status(400).json({ error: 'Client is required.' })
    const { data, error } = await supabase.from('client_timeline_events')
      .select('id,event_type,subject_type,subject_id,occurred_at,summary,session_id')
      .eq('user_id', user.id).eq('client_id', clientId).order('occurred_at', { ascending: false })
    if (error) throw error
    return res.status(200).json({ events: data || [] })
  } catch (error) {
    console.error('[Client timeline]', error)
    return res.status(error.status || 500).json({ error: error.message || 'Timeline request failed' })
  }
}
