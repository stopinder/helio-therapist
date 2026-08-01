import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (typeof import.meta !== 'undefined' && import.meta.env) ? import.meta.env.VITE_SUPABASE_URL : process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = (typeof import.meta !== 'undefined' && import.meta.env) ? import.meta.env.VITE_SUPABASE_ANON_KEY : process.env.VITE_SUPABASE_ANON_KEY;

// Diagnostics
let isUrlValid = false;
try {
  if (supabaseUrl) {
    new URL(supabaseUrl);
    isUrlValid = true;
  }
} catch (e) {
  isUrlValid = false;
}

console.log('[Supabase Diagnostics]', {
  urlExists: !!supabaseUrl,
  urlValid: isUrlValid,
  anonKeyExists: !!supabaseAnonKey
});

if (!isUrlValid || !supabaseAnonKey) {
  console.warn('Supabase configuration missing or invalid. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables.');
}

export const supabase = (isUrlValid && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;
