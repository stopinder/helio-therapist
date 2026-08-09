import crypto from 'crypto';
import { requireAuthenticatedUser } from './_lib/supabase.js';

export const config = { api: { bodyParser: false } };
const allowed = new Set(['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document']);

async function readBody(req, limit = 10485760) {
  const chunks=[]; let size=0;
  for await (const chunk of req) { size += chunk.length; if (size > limit) { const e=new Error('File must be 10 MB or smaller'); e.status=413; throw e; } chunks.push(chunk); }
  return Buffer.concat(chunks);
}
function clean(value, max=160){return String(value||'').trim().slice(0,max)}

export default async function handler(req,res){
  try {
    const {supabase,user}=await requireAuthenticatedUser(req);
    if(req.method==='GET'){
      if(req.query.download){
        const {data:doc,error}=await supabase.from('documents').select('*').eq('id',req.query.download).eq('user_id',user.id).single();
        if(error||!doc)return res.status(404).json({error:'Document not found'});
        if(!doc.storage_path)return res.status(409).json({error:'This document has not been finalised yet'});
        const {data:signed,error:signError}=await supabase.storage.from('client-documents').createSignedUrl(doc.storage_path,60,{download:doc.original_filename||'document.pdf'});
        if(signError)throw signError; return res.status(200).json({url:signed.signedUrl});
      }
      let query=supabase.from('documents').select('id,client_id,client_ref,client_name,title,document_type,report_date,original_filename,mime_type,size_bytes,status,created_at,updated_at,finalized_at,version').eq('user_id',user.id).order('created_at',{ascending:false});
      if(req.query.clientId)query=query.eq('client_id',clean(req.query.clientId,80));
      else if(req.query.clientRef)query=query.eq('client_ref',clean(req.query.clientRef,80));
      const {data,error}=await query; if(error)throw error; return res.status(200).json({documents:data||[]});
    }
    if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});

    if(req.query.finalize){
      const documentId=clean(req.query.finalize,80);
      const expectedVersion=Number.parseInt(clean(req.query.expectedVersion,20),10);
      if(!documentId||!Number.isInteger(expectedVersion)||expectedVersion<1)return res.status(400).json({error:'Document and expected version are required'});
      const {data:draft,error:draftError}=await supabase.from('documents').select('*').eq('id',documentId).eq('user_id',user.id).eq('status','draft').single();
      if(draftError||!draft)return res.status(404).json({error:'Draft document not found'});
      if(draft.version!==expectedVersion)return res.status(409).json({error:'This document changed in another tab. Reopen it before finalising.'});
      const mime=clean(req.headers['content-type'],120).split(';')[0];
      if(mime!=='application/pdf')return res.status(415).json({error:'Finalised Helio documents must be PDF'});
      const body=await readBody(req); if(!body.length)return res.status(400).json({error:'The generated PDF is empty'});
      const safeTitle=(clean(draft.title,120)||'document').replace(/[^a-z0-9_-]+/gi,'-').replace(/^-+|-+$/g,'').toLowerCase()||'document';
      const filename=`${safeTitle}.pdf`;
      const path=`${user.id}/${documentId}/${crypto.randomUUID()}.pdf`;
      const {error:uploadError}=await supabase.storage.from('client-documents').upload(path,body,{contentType:mime,upsert:false}); if(uploadError)throw uploadError;
      const now=new Date().toISOString();
      const {data:completed,error:updateError}=await supabase.from('documents').update({storage_path:path,original_filename:filename,mime_type:mime,size_bytes:body.length,status:'completed',finalized_at:now,report_date:draft.report_date||now.slice(0,10),updated_at:now,version:expectedVersion+1}).eq('id',documentId).eq('user_id',user.id).eq('status','draft').eq('version',expectedVersion).select().maybeSingle();
      if(updateError||!completed){await supabase.storage.from('client-documents').remove([path]); if(updateError)throw updateError; return res.status(409).json({error:'This document changed while it was being finalised. Reopen it and try again.'});}
      return res.status(200).json({document:completed});
    }

    const mime=clean(req.headers['content-type'],120).split(';')[0];
    if(!allowed.has(mime))return res.status(415).json({error:'Upload a PDF or Word document'});
    const clientRef=clean(req.query.clientRef,80),clientId=clean(req.query.clientId,80)||null,clientName=clean(req.query.clientName),title=clean(req.query.title),documentType=clean(req.query.documentType,50)||'other',reportDate=clean(req.query.reportDate,10)||null;
    if(!clientRef||!clientName||!title)return res.status(400).json({error:'Client and report title are required'});
    if(clientId){const {data:ownedClient,error:clientError}=await supabase.from('clients').select('id').eq('id',clientId).eq('user_id',user.id).single(); if(clientError||!ownedClient)return res.status(404).json({error:'Client not found'});}
    const body=await readBody(req); if(!body.length)return res.status(400).json({error:'The selected file is empty'});
    const original=clean(decodeURIComponent(req.headers['x-file-name']||'report'),180);
    const extension=mime==='application/pdf'?'pdf':mime==='application/msword'?'doc':'docx';
    const path=`${user.id}/${crypto.randomUUID()}.${extension}`;
    const {error:uploadError}=await supabase.storage.from('client-documents').upload(path,body,{contentType:mime,upsert:false}); if(uploadError)throw uploadError;
    const {data,error}=await supabase.from('documents').insert({user_id:user.id,client_id:clientId,client_ref:clientRef,client_name:clientName,title,document_type:documentType,report_date:reportDate,storage_path:path,original_filename:original,mime_type:mime,size_bytes:body.length,status:'completed'}).select().single();
    if(error){await supabase.storage.from('client-documents').remove([path]);throw error;} return res.status(201).json({document:data});
  } catch(error){console.error('[Documents]',error);return res.status(error.status||500).json({error:error.message||'Document request failed'});}
}
