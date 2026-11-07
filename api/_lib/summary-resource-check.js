import https from 'node:https';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { safeResourceUrl } from '../../src/lib/summaryAuthoring.js';
const MAX_BYTES = 65536;
function unavailable(message = 'The link could not be checked. Choose another resource or continue without one.') {
  return Object.assign(new Error(message), { code: 'RESOURCE_NOT_VERIFIED', status: 422 });
}
export function isPublicResourceAddress(address) {
  const family = isIP(address);
  if (family === 4) {
    const [a,b,c] = address.split('.').map(Number);
    return !(a===0 || a===10 || a===127 || a>=224 || (a===100 && b>=64 && b<=127) ||
      (a===169 && b===254) || (a===172 && b>=16 && b<=31) ||
      (a===192 && (b===168 || b===0 || b===88 && c===99)) ||
      (a===198 && (b===18 || b===19 || b===51 && c===100)) || (a===203 && b===0 && c===113));
  }
  // Global unicast only, excluding documentation, Teredo, 6to4 and embedded IPv4.
  return family === 6 && /^[23][0-9a-f]{3}:/i.test(address) && !address.includes('.') &&
    !/^2001:(db8|0):|^2002:/i.test(address);
}
export async function readPublicResource(rawUrl, { resolve = lookup, request = https.request, deadline = Date.now()+10000, redirects = 0 } = {}) {
  const url = new URL(safeResourceUrl(rawUrl));
  if (redirects > 2 || Date.now() >= deadline) throw unavailable();
  const addresses = await Promise.race([
    resolve(url.hostname, { all: true, verbatim: true }),
    new Promise((_, reject) => { const timer=setTimeout(()=>reject(unavailable()), Math.max(1,deadline-Date.now())); timer.unref?.(); })
  ]);
  if (!addresses.length || addresses.some(item => !isPublicResourceAddress(item.address))) throw unavailable('Only public internet resources can be checked.');
  const target=addresses[0];
  const response = await new Promise((resolveResponse,reject) => {
    let settled=false;
    const finish=(err,data)=>{if(settled)return;settled=true;err?reject(err):resolveResponse(data);};
    const req=request(url, {
      method:'GET', agent:false,
      headers:{Accept:'text/html,application/json',Range:`bytes=0-${MAX_BYTES-1}`,'User-Agent':'HeliosResourceLinkCheck/1.0'},
      // Pin the already validated address. A second DNS resolution must not rebind it.
      lookup: (_hostname, options, callback) => options?.all
        ? callback(null,[{address:target.address,family:target.family}])
        : callback(null,target.address,target.family),
      servername:url.hostname,
      timeout:Math.max(1,Math.min(5000,deadline-Date.now()))
    }, res => {
      const status=Number(res.statusCode);
      if ([301,302,303,307,308].includes(status)) {res.resume();finish(null,{status,location:res.headers.location});return;}
      if (status<200 || status>=300) {res.resume();finish(unavailable());return;}
      const type=String(res.headers['content-type']||'');
      if (!/text\/html|application\/json/i.test(type)) {res.resume();finish(unavailable('This resource does not provide a readable web page or supported video.'));return;}
      let bytes=0;const chunks=[];
      res.on('data',chunk=>{
        const buffer=Buffer.from(chunk);chunks.push(buffer.subarray(0,Math.max(0,MAX_BYTES-bytes)));bytes+=buffer.length;
        if(bytes>=MAX_BYTES){finish(null,{status,type,body:Buffer.concat(chunks).toString('utf8')});res.destroy();}
      });
      res.on('end',()=>finish(null,{status,type,body:Buffer.concat(chunks).toString('utf8')}));
      res.on('error',()=>finish(unavailable()));
    });
    req.on('timeout',()=>req.destroy(unavailable()));
    req.on('error',()=>finish(unavailable()));
    req.end();
  });
  if (response.location) {
    const next=new URL(response.location,url).href;
    return readPublicResource(next,{resolve,request,deadline,redirects:redirects+1});
  }
  return response;
}
function cleanTitle(text) {
  return String(text||'').replace(/<[^>]*>/g,'').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'")
    .replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/[\r\n\u0000-\u001f]/g,' ').replace(/\s+/g,' ').trim().slice(0,180);
}
export async function verifySummaryResource(resource, { read = readPublicResource, now = () => new Date().toISOString() } = {}) {
  if (!resource) return null;
  const url=safeResourceUrl(resource.url);
  const parsed=new URL(url);
  let title='', kind='web_page';
  if (['youtube.com','www.youtube.com','m.youtube.com','youtu.be'].includes(parsed.hostname)) {
    const video=parsed.hostname==='youtu.be' ? parsed.pathname.slice(1) : parsed.searchParams.get('v') || parsed.pathname.match(/^\/(?:shorts|embed)\/([^/]+)/)?.[1];
    if (!/^[A-Za-z0-9_-]{11}$/.test(video||'')) throw unavailable('Choose a specific YouTube video, not a search or channel page.');
    const canonical=`https://www.youtube.com/watch?v=${video}`;
    const data=await read(`https://www.youtube.com/oembed?url=${encodeURIComponent(canonical)}&format=json`);
    let metadata;try{metadata=JSON.parse(data.body);}catch{throw unavailable();}
    if (metadata.type!=='video' || metadata.provider_name!=='YouTube' || !metadata.title) throw unavailable();
    title=cleanTitle(metadata.title);kind='video';
  } else {
    const data=await read(url);
    title=cleanTitle(data.body?.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]);
    if (!title || /just a moment|access denied|verify you are human|captcha/i.test(title)) throw unavailable();
  }
  return {url,title,kind,status:'reachable',checkedAt:now(),verification:'link_and_metadata_only',clinicalSuitability:'not_assessed'};
}
