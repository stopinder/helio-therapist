import { supabase } from './supabase.js'

export async function authenticatedFetch(url, options = {}, retryCount = 0) {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error

  const accessToken = data.session?.access_token
  if (!accessToken) {
    throw new Error('Please sign in again')
  }

  const headers = new Headers(options.headers || {})
  headers.set('Authorization', `Bearer ${accessToken}`)

  const response = await fetch(url, { ...options, headers })

  // Supabase REST API also returns 401 for expired tokens
  if (response.status === 401 && retryCount < 1) {
    const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession()
    if (refreshError || !refreshData.session) {
      await supabase.auth.signOut()
      window.dispatchEvent(new CustomEvent('helios-session-expired', { 
        detail: { message: 'Your session has expired. Please sign in again.' } 
      }))
      throw new Error('Your session has expired. Please sign in again.')
    }
    // Retry once with new session
    return authenticatedFetch(url, options, retryCount + 1)
  }

  return response
}

/**
 * Wraps a Supabase query with session recovery logic.
 */
export async function withSessionRecovery(queryFn, retryCount = 0) {
  try {
    const result = await queryFn()
    
    if (result.error && (result.error.status === 401 || result.error.code === 'PGRST301') && retryCount < 1) {
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession()
      if (refreshError || !refreshData.session) {
        await supabase.auth.signOut()
        window.dispatchEvent(new CustomEvent('helios-session-expired', { 
          detail: { message: 'Your session has expired. Please sign in again.' } 
        }))
        throw new Error('Your session has expired. Please sign in again.')
      }
      return withSessionRecovery(queryFn, retryCount + 1)
    }
    
    return result
  } catch (err) {
    if (err.message && err.message.includes('expired')) throw err;
    if ((err.status === 401 || err.code === 'PGRST301') && retryCount < 1) {
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession()
      if (!refreshError && refreshData.session) {
        return withSessionRecovery(queryFn, retryCount + 1)
      } else {
        await supabase.auth.signOut()
        window.dispatchEvent(new CustomEvent('helios-session-expired', { 
          detail: { message: 'Your session has expired. Please sign in again.' } 
        }))
        throw new Error('Your session has expired. Please sign in again.')
      }
    }
    throw err;
  }
}
