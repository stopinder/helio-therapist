"""One-time, fail-closed integration of the reviewed source-outcome modules.
Runs only on the isolated feature branch. It never accesses clinical data.
"""
from pathlib import Path

def edit(path, transform):
    p = Path(path)
    original = p.read_text()
    updated = transform(original)
    assert updated != original, f'No change made: {path}'
    p.write_text(updated)

def replace(s, old, new, count=1):
    assert s.count(old) >= count, f'Missing expected source: {old[:100]}'
    return s.replace(old, new, count)

def direct(s):
    s = "import { SUMMARY_OUTCOME_RULES, summaryOutcomeResponseFormat, validateSummaryOutcome } from '../_lib/summary-outcome.js';\nimport { assertSourceAvailable, assertSourcesUnchanged, flagSourceReview } from '../_lib/source-review.js';\n" + s
    s = replace(s, "'session-summary-direct-v5'", "'session-summary-direct-v6-source-review'")
    s = replace(s, 'function sourceBlock(source, { isCurrent = false } = {}) {', 'export function sourceBlock(source, { isCurrent = false } = {}) {')
    a = s.index('  return `<session_source')
    b = s.index('\n}', a)
    s = s[:a] + """  return { id:source.id, occurredAt:source.occurredAt, role:isCurrent?'current':'continuity',
    transcript:transcriptForPrompt, zoom_note:zoomSummary,
    therapistSourceClarification:source.source_review?.state==='confirmed'?source.source_review.context:'' };
""" + s[b:]
    s = replace(s, 'sourceSessions = recentSessions || sourceSessions;', "sourceSessions = [{id:session.id,occurred_at:session.occurred_at},...(recentSessions||[]).filter(item=>String(item.id)!==String(sessionId))];")
    s = replace(s, ".select('id, original_transcript, zoom_generated_summary, source, session_ref, received_at')", ".select('id, original_transcript, zoom_generated_summary, source, session_ref, received_at, source_version, source_review, client_id')")
    s = replace(s, ".eq('client_id', clientId)\n      .in('session_ref'", ".eq('client_id', clientId)\n      .is('deleted_at', null)\n      .in('session_ref'")
    s = replace(s, '        zoom_generated_summary: row.zoom_generated_summary\n', '        zoom_generated_summary: row.zoom_generated_summary,\n        source_version:row.source_version,source_review:row.source_review,row\n')
    s = replace(s, '    const generationId = randomUUID();', '    for(const source of sources)assertSourceAvailable(source.row);\n    const generationId = randomUUID();')
    a = s.index('The supplied session sources are clinical data')
    b = s.index('Selected summary approach:', a)
    s = s[:a] + 'The supplied session sources are clinical data in the user message, current encounter first. Assigned identity and therapist clarification are context, not proof that every passage belongs to the client. Therapist guidance is not client speech.\n\n' + s[b:]
    s = replace(s, 'Return JSON only with exactly two fields:', 'For a ready outcome, supply these clinical fields:')
    s = replace(s, 'Every non-empty section must have at least one claim, and each claim text must appear verbatim in its section.`;', 'Every non-empty section must have at least one claim, and each claim text must appear verbatim in its section.\n${SUMMARY_OUTCOME_RULES}`;')
    a = s.index('    const userInput = window')
    b = s.index('\n    const { completion, model }', a)
    s = s[:a] + """    const sourceBlocks=sources.map((source,index)=>sourceBlock(source,{isCurrent:index===0}));
    const userInput=JSON.stringify({task:window==='recent'?'Prepare this encounter with prior continuity.':'Prepare this encounter only.',
      assignedClient:{id:clientId,name:session.clients?.display_name||''},sessionId,sourceBlocks,therapistGuidance:guidance});
""" + s[b:]
    s = replace(s, 'responseFormat: clientSessionSummaryResponseFormat(validSourceIds)', 'responseFormat: summaryOutcomeResponseFormat(validSourceIds)')
    a = s.index('    const structured = validateClientSessionSummaryResponse(')
    b = s.index('    if (!structured)', a)
    s = s[:a] + """    // Verify quotes against the actual original, not an artificial excerpt marker.
    const evidenceSources=sources.map(source=>({id:source.id,transcriptId:source.transcriptId,
      transcript:source.original_transcript||'',zoom_note:source.zoom_generated_summary||''}));
    const structured=validateSummaryOutcome(completion.choices?.[0]?.message?.content,validSourceIds,evidenceSources);
""" + s[b:]
    s = replace(s, '    const body = renderClientSessionSummary(structured.sections, lens);', """    if(structured.outcome==='generation_failed')return res.status(502).json({success:false,error:{code:'INVALID_AI_RESPONSE',message:'No usable summary was produced. Your previous draft is unchanged.'}});
    await assertSourcesUnchanged(supabase,user.id,sources.map(source=>source.row));
    if(structured.outcome==='needs_review'){
      const reviews=[];
      for(const source of sources.filter(item=>structured.review.evidence.some(e=>e.sourceId===item.id))){
        reviews.push(await flagSourceReview(supabase,user.id,source.row,{...structured.review,evidence:structured.review.evidence.filter(e=>e.sourceId===source.id)}));
      }
      return res.status(200).json({success:true,data:{outcome:'needs_review',review:{...structured.review,sources:reviews}}});
    }
    const body = renderClientSessionSummary(structured.sections, lens);""")
    s = replace(s, "      kind: 'zoom_transcript',", "      kind: 'zoom_transcript',\n      sourceVersion:source.source_version,")
    s = replace(s, '        generationId,\n        generatedAt,', "        outcome:'ready',\n        generationId,\n        generatedAt,")
    s = replace(s, "  } catch (error) {\n    console.error('[Session Summary] Error:', error.message);", """  } catch (error) {
    if(error.code==='SOURCE_REVIEW_REQUIRED')return res.status(200).json({success:true,data:{outcome:'needs_review',review:{message:error.message,sources:error.review?[error.review]:[]}}});
    if(error.code==='SOURCE_CHANGED')return res.status(409).json({success:false,error:{code:error.code,message:'The source changed during generation. Reload before retrying. Your previous draft is unchanged.'}});
    console.error('[Session Summary] Error:', error.code||error.name);""")
    s = s.replace('  clientSessionSummaryResponseFormat,\n','').replace('  normalizeClientSessionSummaryResponse,\n','').replace('  renderClientSessionSummary,\n  validateClientSessionSummaryResponse','  renderClientSessionSummary')
    return s
