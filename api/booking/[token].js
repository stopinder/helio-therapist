import { getSupabaseClient } from '../_lib/supabase.js';
import { decryptBookingUrl } from '../_lib/booking-url-crypto.js';

function tokenFromRequest(req) {
  const queryToken = Array.isArray(req.query?.token) ? req.query.token[0] : req.query?.token;
  return String(queryToken || '').trim();
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  res.setHeader('Cache-Control', 'no-store');
  const token = tokenFromRequest(req);
  if (!token) return res.status(404).json({ state: 'invalid' });

  try {
    const supabase = getSupabaseClient();
    const { data: appointment, error } = await supabase
      .from('appointments')
      .select('status, booking_expires_at, encrypted_booking_url, user_id')
      .eq('correlation_token', token)
      .maybeSingle();
    if (error) throw error;
    if (!appointment) return res.status(404).json({ state: 'invalid' });

    if (appointment.status !== 'booking_link_created') {
      return res.status(410).json({ state: 'used' });
    }
    if (!appointment.booking_expires_at || new Date(appointment.booking_expires_at).getTime() <= Date.now()) {
      return res.status(410).json({ state: 'expired' });
    }
    if (!appointment.encrypted_booking_url) {
      return res.status(410).json({ state: 'unavailable' });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, practice_name, professional_title')
      .eq('id', appointment.user_id)
      .maybeSingle();

    return res.status(200).json({
      state: 'available',
      therapist: {
        name: profile?.full_name || '',
        practiceName: profile?.practice_name || '',
        professionalTitle: profile?.professional_title || ''
      },
      bookingUrl: decryptBookingUrl(appointment.encrypted_booking_url),
      expiresAt: appointment.booking_expires_at
    });
  } catch (error) {
    console.error('[Hosted Booking]', { message: error.message });
    return res.status(500).json({ state: 'unavailable' });
  }
}
