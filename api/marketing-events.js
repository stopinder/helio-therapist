const EVENTS = new Set(['campaign_landing', 'campaign_signup_view', 'campaign_signup_request'])
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
export function projectCampaignEvent(body) {
  if (!EVENTS.has(body?.event) || body?.campaign !== 'helios_uk_launch_202611' || !['initial', 'followup'].includes(body?.step) || !UUID.test(body?.visitId || '')) return null
  return { event: body.event, distinct_id: body.visitId, properties: {
    utm_source: 'apollo', utm_medium: 'email', utm_campaign: body.campaign, utm_content: body.step,
    is_test: process.env.VERCEL_ENV !== 'production',
    $process_person_profile: false, $geoip_disable: true, $ip: null
  } }
}
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const event = projectCampaignEvent(req.body)
  if (!event) return res.status(400).json({ error: 'Invalid campaign event' })
  const token = process.env.POSTHOG_PROJECT_TOKEN
  const host = process.env.POSTHOG_CAPTURE_HOST
  if (!token || !host) return res.status(503).json({ error: 'Campaign analytics unavailable' })
  try {
    const response = await fetch(new URL('/i/v0/e/', host), {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: token, ...event }), signal: AbortSignal.timeout(3000)
    })
    if (!response.ok) return res.status(502).json({ error: 'Campaign analytics unavailable' })
    return res.status(204).end()
  } catch { return res.status(502).json({ error: 'Campaign analytics unavailable' }) }
}
