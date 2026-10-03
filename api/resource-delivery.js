import crypto from 'crypto'
import { requireAuthenticatedUser } from './_lib/supabase.js'

const RESEND_API = 'https://api.resend.com'
const DEFAULT_FROM = 'Helios <hello@helio.works>'
const clean = (value, maximum = 1600) => String(value || '').trim().slice(0, maximum)
const tokenHash = token => crypto.createHash('sha256').update(String(token || '')).digest('hex')
const escapeHtml = value => String(value || '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character])

function baseUrl(req) {
  const forwarded = clean(req.headers['x-forwarded-host'], 200)
  const host = forwarded || clean(req.headers.host, 200)
  const allowed = host === 'therapyworks.works'
    || host === 'helio.works'
    || host.endsWith('.vercel.app')
    || host.startsWith('localhost:')
  if (!allowed) return 'https://therapyworks.works'
  const protocol = host.startsWith('localhost:') ? 'http' : 'https'
  return `${protocol}://${host}`
}

async function resendEmail(payload) {
  const apiKey = clean(process.env.RESEND_API_KEY, 500)
  if (!apiKey) throw new Error('Email delivery is not configured.')
  const response = await fetch(`${RESEND_API}/emails`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })
  if (!response.ok) {
    const detail = await response.text()
    const error = new Error('The email could not be sent.')
    error.details = detail.slice(0, 500)
    throw error
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { supabase, user } = await requireAuthenticatedUser(req)
    const clientId = clean(req.body?.clientId, 80)
    const items = Array.isArray(req.body?.items) ? req.body.items.slice(0, 8) : []
    if (!clientId || !items.length) return res.status(400).json({ error: 'Client and at least one resource link are required.' })

    const { data: client, error: clientError } = await supabase.from('clients')
      .select('id,display_name,email')
      .eq('id', clientId)
      .eq('user_id', user.id)
      .maybeSingle()
    if (clientError) throw clientError
    if (!client) return res.status(404).json({ error: 'Client not found.' })
    const email = clean(client.email, 320).toLowerCase()
    if (!email) return res.status(400).json({ error: 'This client does not have an email address.' })

    const verified = []
    for (const item of items) {
      const assignmentId = clean(item?.assignmentId, 80)
      const token = clean(item?.token, 500)
      if (!assignmentId || token.length < 32) return res.status(400).json({ error: 'A secure resource link is incomplete.' })
      const { data: assignment, error } = await supabase.from('client_request_items')
        .select('id,client_request_id,client_id,sent_snapshot,client_access_expires_at')
        .eq('id', assignmentId)
        .eq('client_id', clientId)
        .eq('user_id', user.id)
        .eq('client_access_token_hash', tokenHash(token))
        .maybeSingle()
      if (error) throw error
      if (!assignment) return res.status(403).json({ error: 'A resource link could not be verified.' })
      verified.push({
        assignmentId,
        requestId: assignment.client_request_id,
        title: assignment.sent_snapshot?.title || 'Practice resource',
        token
      })
    }

    const { data: profile } = await supabase.from('profiles')
      .select('full_name,practice_name')
      .eq('id', user.id)
      .maybeSingle()
    const therapist = clean(profile?.full_name || user.user_metadata?.full_name || 'Your therapist', 120)
    const practice = clean(profile?.practice_name || 'Helios', 120)
    const origin = baseUrl(req)
    const links = verified.map(item => ({
      title: item.title,
      url: `${origin}/complete?token=${encodeURIComponent(item.token)}`
    }))

    const linkHtml = links.map(item => `<p style="margin:0 0 14px"><strong>${escapeHtml(item.title)}</strong><br><a href="${escapeHtml(item.url)}" style="color:#31584f">${escapeHtml(item.url)}</a></p>`).join('')
    const linkText = links.map(item => `${item.title}: ${item.url}`).join('\n\n')
    const from = clean(process.env.RESEND_FROM_EMAIL || DEFAULT_FROM, 320)

    await resendEmail({
      from,
      to: [email],
      subject: `${therapist} has sent you ${links.length === 1 ? 'a secure practice resource' : 'secure practice resources'}`,
      html: `<div style="font-family:Arial,sans-serif;color:#284548;line-height:1.6;max-width:620px;margin:auto"><p>Hello,</p><p>${escapeHtml(therapist)} has sent you ${links.length === 1 ? 'a resource' : 'some resources'} to complete or review securely through ${escapeHtml(practice)}.</p>${linkHtml}<p>Each link is private to this request and expires automatically. If you were not expecting this email, contact your therapist directly.</p></div>`,
      text: `Hello,\n\n${therapist} has sent you ${links.length === 1 ? 'a resource' : 'some resources'} to complete or review securely through ${practice}.\n\n${linkText}\n\nEach link is private to this request and expires automatically. If you were not expecting this email, contact your therapist directly.`
    })

    const requestIds = [...new Set(verified.map(item => item.requestId).filter(Boolean))]
    if (requestIds.length) {
      await supabase.from('client_requests')
        .update({ delivery_channel: 'email' })
        .in('id', requestIds)
        .eq('user_id', user.id)
    }

    return res.status(200).json({ sent: true, email })
  } catch (error) {
    console.error('[Resource delivery]', error.message, error.details || '')
    return res.status(error.status || 500).json({ error: error.message || 'The resource email could not be sent.' })
  }
}
