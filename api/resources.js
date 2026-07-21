import { requireAuthenticatedUser } from './_lib/supabase.js'
import { phq9Definition } from '../src/lib/phq9.js'

const KINDS = new Set(['worksheet', 'thought_record', 'behavioural_experiment', 'sleep_diary', 'psychoeducation', 'diagnostic_tool', 'outcome_measure', 'therapist_resource', 'document'])
const MODES = new Set(['structured', 'upload', 'either', 'read_only'])
const clean = (value, maximum = 160) => String(value || '').trim().slice(0, maximum)

export default async function handler(req, res) {
  try {
    const { supabase, user } = await requireAuthenticatedUser(req)
    if (req.method === 'GET') {
      const query = clean(req.query.q, 100)
      let request = supabase
        .from('resource_library_items')
        .select('id,title,resource_kind,description,updated_at,resource_versions(id,version_number,completion_mode,client_title,client_description,published_at,created_at)')
        .eq('user_id', user.id)
        .eq('archived', false)
        .order('updated_at', { ascending: false })
      if (query) request = request.ilike('title', `%${query.replace(/[%_]/g, '')}%`)
      const { data, error } = await request
      if (error) throw error
      const resources = (data || []).map(item => ({
        ...item,
        version: (item.resource_versions || []).sort((a, b) => b.version_number - a.version_number)[0] || null
      })).filter(item => item.version)
      return res.status(200).json({ resources })
    }
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
    const isPhq9 = req.body?.template === 'phq9'
    const title = isPhq9 ? 'PHQ-9' : clean(req.body?.title)
    const kind = isPhq9 ? 'outcome_measure' : clean(req.body?.resourceKind, 40)
    const completionMode = isPhq9 ? 'structured' : clean(req.body?.completionMode, 30)
    if (!title || !KINDS.has(kind) || !MODES.has(completionMode)) return res.status(400).json({ error: 'A title, valid resource type, and completion method are required.' })
    const description = isPhq9 ? 'A brief questionnaire about mood over the last two weeks.' : clean(req.body?.description, 1200)
    const { data: resource, error: resourceError } = await supabase
      .from('resource_library_items')
      .insert({ user_id: user.id, title, resource_kind: kind, description })
      .select().single()
    if (resourceError) throw resourceError
    const { data: version, error: versionError } = await supabase
      .from('resource_versions')
      .insert({ resource_id: resource.id, user_id: user.id, version_number: 1, completion_mode: completionMode, client_title: title, client_description: description, form_definition: isPhq9 ? phq9Definition() : {}, scoring_definition: isPhq9 ? { calculation: 'sum', calculationVersion: 'phq-9-v1' } : {}, published_at: new Date().toISOString() })
      .select().single()
    if (versionError) throw versionError
    return res.status(201).json({ resource: { ...resource, version } })
  } catch (error) {
    console.error('[Resources]', error)
    return res.status(error.status || 500).json({ error: error.message || 'Resource request failed' })
  }
}
