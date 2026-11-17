import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

test('Clinical preference migration preserves legacy values and rejects unknown approaches', async () => {
  const db = new PGlite();
  try {
    await db.exec("create schema if not exists public; create table public.clients (id integer primary key, preferred_summary_lens text not null default 'integrative', constraint clients_preferred_summary_lens_check check (preferred_summary_lens in ('general','integrative','gentle_cbt','internal_family_systems','transactional_analysis'))); insert into public.clients values (1,'general'),(2,'internal_family_systems');");
    await db.exec(readFileSync(new URL('../supabase/migrations/20261117095101_allow_clinical_summary_lens.sql', import.meta.url), 'utf8'));
    await db.exec("insert into public.clients values (3,'clinical');");
    assert.deepEqual((await db.query('select preferred_summary_lens from public.clients order by id')).rows.map(r => r.preferred_summary_lens), ['general','internal_family_systems','clinical']);
    await assert.rejects(db.exec("insert into public.clients values (4,'invented');"));
  } finally { await db.close(); }
});