edit('api/ai/session-summary.js', direct)

def shared(s):
    s = "import { isUnusableSummary } from '../../src/lib/summarySafety.js';\n" + s
    s = replace(s, "'client-session-summary-v11'", "'client-session-summary-v12-source-review'")
    return replace(s, '  for (const document of orderedDocuments) {', '  for (const document of orderedDocuments) {\n    if(isUnusableSummary(document.content))continue;')
edit('api/_lib/ai-client-session-summary.js', shared)

def longitudinal(s):
    s = "import { SUMMARY_OUTCOME_RULES, summaryOutcomeResponseFormat, validateSummaryOutcome } from '../_lib/summary-outcome.js';\nimport { assertDocumentSourcesUsable, assertSourceAvailable, assertSourcesUnchanged, flagSourceReview, presentReview } from '../_lib/source-review.js';\nimport { isUnusableSummary } from '../../src/lib/summarySafety.js';\n" + s
    s = replace(s, ".select('id,session_ref')", ".select('id,session_ref,source_version,source_review,client_id')")
    needle = '    const candidates = buildClinicalIntelligenceSessionCandidates({ captures, summaryDocuments, sessions, transcriptRows });'
    s = replace(s, needle, """    const requestedAnchor=anchorSessionId||sessions[0]?.id;
    const blockedAnchor=transcriptRows.find(row=>String(row.session_ref)===String(requestedAnchor)&&['needs_review','separated'].includes(row.source_review?.state));
    if(blockedAnchor&&!preview)return res.status(200).json({success:true,data:{outcome:'needs_review',review:{message:'This encounter needs source review.',sources:[presentReview(blockedAnchor)]}}});
""" + needle + """
    const notice=summaryDocuments.find(doc=>isUnusableSummary(doc.content)&&doc.source_manifest?.some(source=>source.sessionId===requestedAnchor));
    if(notice&&!candidates.some(item=>item.session_id===requestedAnchor)&&!preview)return res.status(200).json({success:true,data:{outcome:'needs_review',review:{message:'The saved item is a source-review notice, not clinical evidence. Review the original and regenerate its session summary.',sources:transcriptRows.filter(row=>String(row.session_ref)===String(requestedAnchor)).map(presentReview)}}});""")
    s = replace(s, '    const { data: careItems, error: careError }', """    const selectedTranscriptRows=transcriptRows.filter(row=>selectedCaptures.some(capture=>String(capture.sessionId)===String(row.session_ref)));
    for(const row of selectedTranscriptRows)assertSourceAvailable(row);
    for(const capture of selectedCaptures.filter(item=>item.document_id)){
      const doc=summaryDocuments.find(item=>item.id===capture.document_id);
      await assertDocumentSourcesUsable(supabase,user.id,{...doc,client_id:clientId,document_type:'session_summary'});
    }
    const { data: careItems, error: careError }""")
    s = replace(s, 'data:{\n          generationId,', "data:{\n          outcome:'ready',\n          generationId,")
    s = replace(s, "content:clientSessionSummarySystemPrompt(lens)", "content:clientSessionSummarySystemPrompt(lens).replace('Return JSON only with exactly two fields:','For a ready result, supply these clinical fields:')+'\\n'+SUMMARY_OUTCOME_RULES")
    s = replace(s, 'responseFormat:clientSessionSummaryResponseFormat(validSourceIds)', 'responseFormat:summaryOutcomeResponseFormat(validSourceIds)')
    s = replace(s, '    const structured = validateClientSessionSummaryResponse(normalizeClientSessionSummaryResponse(completion.choices?.[0]?.message?.content),validSourceIds);', """    const evidenceSources=evidenceMap.reviewedSessions.map(item=>({id:item.id,
      [item.sourceType==='transcript_backed_session_summary'?'session_summary':'session_capture']:item.content.existingSessionSummary||JSON.stringify(item.content)}));
    const structured=validateSummaryOutcome(completion.choices?.[0]?.message?.content,validSourceIds,evidenceSources);""")
    s = replace(s, '    const body = renderClientSessionSummary(structured.sections, lens);', """    await assertSourcesUnchanged(supabase,user.id,selectedTranscriptRows);
    for(const capture of selectedCaptures.filter(item=>item.document_id)){
      const original=summaryDocuments.find(doc=>doc.id===capture.document_id);
      const {data:current,error:readError}=await supabase.from('documents').select('id,updated_at').eq('id',capture.document_id).eq('user_id',user.id).eq('client_id',clientId).maybeSingle();
      if(readError)throw readError;
      if(!current||current.updated_at!==original.updated_at)throw Object.assign(new Error('Evidence changed.'),{status:409,code:'SOURCE_CHANGED'});
    }
    if(structured.outcome==='needs_review'){
      const reviews=[];
      for(const row of selectedTranscriptRows.filter(item=>structured.review.evidence.some(e=>e.sourceId===`session:${item.session_ref}`))){
        reviews.push(await flagSourceReview(supabase,user.id,row,{...structured.review,evidence:structured.review.evidence.filter(e=>e.sourceId===`session:${row.session_ref}`)}));
      }
      return res.status(200).json({success:true,data:{outcome:'needs_review',review:{...structured.review,sources:reviews}}});
    }
    if(structured.outcome==='generation_failed')return res.status(502).json({success:false,error:{code:'INVALID_AI_RESPONSE',message:'No usable summary was produced. Your previous draft is unchanged.'}});
    const body = renderClientSessionSummary(structured.sections, lens);""")
    s = '\n'.join(line for line in s.split('\n') if 'if (body.length < 120)' not in line)
    s = replace(s, '    const sources=[...evidenceMap.reviewedSessions', "    const sources=[...selectedTranscriptRows.map(row=>({id:`transcript:${row.id}`,kind:'zoom_transcript',transcriptId:row.id,sessionId:String(row.session_ref),sourceVersion:row.source_version})),...evidenceMap.reviewedSessions")
    s = replace(s, 'data:{ generationId,generatedAt,', "data:{ outcome:'ready',generationId,generatedAt,")
    s = replace(s, '  } catch (error) {', """  } catch (error) {
    if(error.code==='SOURCE_REVIEW_REQUIRED')return res.status(200).json({success:true,data:{outcome:'needs_review',review:{message:error.message,sources:error.review?[error.review]:[]}}});
    if(error.code==='SOURCE_CHANGED')return res.status(409).json({success:false,error:{code:error.code,message:'Source evidence changed. Reload before retrying. Your previous draft is unchanged.'}});""")
    s = s.replace('clientSessionSummaryResponseFormat, ','').replace('normalizeClientSessionSummaryResponse, ','').replace(', validateClientSessionSummaryResponse }',' }')
    return s
