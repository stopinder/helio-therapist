import { createClient } from '@supabase/supabase-js';

/**
 * Creates and returns a Supabase client using environment variables.
 * Throws an error if required variables are missing.
 */
export function getSupabaseClient() {
  const supabaseUrl = (process.env.SUPABASE_URL || '').trim();
  const supabaseServiceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

  if (!supabaseUrl || !supabaseServiceKey) {
    const missing = [];
    if (!supabaseUrl) missing.push('SUPABASE_URL');
    if (!supabaseServiceKey) missing.push('SUPABASE_SERVICE_ROLE_KEY');
    
    const error = new Error(`Supabase configuration missing: ${missing.join(', ')}`);
    error.status = 500;
    error.code = 'SUPABASE_CONFIG_MISSING';
    throw error;
  }

  return createClient(supabaseUrl, supabaseServiceKey);
}

