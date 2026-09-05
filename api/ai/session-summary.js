import { requireAuthenticatedUser } from '../_lib/supabase.js';
import { AI_FEATURES, runTextAI } from '../_lib/ai-execution.js';
import { randomUUID } from 'node:crypto';
import { 
  CLIENT_SESSION_SUMMARY_LENSES, 
  CLIENT_SESSION_SUMMARY_PROMPT_VERSION, 
  buildClientSessionSummaryInput, 
  renderClientSessionSummary, 
  validateClientSessionSummaryResponse 
} from '../_lib/ai-client-session-summary.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ success: false, error: { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed' } });
  }

  try {
    const { supabase, user } = await requireAuthenticatedUser(req);
    const { clientId, sessionId, transcriptId } = req.body || {};

    if (!clientId || !sessionId) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_REQUEST', message: 'Client and session IDs are required.' } });
    }

    // 1. Verify ownership and existence
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('id, client_id, user_id, clients(id, user_id, display_name)')
      .eq('id', sessionId)
      .eq('client_id', clientId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (sessionError) throw sessionError;
    if (!session) return res.status(404).json({ success: false, error: { code: 'SESSION_NOT_FOUND', message: 'Session not found or access denied.' } });

    // 2. Fetch authoritative sources from zoom_transcripts
    let query = supabase
      .from('zoom_transcripts')
      .select('id, original_transcript, zoom_generated_summary, source')
      .eq('therapist_user_id', user.id)
      .eq('client_id', clientId)
      .eq('session_ref', sessionId);

    if (transcriptId) {
      query = query.eq('id', transcriptId);
    }

    const { data: transcripts, error: transcriptError } = await query.order('received_at', { ascending: false });
    if (transcriptError) throw transcriptError;

    const transcript = transcripts?.[0];
    if (!transcript || (!transcript.original_transcript && !transcript.zoom_generated_summary)) {
      return res.status(409).json({ 
        success: false, 
        error: { code: 'NO_SOURCE_MATERIAL', message: 'No session transcript or Zoom summary is available yet.' } 
      });
    }

    // 3. Prepare AI input
    // We reuse the existing integrative lens as the default reflective choice
    const lens = 'integrative';
    
    // We adapt the source into a shape buildClientSessionSummaryInput expects: reviewed session capture
    // But we bypass the session_capture_drafts table as requested.
    const mockCapture = {
      id: transcript.id,
      sessionId: session.id,
      occurredAt: new Date().toISOString(), // Fallback if needed
      content: {
        // We put the transcript and zoom summary into a structure the AI can use.
        // The existing clientSessionSummarySystemPrompt uses reviewed captures.
        // We'll provide a single "capture" that is actually our raw source.
        transcript: transcript.original_transcript,
        zoomSummary: transcript.zoom_generated_summary
      }
    };

    const generationId = randomUUID(), generatedAt = new Date().toISOString();
    
    // Custom prompt injection to handle raw transcript/zoom summary instead of structured capture
    const systemPrompt = `You are Helios Clinical Intelligence preparing a long, warm, client-ready therapy summary.
Source material provided:
${transcript.zoom_generated_summary ? `\n<zoom_generated_summary>\n${transcript.zoom_generated_summary}\n</zoom_generated_summary>` : ''}
${transcript.original_transcript ? `\n<original_transcript>\n${transcript.original_transcript}\n</original_transcript>` : ''}

Rules:
1. Write for the CLIENT, not for an insurer.
2. Use warm, collaborative, professional prose in substantial paragraphs.
3. Apply an INTEGRATIVE lens: focus on emotional, relational, and contextual themes.
4. Use "we explored", "you noticed", etc.
5. Cover: what was explored, emotional/relational patterns, insights, therapeutic work (woven in), resources/strengths, unfinished threads, and intentions for next time.
6. DO NOT use SOAP, diagnostic coding, or institutional language.
7. DO NOT manufacture claims not grounded in the source.
8. DO NOT include private therapist reflections or supervision material.

Return JSON only with exactly two fields:
- sections: an object with fields: opening, whatWeWorkedOn, patternsOverTime, changesAndExceptions, strengthsAndResources, perspectiveReflection, betweenSession, closing.
- claims: an array of sentences used, each with { section, text, sourceIds, evidenceStrength }. 
sourceIds for these claims must include "${transcript.id}".`;

    const userInput = `Generate a long client-facing session summary based on the provided Zoom material for the session on ${new Date().toLocaleDateString()}.`;

    const { completion, model } = await runTextAI({
      feature: AI_FEATURES.CLIENT_SESSION_SUMMARY,
      userId: user.id,
      promptVersion: 'session-summary-direct-v1',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userInput }
      ],
      responseFormat: { type: 'json_object' },
      temperature: 0.3,
      maxTokens: 3000
    });

    const structured = validateClientSessionSummaryResponse(completion.choices?.[0]?.message?.content, new Set([transcript.id]));
    if (!structured) return res.status(502).json({ success: false, error: { code: 'INVALID_AI_RESPONSE', message: 'Session summary generation is temporarily unavailable.' } });

    const body = renderClientSessionSummary(structured.sections, lens);
    
    const sources = [
      { id: transcript.id, kind: 'zoom_transcript', source: transcript.source, hasTranscript: !!transcript.original_transcript, hasZoomSummary: !!transcript.zoom_generated_summary }
    ];

    return res.status(200).json({ 
      success: true, 
      data: { 
        generationId, 
        generatedAt, 
        draft: { body, sections: structured.sections }, 
        sources,
        promptVersion: 'session-summary-direct-v1',
        model 
      } 
    });
  } catch (error) {
    console.error('[Session Summary] Error:', error.message);
    const status = error.status || 500;
    return res.status(status).json({ 
      success: false, 
      error: { 
        code: error.code || 'INTERNAL_SERVER_ERROR', 
        message: 'Session summary generation is temporarily unavailable.' 
      } 
    });
  }
}
