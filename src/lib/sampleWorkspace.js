import { supabase } from './supabase.js'

export const sampleWorkspaceBlueprint = {
  clients: [
    { key: 'alex', display_name: 'Alex Morgan — Sample', reference: 'SAMPLE-001', preferred_name: 'Alex', current_focus: 'Work-related anxiety, sleep disruption and building a sustainable weekly routine.', email: 'alex.sample@example.invalid', phone: '07000 000001', notes: 'Synthetic example record for exploring Helio. No real person or contact details.' },
    { key: 'priya', display_name: 'Priya Shah — Sample', reference: 'SAMPLE-002', preferred_name: 'Priya', current_focus: 'Recent bereavement, adjustment and maintaining connection with supportive relationships.', email: 'priya.sample@example.invalid', phone: '07000 000002', notes: 'Synthetic example record for exploring Helio. No real person or contact details.' },
    { key: 'daniel', display_name: 'Daniel Reed — Sample', reference: 'SAMPLE-003', preferred_name: 'Daniel', current_focus: 'Confidence in social situations and practising graded behavioural experiments.', email: 'daniel.sample@example.invalid', phone: '07000 000003', notes: 'Synthetic example record for exploring Helio. No real person or contact details.' },
    { key: 'maya', display_name: 'Maya Chen — Sample', reference: 'SAMPLE-004', preferred_name: 'Maya', current_focus: 'Therapy completed after progress with panic symptoms and relapse-prevention planning.', email: 'maya.sample@example.invalid', phone: '07000 000004', archived: true, notes: 'Synthetic archived example record for exploring Helio. No real person or contact details.' }
  ]
}

function daysFromNow(days, hour = 10) {
  const date = new Date()
  date.setDate(date.getDate() + days)
  date.setHours(hour, 0, 0, 0)
  return date.toISOString()
}

async function requireUser() {
  if (!supabase) throw new Error('Supabase is not configured')
  const { data, error } = await supabase.auth.getUser()
  if (error) throw error
  if (!data?.user) throw new Error('Please sign in again')
  return data.user
}