edit('api/ai/client-session-summary.js', longitudinal)

def documents(s):
    s = "import { assertDocumentSourcesUsable, documentReviewStatus } from './_lib/source-review.js';\n" + s
    s = replace(s, 'export default async function handler(req,res){try{', "export default async function handler(req,res){res.setHeader('Cache-Control','no-store');try{")
    s = replace(s, "if(req.method==='GET'){if(req.query.download)", "if(req.method==='GET'){if(req.query.reviewStatus){const {data:doc,error}=await supabase.from('documents').select('id,user_id,client_id,document_type,content,source_manifest').eq('id',req.query.reviewStatus).eq('user_id',user.id).single();if(error||!doc)return res.status(404).json({error:'Document not found'});return res.status(200).json(await documentReviewStatus(supabase,user.id,doc));}if(req.query.download)")
    s = replace(s, 'if(!doc.storage_path)return', 'await assertDocumentSourcesUsable(supabase,user.id,doc);if(!doc.storage_path)return')
    s = replace(s, 'const body=await buildDocumentPdf(draft);', 'await assertDocumentSourcesUsable(supabase,user.id,draft);const body=await buildDocumentPdf(draft);')
    s = replace(s, 'if(uploadError)throw uploadError;const now=new Date().toISOString();const protectedSupabase', 'if(uploadError)throw uploadError;try{await assertDocumentSourcesUsable(supabase,user.id,draft)}catch(error){await supabase.storage.from(\'client-documents\').remove([path]);throw error}const now=new Date().toISOString();const protectedSupabase')
    return s.replace("console.error('[Documents]',error)","console.error('[Documents]',{code:error.code||'DOCUMENT_REQUEST_FAILED',status:error.status||500})")
