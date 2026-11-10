import { authenticatedFetch } from './api.js';
import { assertUsableSummaryResult } from './summarySafety.js';

async function requestModality(payload) {
  const response = await authenticatedFetch('/api/ai/modality-summary',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
  const result = await response.json().catch(()=>null);
  if (!response.ok || !result?.success) throw Object.assign(new Error(result?.error?.message || 'Clinical intelligence could not be prepared. Your existing work is unchanged.'),{code:result?.error?.code || 'INTELLIGENCE_UNAVAILABLE',status:response.status});
  return result.data;
}
export async function listModalityEvidence(clientId){const result=await requestModality({clientId,scope:'longitudinal',action:'availability'});return result.availableSessions||[];}
export async function readModalitySources(selection) { return requestModality({...selection,action:'sources'}); }
export async function generateModalitySummary(selection) {
  const result = await requestModality({...selection,action:'generate'});
  if (result?.mode === 'therapist_formulation' && result?.outcome === 'ready') {
    if (result.formulation?.visibility !== 'therapist_only' || !result.formulation?.fields || result.draft) throw new Error('The therapist formulation could not be safely separated from the client document.');
    return result;
  }
  return assertUsableSummaryResult(result);
}

export function assertClientSummaryProjection(result) {
  if (result?.mode === 'therapist_formulation' || result?.visibility === 'therapist_only' || !result?.draft?.body) {
    const error = new Error('Therapist working material cannot replace a client summary.');
    error.code = 'PRIVATE_FORMULATION_NOT_CLIENT_DOCUMENT';
    throw error;
  }
  return result.draft;
}
