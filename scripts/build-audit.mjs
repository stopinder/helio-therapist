import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Temporary, explicit risk acceptance for repository-controlled build globs only.
// Never exempts a production dependency or any other advisory. See docs/build-audit-exception.md.
const ADVISORY='https://github.com/advisories/GHSA-fc5q-39xc-vjpf';
const EXPIRY=Date.parse('2026-11-24T00:00:00Z');
export function evaluateBuildAudit(report,now=Date.now()){
  if(!report||report.error||!report.metadata?.vulnerabilities||!report.vulnerabilities)return {ok:false,reason:'Audit did not return a complete report.'};
  const entries=Object.entries(report.vulnerabilities);
  if(!entries.length)return {ok:true,exception:false};
  if(now>=EXPIRY)return {ok:false,reason:'The development-only advisory exception expired.'};
  const visiting=new Set();
  function allowed(name){
    const item=report.vulnerabilities[name];
    if(!item||item.isDirect&&item.name==='picomatch'||!Array.isArray(item.via)||!item.via.length||visiting.has(name))return false;
    // npm reports every vulnerable installed node. Lockfile proves all are dev-only.
    if(!Array.isArray(item.nodes)||!item.nodes.length||item.nodes.some(path=>!report.lockPackages?.[path]?.dev))return false;
    visiting.add(name);
    const okay=item.via.every(via=>typeof via==='string'?allowed(via):via?.name==='picomatch'&&via.url===ADVISORY);
    visiting.delete(name);return okay;
  }
  if(!entries.every(([name])=>allowed(name)))return {ok:false,reason:'An advisory is outside the development-only exception.'};
  return {ok:true,exception:true};
}
export function runBuildAudit(){
  const run=spawnSync(process.platform==='win32'?'npm.cmd':'npm',['audit','--json'],{encoding:'utf8',timeout:60000,maxBuffer:8000000});
  if(run.error||run.signal||![0,1].includes(run.status))throw new Error('Dependency audit could not complete.');
  let report;try{report=JSON.parse(run.stdout)}catch{throw new Error('Dependency audit returned an unreadable report.');}
  return report;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
  const {readFileSync}=await import('node:fs');
  try{
    const report=runBuildAudit();
    const verdict=evaluateBuildAudit({...report,lockPackages:JSON.parse(readFileSync(new URL('../package-lock.json',import.meta.url),'utf8')).packages});
    if(!verdict.ok)throw new Error(verdict.reason);
    console.log(verdict.exception?'Audit passed with one documented dev-only advisory exception, expiring 2026-11-24.':'Dependency audit passed without exceptions.');
  }catch(error){console.error(error.message);process.exitCode=1;}
}
