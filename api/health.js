import { getSupabaseClient } from './_lib/supabase.js';

const HEALTH_TIMEOUT_MS = 4_000;

async function checkSupabase() {
  const supabase = getSupabaseClient();
  const query = supabase.from('profiles').select('id', { head: true, count: 'exact' }).limit(1);
  const timeout = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Supabase health check timed out')), HEALTH_TIMEOUT_MS);
  });
  const { error } = await Promise.race([query, timeout]);
  if (error) throw error;
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    return res.status(405).json({ status: 'method_not_allowed' });
  }

  res.setHeader('Cache-Control', 'no-store');

  try {
    await checkSupabase();
    if (req.method === 'HEAD') return res.status(200).end();
    return res.status(200).json({ status: 'ok' });
  } catch (error) {
    console.error('[Health] dependency check failed', {
      dependency: 'supabase',
      code: error?.code || null,
      message: error?.message || 'Unknown dependency error'
    });
    if (req.method === 'HEAD') return res.status(503).end();
    return res.status(503).json({ status: 'degraded' });
  }
}
