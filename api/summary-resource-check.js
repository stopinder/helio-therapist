import { requireAuthenticatedUser } from './_lib/supabase.js';
import { verifySummaryResource } from './_lib/summary-resource-check.js';
const recent=new Map();
export default async function handler(req,res) {
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='POST'){res.setHeader('Allow','POST');return res.status(405).json({success:false,error:{code:'METHOD_NOT_ALLOWED',message:'Method not allowed'}});}
  try {
    const {user}=await requireAuthenticatedUser(req);
    const body=req.body;
    if(!body || typeof body!=='object' || Array.isArray(body) || Object.keys(body).some(key=>key!=='url') || typeof body.url!=='string') {
      return res.status(400).json({success:false,error:{code:'INVALID_RESOURCE',message:'Supply only the public resource URL. Do not submit client information.'}});
    }
    const now=Date.now();const entry=recent.get(user.id);
    if(entry && now-entry.started<60000 && entry.count>=10)return res.status(429).json({success:false,error:{code:'RESOURCE_RATE_LIMIT',message:'Please try the link check again shortly.'}});
    if(recent.size>1000)for(const [key,value] of recent)if(now-value.started>=60000)recent.delete(key);
    recent.set(user.id,entry && now-entry.started<60000 ? {started:entry.started,count:entry.count+1} : {started:now,count:1});
    const data=await verifySummaryResource({url:body.url});
    return res.status(200).json({success:true,data});
  } catch(error) {
    const status=[400,401,403,422,429].includes(error.status)?error.status:422;
    return res.status(status).json({success:false,error:{code:error.code||'RESOURCE_NOT_VERIFIED',message:status===401||status===403?'Please sign in to check a resource.':status===400?'Provide a valid public HTTPS resource link.':'The link could not be checked. Choose another resource or continue without one.'}});
  }
}
