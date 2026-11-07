import { supabase } from './supabase.js'
function failure(message,code,status){return Object.assign(new Error(message),{code,status})}
export async function suggestClinicalRecordFields({clientId,sessionId,focusField=null}){
  if(!supabase)throw failure('Please sign in again.','AUTH_REQUIRED',401)
  const {data,error}=await supabase.auth.getSession()
  if(error)throw failure('Please sign in again.','AUTH_REQUIRED',401)
  const token=data?.session?.access_token
  if(!token)throw failure('Please sign in again.','AUTH_REQUIRED',401)
  const response=await fetch('/api/ai/clinical-record-suggestions',{
    method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},
    body:JSON.stringify({clientId,sessionId,focusField})
  })
  const result=await response.json().catch(()=>({}))
  if(!response.ok){
    const code=[401,403].includes(response.status)?'AUTH_REQUIRED':result?.error?.code
    throw failure(result?.error?.message||'Unable to prepare suggestions.',code,response.status)
  }
  if(result.data?.clientId!==clientId||result.data?.sessionId!==sessionId)throw failure('The suggestion was not linked to this encounter.','SUGGESTION_SCOPE_MISMATCH',409)
  if(!result.data?.fields || typeof result.data.fields!=='object' || Array.isArray(result.data.fields))throw failure('The response did not contain usable suggestion fields. Your draft is unchanged.','INVALID_RESPONSE_FORMAT',502)
  return result.data
}
