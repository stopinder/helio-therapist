import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const shellUrl=new URL('../src/layouts/AppShell.vue',import.meta.url);

test('sidebar groups primary destinations and keeps scheduling as an action',async()=>{
  const shell=await readFile(shellUrl,'utf8');
  assert.match(shell,/label:'Practice'/);
  assert.match(shell,/label:'Records'/);
  assert.match(shell,/label:'Development'/);
  assert.match(shell,/{name:'Calendar',path:'\/calendar'/);
  assert.doesNotMatch(shell,/{name:'Schedule',path:'\/schedule'/);
  assert.match(shell,/to="\/schedule"[^>]*>Schedule appointment/);
});

test('sidebar uses CPD and restrained icon components instead of emoji navigation',async()=>{
  const shell=await readFile(shellUrl,'utf8');
  assert.match(shell,/{name:'CPD',path:'\/supervision'/);
  assert.match(shell,/CalendarDaysIcon/);
  assert.match(shell,/FolderOpenIcon/);
  assert.doesNotMatch(shell,/📊|🗓️|➕|👥|📝|📄|🌱|🚪/);
});

test('account footer keeps settings and sign out visually secondary',async()=>{
  const shell=await readFile(shellUrl,'utf8');
  assert.match(shell,/text-caption font-medium text-ink-muted/);
  assert.match(shell,/text-caption text-ink-subtle/);
  assert.match(shell,/Cog6ToothIcon/);
  assert.match(shell,/ArrowRightStartOnRectangleIcon/);
});
