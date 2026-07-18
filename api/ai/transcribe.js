import OpenAI, { toFile } from 'openai';
import { requireAuthenticatedUser } from '../_lib/supabase.js';

const MAX_AUDIO_BYTES = 3 * 1024 * 1024;
const SUPPORTED_AUDIO_TYPES = new Set(['audio/webm', 'audio/ogg', 'audio/mp4']);

function parseAudioDataUrl(value) {
  // Chrome normally supplies audio/webm;codecs=opus. Accept that browser
  // parameter while passing OpenAI the underlying audio MIME type.
  const match = String(value || '').match(/^data:([^;,]+)(?:;[^,]*)*;base64,([A-Za-z0-9+/=]+)$/i);
  if (!match || !SUPPORTED_AUDIO_TYPES.has(match[1].toLowerCase())) return null;
  return { mimeType: match[1].toLowerCase(), audio: Buffer.from(match[2], 'base64') };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    await requireAuthenticatedUser(req);
    const receivedAudio = parseAudioDataUrl(req.body?.audio);
    if (!receivedAudio) return res.status(400).json({ error: 'The recording format was not supported. Please try again in Chrome, Edge, Firefox, or Safari.' });

    const { mimeType, audio } = receivedAudio;
    if (!audio.length) return res.status(400).json({ error: 'No audio was captured. Please try again.' });
    if (audio.length > MAX_AUDIO_BYTES) return res.status(400).json({ error: 'This recording is too long. Please keep dictated clips under about two minutes.' });
    if (!process.env.OPENAI_API_KEY) {
      console.error('[Dictation] OPENAI_API_KEY is missing');
      return res.status(503).json({ error: 'Dictation is not configured yet. Please contact the practice administrator.' });
    }

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const file = await toFile(audio, `dictation.${mimeType.split('/')[1]}`, { type: mimeType });
    const result = await client.audio.transcriptions.create({ model: 'gpt-4o-transcribe', file });
    return res.status(200).json({ text: result.text || '' });
  } catch (error) {
    console.error('[Dictation] Transcription failed:', error.message);
    if (error.status === 401) return res.status(401).json({ error: 'Please sign in again, then try dictation once more.' });
    return res.status(502).json({ error: 'The recording could not be transcribed. Your audio was not saved; please try again.' });
  }
}
