import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const headerUrl = new URL('../src/components/shell/AppHeader.vue', import.meta.url);
const sidebarUrl = new URL('../src/components/shell/AppSidebar.vue', import.meta.url);

test('sidebar and header group primary therapist destinations', async () => {
  const sidebar = await readFile(sidebarUrl, 'utf8');
  const header = await readFile(headerUrl, 'utf8');

  // Verify core navigation links in sidebar
  assert.match(sidebar, /\{\s*name:\s*'Today',\s*path:\s*'\/overview'/);
  assert.match(sidebar, /\{\s*name:\s*'Clients',\s*path:\s*'\/clients'/);
  assert.match(sidebar, /\{\s*name:\s*'Calendar',\s*path:\s*'\/calendar'/);
  assert.match(sidebar, /\{\s*name:\s*'Reflect',\s*path:\s*'\/supervision'/);

  // Scheduling is a header action
  assert.match(header, /to="\/schedule"/);
  assert.match(header, /Schedule appointment/);
  
  // Verify that Records / Documents / Transcripts are NOT in the permanent sidebar
  assert.doesNotMatch(sidebar, /Records/);
  assert.doesNotMatch(sidebar, /Documents/);
  assert.doesNotMatch(sidebar, /Transcripts/);
});

test('sidebar uses restrained Lucide components instead of emoji navigation', async () => {
  const sidebar = await readFile(sidebarUrl, 'utf8');
  assert.match(sidebar, /from '@lucide\/vue'/);
  assert.match(sidebar, /CalendarDays/);
  assert.match(sidebar, /LayoutDashboard/);
  assert.match(sidebar, /GraduationCap/);
  assert.doesNotMatch(sidebar, /📊|🗓️|➕|👥|📝|📄|🌱|🚪/);
});
