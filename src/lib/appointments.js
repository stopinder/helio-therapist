import { supabase } from './supabase.js'

function requireSupabase() {
  if (!supabase) throw new Error('Supabase is not configured')
  return supabase
}

export async function listClientAppointments({ clientId }) {
  const client = requireSupabase()
  const { data, error } = await client
    .from('appointments')
    .select('id,client_id,status,starts_at,ends_at,timezone')
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
