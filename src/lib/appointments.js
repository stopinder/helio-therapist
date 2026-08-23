import { supabase } from './supabase.js'

function requireSupabase() {
  if (!supabase) throw new Error('Supabase is not configured')
  return supabase
}

export async function listScheduledAppointments() {
  const client = requireSupabase()
  const { data, error } = await client
    .from('appointments')
    .select('id,client_id,status,starts_at,ends_at,timezone,zoom_meeting_id,zoom_event_id,google_event_id,clients(reference)')
    .in('status', ['scheduled', 'rescheduled'])
    .not('starts_at', 'is', null)
    .order('starts_at', { ascending: true })

  if (error) throw error
  return (data || []).map(appointment => ({
    ...appointment,
    client_reference: appointment.clients?.reference || null,
    is_sample: String(appointment.clients?.reference || '').startsWith('SAMPLE-')
  }))
}

export async function listClientAppointments({ clientId }) {
  const client = requireSupabase()
  const { data, error } = await client
    .from('appointments')
    .select('id,client_id,status,starts_at,ends_at,timezone,zoom_meeting_id,zoom_event_id,google_event_id')
    .eq('client_id', clientId)
    .in('status', ['scheduled', 'rescheduled'])
    .not('starts_at', 'is', null)
    .order('starts_at', { ascending: true })

  if (error) throw error
  return data || []
}

export function nextClientAppointment(appointments, now = new Date()) {
  const nowMs = now.getTime()
  return (appointments || []).find(appointment => new Date(appointment.starts_at).getTime() >= nowMs) || null
}
