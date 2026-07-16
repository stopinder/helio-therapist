import { getSupabaseClient } from '../_lib/supabase.js';

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
    const supabase = getSupabaseClient();
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

    const { data: colsData, error: colsError } = await supabase
      .from('integrations')
      .select('*')
      .limit(0);
    
    results.columns = {
      success: !colsError,
      error: colsError,
      data: colsData
    };

    // Try to test upsert with dummy data
    const dummy = {
      provider: 'test_diag_' + Date.now(),
      // credentials: { test: true }, // Try without credentials first to see what works
      last_synced_at: new Date().toISOString()
    };
    const { data: upsertData, error: upsertError } = await supabase
      .from('integrations')
      .upsert(dummy)
      .select();
    
    results.upsert_test = {
      success: !upsertError,
      error: upsertError,
      data: upsertData
    };

    // Cleanup dummy
    if (!upsertError) {
      await supabase.from('integrations').delete().eq('provider', dummy.provider);
    }
  } catch (err) {
    results.error = {
      message: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    };
  }

  return res.status(results.error && !results.query_success ? 500 : 200).json(results);
}
