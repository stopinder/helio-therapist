import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

// Compare real failures, not an assumed historical count. Output test names only.
function run(cwd){
  const files=readdirSync(resolve(cwd,'test')).filter(name=>name.endsWith('.test.js')).sort().map(name=>'test/'+name);
  const result=spawnSync(process.execPath,['--test','--test-reporter=tap',...files],{cwd,encoding:'utf8',timeout:240000,maxBuffer:24000000});
  if(result.error || result.signal)throw new Error('Node suite could not finish: '+(result.error?.code||result.signal));
  const output=result.stdout||'';
  const counts=[...output.matchAll(/^# tests (\d+)$/gm)];
  if(!counts.length)throw new Error('Node suite did not produce a complete test report.');
  const failed=[...new Set([...output.matchAll(/^\s*not ok \d+ - (.+)$/gm)].map(match=>match[1].trim()))].sort();
  if(result.status!==0 && !failed.length)throw new Error('Node suite failed without a reportable test failure.');
  return {tests:Number(counts.at(-1)[1]),failed};
}
const baseline=process.argv[2];
if(!baseline)throw new Error('Pass the detached baseline worktree path.');
const before=run(resolve(baseline));
const after=run(process.cwd());
const newFailures=after.failed.filter(name=>!before.failed.includes(name));
console.log(JSON.stringify({baselineTests:before.tests,headTests:after.tests,baselineFailures:before.failed,headFailures:after.failed,newFailures},null,2));
if(after.tests<before.tests || newFailures.length)process.exitCode=1;
