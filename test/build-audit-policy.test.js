import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateBuildAudit } from '../scripts/build-audit.mjs';
const now=Date.parse('2026-11-17T12:00:00Z');
function report(){return {metadata:{vulnerabilities:{high:1}},lockPackages:{'node_modules/picomatch':{dev:true}},vulnerabilities:{picomatch:{name:'picomatch',isDirect:false,nodes:['node_modules/picomatch'],via:[{name:'picomatch',url:'https://github.com/advisories/GHSA-fc5q-39xc-vjpf'}]}}};}
test('build audit exception is only for this advisory in development nodes and expires',()=>{
  assert.equal(evaluateBuildAudit(report(),now).ok,true);
  const runtime=report();runtime.lockPackages['node_modules/picomatch'].dev=false;assert.equal(evaluateBuildAudit(runtime,now).ok,false);
  const other=report();other.vulnerabilities.picomatch.via[0].url='https://github.com/advisories/another';assert.equal(evaluateBuildAudit(other,now).ok,false);
  assert.equal(evaluateBuildAudit(report(),Date.parse('2026-11-24T00:00:00Z')).ok,false);
  assert.equal(evaluateBuildAudit({error:'offline'},now).ok,false);
});
