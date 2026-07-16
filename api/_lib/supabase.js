import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const supabase = (supabaseUrl && supabaseServiceKey) 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

if (!supabase) {
  console.error('Supabase client failed to initialize: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing.');
}
