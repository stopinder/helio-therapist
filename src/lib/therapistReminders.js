import { supabase } from './supabase.js'

function requireSupabase() {
  if (!supabase) throw new Error('Supabase is not configured')
  return supabase
}

function mapReminder(row) {
  return {
    id: row.id,
    therapistId: row.therapist_id,
    body: row.body,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

export async function listTherapistReminders() {
  const db = requireSupabase()
  const { data, error } = await db
    .from('therapist_reminders')
    .select('*')
    .is('completed_at', null)
    .order('updated_at', { ascending: false })

  if (error) throw error
  return (data || []).map(mapReminder)
}

export async function createTherapistReminder({ body }) {
  const text = String(body || '').trim()
  if (!text) throw new Error('Reminder text is required')

  const db = requireSupabase()
  const { data: auth } = await db.auth.getUser()
  if (!auth?.user) {
    const error = new Error('Authentication required')
    error.code = 'UNAUTHENTICATED'
    throw error
  }

  const { data, error } = await db
    .from('therapist_reminders')
    .insert({ therapist_id: auth.user.id, body: text })
    .select('*')
    .single()

  if (error) throw error
  return mapReminder(data)
}

export async function setTherapistReminderCompleted({ id, completed }) {
  const db = requireSupabase()
  const { data, error } = await db
    .from('therapist_reminders')
    .update({ completed_at: completed ? new Date().toISOString() : null })
    .eq('id', id)
    .select('*')
    .single()

  if (error) throw error
  return mapReminder(data)
}