export async function createSampleWorkspace() {
  const user = await requireUser()
  const { count, error: countError } = await supabase.from('clients').select('id', { count: 'exact', head: true }).eq('user_id', user.id)
  if (countError) throw countError
  if (count > 0) throw new Error('Sample content can only be added to an empty workspace.')

  const clientRows = sampleWorkspaceBlueprint.clients.map(({ key, ...client }) => ({ ...client, user_id: user.id, archived_at: client.archived ? new Date().toISOString() : null }))
  const { data: clients, error: clientsError } = await supabase.from('clients').insert(clientRows).select('*')
  if (clientsError) throw clientsError

  const byReference = new Map(clients.map(client => [client.reference, client]))
  const alex = byReference.get('SAMPLE-001')
  const priya = byReference.get('SAMPLE-002')
  const daniel = byReference.get('SAMPLE-003')

  const sessionRows = [
    { user_id: user.id, client_id: alex.id, occurred_at: daysFromNow(-21, 11), status: 'in_progress', workflow_status: 'no_further_action', notes_status: 'draft', notes: '' },
    { user_id: user.id, client_id: alex.id, occurred_at: daysFromNow(-7, 11), status: 'in_progress', workflow_status: 'no_further_action', notes_status: 'draft', notes: '' },
    { user_id: user.id, client_id: priya.id, occurred_at: daysFromNow(-5, 15), status: 'in_progress', workflow_status: 'no_further_action', notes_status: 'draft', notes: '' },
    { user_id: user.id, client_id: daniel.id, occurred_at: daysFromNow(0, 9), status: 'in_progress', workflow_status: 'no_further_action', notes_status: 'draft', notes: 'Working notes: review confidence ladder and agree one manageable social experiment before next session.' }
  ]
  const { data: sessions, error: sessionsError } = await supabase.from('sessions').insert(sessionRows).select('*')
  if (sessionsError) throw sessionsError

  const alexSessions = sessions.filter(session => session.client_id === alex.id)
  const priyaSession = sessions.find(session => session.client_id === priya.id)
  const completionNotes = [
    [alexSessions[0], 'Client described a demanding work period with increased evening rumination and reduced sleep. Reviewed the anxiety-maintenance cycle, identified late-night checking as a maintaining behaviour, and agreed a short wind-down routine plus a consistent stopping time for work messages. No current risk concerns identified in this synthetic example.'],
    [alexSessions[1], 'Client reported modest improvement in sleep and fewer late-night work checks. Explored perfectionistic assumptions and tested a more flexible standard for one low-stakes task. Agreed to continue the wind-down routine and record what happens when a task is completed to a good-enough standard.'],
    [priyaSession, 'Client reflected on waves of grief around family milestones and the pressure to appear recovered. Normalised variation in grief responses, mapped current supports, and agreed one gentle reconnection with a trusted friend. Synthetic example contains no real clinical data.']
  ]
  for (const [session, notes] of completionNotes) {
    const { error } = await supabase.rpc('complete_session', { p_session_id: session.id, p_notes: notes, p_expected_version: session.version })
    if (error) throw error
  }

  const careRows = [
    { therapist_id: user.id, client_id: alex.id, kind: 'current_focus', body: 'Reduce the spill-over of work anxiety into evenings and sleep.', status: 'current', origin: 'clinician' },
    { therapist_id: user.id, client_id: alex.id, kind: 'trying', body: '20-minute wind-down routine and no work-message checking after 20:30.', status: 'current', origin: 'clinician' },
    { therapist_id: user.id, client_id: alex.id, kind: 'change_noticed', body: 'Falling asleep more easily on evenings when the wind-down routine is used.', status: 'current', origin: 'clinician' },
    { therapist_id: user.id, client_id: priya.id, kind: 'shared_understanding', body: 'Grief arrives in waves; difficult days do not mean progress has been lost.', status: 'current', origin: 'clinician' },
    { therapist_id: user.id, client_id: daniel.id, kind: 'trying', body: 'Use a three-step confidence ladder for social situations and record predictions versus outcomes.', status: 'current', origin: 'clinician' }
  ]
  const { error: careError } = await supabase.from('client_care_items').insert(careRows)
  if (careError) throw careError

  const appointmentRows = [
    { user_id: user.id, client_id: alex.id, status: 'scheduled', correlation_token: `sample-${user.id}-alex`, starts_at: daysFromNow(3, 11), ends_at: daysFromNow(3, 12), timezone: 'Europe/London' },
    { user_id: user.id, client_id: daniel.id, status: 'scheduled', correlation_token: `sample-${user.id}-daniel`, starts_at: daysFromNow(6, 9), ends_at: daysFromNow(6, 10), timezone: 'Europe/London' }
  ]
  const { error: appointmentError } = await supabase.from('appointments').insert(appointmentRows)
  if (appointmentError) throw appointmentError

  const documentRows = [
    { user_id: user.id, client_id: alex.id, client_ref: alex.id, client_name: alex.display_name, title: 'Sample treatment plan', document_type: 'treatment_plan', status: 'draft', scope: 'client', purpose: 'Illustrate a structured treatment-planning document.', recipient: 'Clinical record', content: { goals: ['Improve sleep consistency', 'Reduce work-related checking', 'Practise flexible standards'], approach: 'Collaborative CBT-informed work with regular review.' }, source_manifest: [] },
    { user_id: user.id, client_id: priya.id, client_ref: priya.id, client_name: priya.display_name, title: 'Sample progress summary', document_type: 'clinical_summary', status: 'draft', scope: 'client', purpose: 'Illustrate a concise progress summary.', recipient: 'Clinical record', content: { summary: 'Synthetic example summary showing adjustment, support mapping and agreed next steps.' }, source_manifest: [] }
  ]
  const { error: documentError } = await supabase.from('documents').insert(documentRows)
  if (documentError) throw documentError

  return { clientsCreated: clients.length, sessionsCreated: sessions.length, appointmentsCreated: appointmentRows.length, careItemsCreated: careRows.length, documentsCreated: documentRows.length }
}
