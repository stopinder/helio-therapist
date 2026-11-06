import { supabase } from './supabase.js'
export async function suggestClinicalRecordFields({clientId,sessionId,focusField=null}){
  if(!supabase)throw new Error('Please sign in again')
  const {data,error}=await supabase.auth.getSession()
  if(error)throw error
  const token=data?.session?.access_token
  if(!token)throw new Error('Please sign in again')
  const response=await fetch('/api/ai/clinical-record-suggestions',{
    method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},
    body:JSON.stringify({clientId,sessionId,focusField})
  })
  const result=await response.json().catch(()=>({}))
  if(!response.ok){const e=new Error(result?.error?.message||'Unable to prepare suggestions.');e.code=result?.error?.code;throw e}
  if(result.data?.clientId!==clientId||result.data?.sessionId!==sessionId)throw new Error('The suggestion was not linked to this encounter.')
  return result.data
}