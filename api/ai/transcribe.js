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

const model = 'whisper-1'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Content-Type', 'application/json')
    return res.status(405).json({
      success: false,
      error: { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed' }
    })
  }

  try {
    await requireAuthenticatedUser(req);
    const receivedAudio = parseAudioDataUrl(req.body?.audio);
    if (!receivedAudio) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_AUDIO_FORMAT',
          message: 'The recording format was not supported. Please try again in Chrome, Edge, Firefox, or Safari.'
        }
      });
    }

    const { mimeType, audio } = receivedAudio;
    if (!audio.length) {
      return res.status(400).json({
        success: false,
        error: { code: 'EMPTY_AUDIO', message: 'No audio was captured. Please try again.' }
      });
    }
    if (audio.length > MAX_AUDIO_BYTES) {
      return res.status(400).json({
        success: false,
        error: { code: 'AUDIO_TOO_LARGE', message: 'This recording is too long. Please keep dictated clips under about two minutes.' }
      });
    }
    if (!process.env.OPENAI_API_KEY) {
      console.error('[Dictation] OPENAI_API_KEY is missing');
      return res.status(503).json({
        success: false,
        error: {
          code: 'SERVICE_UNAVAILABLE',
          message: 'Dictation is not configured yet. Please contact the practice administrator.'
        }
      });
    }

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const file = await toFile(audio, `dictation.${mimeType.split('/')[1]}`, { type: mimeType });
    const result = await client.audio.transcriptions.create({ model, file });
    return res.status(200).json({ success: true, text: result.text || '' });
  } catch (error) {
    console.error('[Dictation] Transcription failed:', error.message, error.stack);
    const status = error.status || 500
    return res.status(status).json({
      success: false,
      error: {
        code: status === 401 ? 'UNAUTHORIZED' : 'TRANSCRIPTION_FAILED',
        message: status === 401 ? 'Please sign in again, then try dictation once more.' : 'The recording could not be transcribed. Your audio was not saved; please try again.'
      }
    });
  }
}
