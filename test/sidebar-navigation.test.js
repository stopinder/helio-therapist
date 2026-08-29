import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const shellUrl=new URL('../src/layouts/AppShell.vue',import.meta.url);

test('sidebar groups primary destinations and keeps scheduling as an action',async()=>{
  const shell=await readFile(shellUrl,'utf8');
  assert.match(shell,/label:\s*'Practice'/);
  assert.match(shell,/label:\s*'Records'/);
  assert.match(shell,/label:\s*'Professional'/);
  assert.match(shell,/\{\s*name:\s*'Calendar',\s*path:\s*'\/calendar'/);
  assert.doesNotMatch(shell,/\{\s*name:\s*'Schedule',\s*path:\s*'\/schedule'/);
  assert.match(shell,/to="\/schedule"/);
  assert.match(shell,/Schedule appointment/);
});

test('sidebar uses CPD and restrained Lucide components instead of emoji navigation',async()=>{
  const shell=await readFile(shellUrl,'utf8');
  assert.match(shell, /\{\s*name:\s*'CPD',\s*path:\s*'\/supervision'/);
  assert.match(shell,/from '@lucide\/vue'/);
  assert.match(shell,/CalendarDays/);
  assert.match(shell,/FolderOpen/);
  assert.match(shell,/GraduationCap/);
  assert.doesNotMatch(shell,/📊|🗓️|➕|👥|📝|📄|🌱|🚪/);
});

test('account footer keeps settings and sign out in the compact account menu',async()=>{
  const shell=await readFile(shellUrl,'utf8');
  assert.match(shell,/aria-haspopup/);
  assert.match(shell,/\/settings/);
  assert.match(shell,/Settings/);
  assert.match(shell,/LogOut/);
  assert.match(shell,/Sign out/);
});
