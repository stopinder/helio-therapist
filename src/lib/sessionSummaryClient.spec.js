import { beforeEach, afterEach, it, expect, vi } from 'vitest';
vi.mock('./supabase.js',()=>({supabase:{auth:{getSession:async()=>({data:{session:{access_token:'synthetic-auth'}}})}}}));
import { generateSessionSummary } from './clientDocuments.js';

beforeEach(()=>{vi.stubGlobal('fetch',vi.fn());});
afterEach(()=>{vi.unstubAllGlobals();});

it('pins the displayed transcript version and exposes only a safe diagnostic reference',async()=>{
  const sourceVersion='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  fetch.mockResolvedValue({ok:false,status:502,json:async()=>({error:{code:'AI_RESPONSE_UNVERIFIED',diagnosticCode:'SS_RETRY_INVALID',message:'Synthetic generation failure.'}})});
  await expect(generateSessionSummary({clientId:'synthetic-client',sessionId:'synthetic-session',transcriptId:'synthetic-transcript',sourceVersion})).rejects.toMatchObject({code:'AI_RESPONSE_UNVERIFIED',diagnosticCode:'SS_RETRY_INVALID'});
  expect(JSON.parse(fetch.mock.calls[0][1].body)).toMatchObject({transcriptId:'synthetic-transcript',sourceVersion});
});

it('does not expose arbitrary diagnostic text as a reference',async()=>{
  fetch.mockResolvedValue({ok:false,status:502,json:async()=>({error:{code:'AI_RESPONSE_UNVERIFIED',diagnosticCode:'Synthetic private detail',message:'Synthetic generation failure.'}})});
  try {await generateSessionSummary({clientId:'synthetic-client',sessionId:'synthetic-session'});throw new Error('expected rejection');}
  catch(error){expect(error.code).toBe('AI_RESPONSE_UNVERIFIED');expect(error.diagnosticCode).toBeUndefined();}
});
