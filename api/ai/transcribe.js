import OpenAI, { toFile } from 'openai';
import { requireAuthenticatedUser } from '../_lib/supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    await requireAuthenticatedUser(req);
    const match = String(req.body?.audio || '').match(/^data:audio\/(webm|ogg|mp4);base64,([A-Za-z0-9+/=]+)$/);
    if (!match) return res.status(400).json({ error: 'No supported audio was received' });
    const audio = Buffer.from(match[2], 'base64');
    if (!audio.length || audio.length > 3 * 1024 * 1024) return res.status(400).json({ error: 'Keep dictated clips under about two minutes' });
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const file = await toFile(audio, `dictation.${match[1]}`, { type: `audio/${match[1]}` });
    const result = await client.audio.transcriptions.create({ model: 'gpt-4o-transcribe', file });
    return res.status(200).json({ text: result.text || '' });
  } catch (error) {
    console.error('[Dictation] Transcription failed:', error.message);
    return res.status(error.status || 500).json({ error: 'Unable to transcribe this note' });
  }
}
