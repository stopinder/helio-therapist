import { requireAuthenticatedUser } from '../_lib/supabase.js';

const CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar.readonly';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    let supabase;
    let user;
    try {
      ({