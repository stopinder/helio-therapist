import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const shellUrl=new URL('../src/layouts/AppShell.vue',import.meta.url);

test('sidebar groups primary destinations and keeps scheduling as an action',async()=>{
  const shell=await readFile(shellUrl,'utf8');
  assert.match(shell,/label:'Practice'/);
  assert.match(shell,/label:'Records'/);
  assert.match(shell,/label:'Professional'/);
  assert.match(shell,/{name:'Calendar',path:'\/calendar'/);
  assert.doesNotMatch(shell,/{name:'Schedule',path:'\/schedule'/);
  assert.match(shell,/to="\/schedule"/);
  assert.match(shell,/Schedule appointment/);
});

test('sidebar uses CPD and restrained Lucide components instead of emoji navigation',async()=>{
  const shell=await readFile(shellUrl,'utf8');
  assert.match(shell,/{name:'CPD',path:'\/supervision'/);
  assert.match(shell,/from '@lucide\/vue'/);
  assert.match(shell,/CalendarDays/);
  assert.match(shell,/FolderOpen/);
  assert.match(shell,/GraduationCap/);
  assert.doesNotMatch(shell,/📊|🗓️|➕|👥|📝|📄|🌱|🚪/);
});

test('account footer keeps settings and sign out in the compact account menu',async()=>{
  const shell=await readFile(shellUrl,'utf8');
  assert.match(shell,/aria-haspopup':'menu'/);
  assert.match(shell,/to:'\/settings'/);
  assert.match(shell,/Settings/);
  assert.match(shell,/LogOut/);
  assert.match(shell,/Sign out/);
});
