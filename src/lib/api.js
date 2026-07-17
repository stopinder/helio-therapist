import { supabase } from './supabase.js'

export async function authenticatedFetch(url, options = {}) {
  if (!supabase) {
    throw new Error('Supabase is not configured')
  }

  const { data, error } = await supabase.auth.getSession()
  if (error) throw error

  const accessToken = data.session?.access_token
  if (!accessToken) {
    throw new Error('Please sign in again')
  }

  const headers = new Headers(options.headers || {})
  headers.set('Authorization', `Bearer ${accessToken}`)

  return fetch(url, { ...options, headers })
}
