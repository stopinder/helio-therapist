import { validateReflectionSnapshot, reflectionText, canonicalJSON } from '../quiz/therapist/snapshot.js'
import { buildFallbackReport } from '../quiz/therapist/buildResult.js'
import { mergeSeenQuestions, snapshotQuestionIds } from '../quiz/therapist/history.js'

const FIELDS = 'id,user_id,body,workspace_content,created_at'

/** Saved history follows the therapist across browsers. Query is owner-filtered
 * and paginated; existing private_reflections RLS remains authoritative. */
export async function loadPracticeReflectionHistory({ supabaseClient, expectedUserId }) {
  const auth = await supabaseClient.auth.getUser()
  if (auth.error || !expectedUserId || auth.data?.user?.id !== expectedUserId) throw new Error('Account could not be confirmed.')
  let seen = []
  const pageSize = 500
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await supabaseClient.from('private_reflections')
      .select('id,workspace_content,created_at').eq('user_id', expectedUserId)
      .eq('workspace_content->>captureSource', 'practice_reflection')
      .order('created_at', { ascending: true }).order('id', { ascending: true })
      .range(offset, offset + pageSize - 1)
    if (error || !Array.isArray(data)) throw new Error('Reflection history is unavailable.')
    seen = mergeSeenQuestions(seen, ...data.map(row => snapshotQuestionIds(row.workspace_content?.practiceReflection)))
    if (data.length < pageSize) return seen
  }
}

/** An explicit, insert-only private-library action. No AI call and no service-role client. */
export async function savePracticeReflection({ snapshot, supabaseClient, expectedUserId } = {}) {
  const validated = validateReflectionSnapshot(snapshot)
  if (validated.narrative.mode === 'fallback' && canonicalJSON(validated.narrative.report) !== canonicalJSON(buildFallbackReport(validated.interpretation))) {
    throw new Error('The authored reflection no longer matches its source. Please read it again before saving.')
  }
  const body = reflectionText(validated)
  // Existing private_reflections schema limits the body to 20,000 characters.
  if (body.length > 20000 || canonicalJSON(validated).length > 180000) throw new Error('This reflection is too large to save without truncation. Download the text instead.')
  const client = supabaseClient || (await import('./supabase.js')).supabase
  if (!client) throw new Error('The private reflection library is unavailable.')
  const auth = await client.auth.getUser()
  const user = auth.data?.user
  if (auth.error || !user?.id || (expectedUserId && user.id !== expectedUserId)) throw new Error('Please sign in to the same therapist account before saving.')

  const readExisting = () => client.from('private_reflections').select(FIELDS).eq('id', validated.id).eq('user_id', user.id).maybeSingle()
  function confirm(row) {
    if (!row || row.id !== validated.id || row.user_id !== user.id || row.body !== body ||
      row.workspace_content?.captureSource !== 'practice_reflection' ||
      canonicalJSON(row.workspace_content?.practiceReflection) !== canonicalJSON(validated)) {
      throw new Error('The saved reflection could not be confirmed. No existing entry was overwritten.')
    }
    return { id: row.id, created_at: row.created_at }
  }
  const existing = await readExisting()
  if (existing.error) throw new Error('The library could not be checked. Your reflection has not been changed.')
  if (existing.data) return confirm(existing.data)

  const payload = {
    id: validated.id,
    user_id: user.id,
    client_id: null,
    session_ref: null,
    body,
    theme: 'Practice reflection',
    included_in_supervision: false,
    workspace_content: { captureSource: 'practice_reflection', practiceReflection: validated }
  }
  let inserted
  try { inserted = await client.from('private_reflections').insert(payload).select(FIELDS).single() }
  catch { inserted = { error: true } }
  if (!inserted.error && inserted.data) return confirm(inserted.data)

  // The insert may have committed even when its response was lost, or another tab
  // may have saved the same UUID. Confirm rather than overwrite or create a duplicate.
  const recovered = await readExisting()
  if (!recovered.error && recovered.data) return confirm(recovered.data)
  throw new Error('The save was not confirmed. Your reflection is still available; please retry or download it.')
}
