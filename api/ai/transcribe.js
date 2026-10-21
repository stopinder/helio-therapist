import OpenAI, { toFile } from 'openai';
import { requireAuthenticatedUser } from '../_lib/supabase.js';
import { isBudgetError, reserveAiBudget, checkDictationFairUse } from '../_lib/ai-budget.js';
import * as mm from 'music-metadata';

const MAX_AUDIO_BYTES = 3 * 1024 * 1024;
const MAX_AUDIO_SECONDS = 120;
const SUPPORTED_AUDIO_TYPES = new Set(['audio/webm', 'audio/ogg', 'audio/mp4']);

/**
 * Server-validated audio duration using music-metadata.
 */
async function getDurationSeconds(buffer, mimeType) {
  try {
    const metadata = await mm.parseBuffer(buffer, { mimeType });
    const duration = metadata.format.duration;
    if (typeof duration !== 'number' || !Number.isFinite(duration) || duration <= 0) {
      return null;
    }
    return duration;
  } catch (error) {
    console.error('[Dictation] Duration parsing failed:', error.message);
    return null;
  }
}

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
    const { user } = await requireAuthenticatedUser(req);
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
        error: { code: 'AUDIO_TOO_LARGE', message: 'This recording exceeds the permitted size. Please try a shorter recording.' }
      });
    }

    // Server-side duration validation
    const serverDuration = await getDurationSeconds(audio, mimeType);

    if (serverDuration === null) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_AUDIO_DURATION',
          message: 'The recording duration could not be verified. Please try a different recording method.'
        }
      });
    }

    if (serverDuration > MAX_AUDIO_SECONDS) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'DICTATION_DURATION_EXCEEDED',
          message: 'Dictation is limited to two minutes per recording. You can continue with another recording.'
        }
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

    // Dictation is free but subject to fair-use limits (daily total and rate limit)
    await reserveAiBudget({ userId: user.id, feature: 'audio.transcription' });
    try {
      await checkDictationFairUse({ userId: user.id, durationSeconds: serverDuration });
    } catch (error) {
      if (isBudgetError(error)) {
        // Return 429 for fair-use limit breaches
        return res.status(error.status).json({ success: false, error: { code: error.code, message: error.message } });
      }
      throw error;
    }

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const file = await toFile(audio, `dictation.${mimeType.split('/')[1]}`, { type: mimeType });
    const result = await client.audio.transcriptions.create({ model, file });
    return res.status(200).json({ success: true, text: result.text || '' });
  } catch (error) {
    if (isBudgetError(error)) {
      return res.status(error.status).json({ success: false, error: { code: error.code, message: error.message } });
    }
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
