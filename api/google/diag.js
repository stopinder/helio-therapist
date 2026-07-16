import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const results = {
    env: {
      SUPABASE_URL: !!process.env.SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      GOOGLE_CLIENT_ID: !!process.env.GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET: !!process.env.GOOGLE_CLIENT_SECRET,
      GOOGLE_REDIRECT_URI: !!process.env.GOOGLE_REDIRECT_URI,
      OAUTH_STATE_SECRET: !!process.env.OAUTH_STATE_SECRET,
    },
    supabase_initialized: false,
    query_success: false,
    error: null
  };

  try {
    const url = (process.env.SUPABASE_URL || '').trim();
    const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

    if (!url || !key) {
      throw new Error('SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing');
    }

    const supabase = createClient(url, key);
    results.supabase_initialized = true;

    const { data, error } = await supabase
      .from('integrations')
      .select('id, user_id, provider')
      .limit(1);

    if (error) {
      results.error = {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      };
    } else {
      results.query_success = true;
      results.data_sample = data;
    }
  } catch (err) {
    results.error = {
      message: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    };
  }

  return res.status(results.error && !results.query_success ? 500 : 200).json(results);
}
