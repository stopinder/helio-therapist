import { ref } from 'vue'
import { supabase } from '../lib/supabase.js'

export function useTherapistIdentity() {
  const displayName = ref('')

  async function loadTherapistIdentity() {
    if (!supabase) return
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle()
      const metadataName = typeof user.user_metadata?.full_name === 'string' ? user.user_metadata.full_name.trim() : ''
      const fullName = profile?.full_name?.trim() || metadataName || ''
      displayName.value = fullName ? fullName.split(/\s+/)[0] : ''
    } catch {
      displayName.value = ''
    }
  }

  return { displayName, loadTherapistIdentity }
}
