import { createClient } from '@supabase/supabase-js';

/**
 * Creates and returns a Supabase client using environment variables.
 * Throws an error if required variables are missing.
 */
export function getSupabaseClient() {
  const supabaseUrl = (process.env.SUPABASE_URL || '').trim();
  const supabaseServiceKey = (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY ||
    ''
  ).trim();

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

/**
 * Creates and returns a Supabase client authenticated with the user's token.
 * This ensures RLS is applied.
 */
export function getSupabaseUserClient(req) {
  const supabaseUrl = (process.env.SUPABASE_URL || '').trim();
  const supabaseAnonKey = (process.env.SUPABASE_ANON_KEY || '').trim();
  const authorization = req.headers.authorization || '';
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  const token = match ? match[1] : null;

  if (!supabaseUrl || !supabaseAnonKey) {
    const error = new Error('Supabase configuration missing');
    error.status = 500;
    throw error;
  }

  const options = token 
    ? { global: { headers: { Authorization: `Bearer ${token}` } } }
    : {};

  return createClient(supabaseUrl, supabaseAnonKey, options);
}

export async function requireAuthenticatedUser(req) {
  const authorization = req.headers.authorization || '';
  const match = authorization.match(/^Bearer\s+(.+)$/i);

  if (!match) {
    const error = new Error('Authentication required');
    error.status = 401;
    error.code = 'AUTH_REQUIRED';
    throw error;
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.getUser(match[1]);

  if (error || !data?.user) {
    const authError = new Error('Session is invalid or expired');
    authError.status = 401;
    authError.code = 'AUTH_INVALID';
    throw authError;
  }

  return { supabase, user: data.user };
}
