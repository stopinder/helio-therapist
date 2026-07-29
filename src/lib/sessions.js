import { supabase } from './supabase.js'

const LEGACY_STORAGE_KEY = 'helio_sessions'
const MIGRATION_MARKER_KEY = 'helio_sessions_migrated'

function requireSupabase() {
  if (!supabase) throw new Error('Supabase is not configured')
  return supabase
}

function singleResult(data) {
  return Array.isArray(data) ? data[0] : data
}

export