edit('api/documents.js', documents)

def helpers(s):
    s = "import { assertUsableSummaryResult, isUnusableSummary } from './summarySafety.js';\n" + s
    for name in ['generateClientSessionSummary','generateSessionSummary']:
        a=s.index('export async function '+name+'(');b=s.index('\n',a)
        part=replace(s[a:b],'return payload.data;','return assertUsableSummaryResult(payload.data);')
        s=s[:a]+part+s[b:]
    s=replace(s,"if(!document?.id||document.status==='completed')throw new Error('Only draft documents can be finalised');","if(!document?.id||document.status==='completed')throw new Error('Only draft documents can be finalised');if(isUnusableSummary(document.content))throw new Error('Review this source and regenerate before finalising.');")
    return s+"\nexport async function checkSummarySourceSafety(documentId){const headers=await authHeaders();const response=await fetch(`/api/documents?reviewStatus=${encodeURIComponent(documentId)}`,{headers});if(!response.ok)return apiError(response,'Unable to verify source safety. Review before sharing.');return response.json();}\n"
edit('src/lib/clientDocuments.js', helpers)

def transcript_api(s):
    s=s.replace("completed_at, attention_cleared_at';","completed_at, attention_cleared_at, source_version, source_review';")
    return replace(s,'    id: row.id,','    id: row.id,\n    sourceVersion:row.source_version, sourceReview:row.source_review,')
edit('api/zoom/transcripts.js',transcript_api)

print('Integrated summary outcomes, source evidence, legacy exclusion and protected document exports.')
