import { requireAuthenticatedUser } from './_lib/supabase.js'
import { phq9Definition } from '../src/lib/phq9.js'
import { resourceTemplates } from '../src/lib/resourceTemplates.js'

const KINDS = new Set(['worksheet', 'thought_record', 'behavioural_experiment', 'sleep_diary', 'psychoeducation', 'diagnostic_tool', 'outcome_measure', 'therapist_resource', 'document'])
const MODES = new Set(['complete_in_helio', 'upload', 'complete_or_upload', 'read_only'])
const AUDIENCES = new Set(['client', 'therapist', 'both'])
const clean = (value, maximum = 160) => String(value || '').trim().slice(0, maximum)

export default async function handler(req, res) {
  try {
    const { supabase, user } = await requireAuthenticatedUser(req)
    if (req.method === 'GET') {
      const query = clean(req.query.q, 100)
      let request = supabase
        .from('resource_library_items')
        .select('id,title,resource_kind,content_type,category,audience,description,updated_at,resource_versions(id,version_number,completion_mode,client_title,client_description,form_definition,published_at,created_at)')
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
      // This is a catalogue result, not a raw persistence model. Never offer
      // therapist-only material to the client-send composer.
      return res.status(200).json({ resources: resources.filter(item => item.audience !== 'therapist').map(item => ({
        key: `resource:${item.id}`, id: item.id, type: item.resource_kind === 'outcome_measure' ? 'outcome_measure' : 'resource',
        title: item.title, subtitle: item.description || null, category: item.category || item.resource_kind,
        completionMode: item.version.completion_mode, audience: item.audience, canSendToClient: (item.audience === 'client' || item.audience === 'both') && (item.version.completion_mode !== 'complete_in_helio' || Array.isArray(item.version.form_definition?.items) && item.version.form_definition.items.length > 0),
        version: item.version, resource_kind: item.resource_kind
      })) })
    }
    if (req.method === 'PATCH') {
      const resourceId = clean(req.body?.resourceId, 80)
      const title = clean(req.body?.title)
      const description = clean(req.body?.description, 1200)
      const completionMode = clean(req.body?.completionMode, 30) || 'complete_in_helio'
      const formDefinition = req.body?.formDefinition && typeof req.body.formDefinition === 'object' ? req.body.formDefinition : {}
      if (!resourceId || !title || !MODES.has(completionMode)) return res.status(400).json({ error: 'A resource, title and valid completion method are required.' })
      if (!Array.isArray(formDefinition.items) || !formDefinition.items.length) return res.status(400).json({ error: 'Add at least one form field before publishing.' })

      const { data: existing, error: existingError } = await supabase.from('resource_library_items')
        .select('id,resource_kind')
        .eq('id', resourceId)
        .eq('user_id', user.id)
        .maybeSingle()
      if (existingError) throw existingError
      if (!existing) return res.status(404).json({ error: 'Resource not found.' })
      if (existing.resource_kind === 'outcome_measure') return res.status(400).json({ error: 'Standardised outcome measures are not editable in this builder.' })

      const { data: published, error } = await supabase.rpc('publish_resource_version', {
        p_user_id: user.id,
        p_resource_id: resourceId,
        p_title: title,
        p_description: description,
        p_completion_mode: completionMode,
        p_form_definition: formDefinition,
        p_scoring_definition: {}
      })
      if (error) throw error
      if (!published?.resource || !published?.version) throw new Error('Resource publishing returned an invalid result.')
      return res.status(200).json({ resource: {
        key: `resource:${published.resource.id}`,
        id: published.resource.id,
        type: 'resource',
        title: published.resource.title,
        subtitle: published.resource.description || null,
        category: published.resource.category || published.resource.resource_kind,
        completionMode: published.version.completion_mode,
        audience: published.resource.audience,
        canSendToClient: published.resource.audience !== 'therapist',
        version: published.version,
        resource_kind: published.resource.resource_kind
      } })
    }
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
    const isPhq9 = req.body?.template === 'phq9'
    const builtInTemplate = isPhq9 ? {
      title: 'PHQ-9',
      resourceKind: 'outcome_measure',
      completionMode: 'complete_in_helio',
      audience: 'client',
      description: 'A brief questionnaire about mood over the last two weeks.',
      formDefinition: phq9Definition(),
      scoringDefinition: { calculation: 'sum', calculationVersion: 'phq-9-v1' }
    } : resourceTemplates[req.body?.template]

    const title = builtInTemplate?.title || clean(req.body?.title)
    const kind = builtInTemplate?.resourceKind || clean(req.body?.resourceKind, 40)
    const completionMode = builtInTemplate?.completionMode || clean(req.body?.completionMode, 30)
    const audience = builtInTemplate?.audience || clean(req.body?.audience, 20) || 'client'
    if (!title || !KINDS.has(kind) || !MODES.has(completionMode) || !AUDIENCES.has(audience)) return res.status(400).json({ error: 'A title, valid resource type, audience, and completion method are required.' })
    const description = builtInTemplate?.description || clean(req.body?.description, 1200)
    const requestedDefinition = req.body?.formDefinition && typeof req.body.formDefinition === 'object' ? req.body.formDefinition : {}
    const formDefinition = builtInTemplate?.formDefinition || requestedDefinition
    const { data: created, error } = await supabase.rpc('create_resource_with_version', {
      p_user_id: user.id,
      p_title: title,
      p_resource_kind: kind,
      p_content_type: kind === 'document' ? 'document' : kind === 'psychoeducation' ? 'psychoeducation' : 'worksheet',
      p_category: kind,
      p_audience: audience,
      p_description: description,
      p_completion_mode: completionMode,
      p_form_definition: formDefinition,
      p_scoring_definition: builtInTemplate?.scoringDefinition || {},
      p_published_at: new Date().toISOString()
    })
    if (error) throw error
    const resource = created?.resource
    const version = created?.version
    if (!resource || !version) throw new Error('Resource transaction returned an invalid result.')
    return res.status(201).json({ resource: { key: `resource:${resource.id}`, id: resource.id, type: kind === 'outcome_measure' ? 'outcome_measure' : 'resource', title: resource.title, subtitle: resource.description || null, category: resource.category || kind, completionMode: version.completion_mode, audience: resource.audience, canSendToClient: audience !== 'therapist', version, resource_kind: kind } })
  } catch (error) {
    console.error('[Resources]', error)
    return res.status(error.status || 500).json({ error: error.message || 'Resource request failed' })
  }
}
