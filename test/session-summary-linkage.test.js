import test from 'node:test'
import assert from 'node:assert/strict'
import { PGlite } from '@electric-sql/pglite'
import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const migrationDirectory = fileURLToPath(new URL('../supabase/migrations/', import.meta.url));

test('session summary linkage reproduction', async () => {
  const db = new PGlite();
  await db.waitReady;

  // 1. Setup minimal schema
  await db.exec(`
    create table if not exists public.clients (
      id uuid primary key default gen_random_uuid(),
      user_id uuid not null,
      display_name text
    );
    create table if not exists public.documents (
      id uuid primary key default gen_random_uuid(),
      user_id uuid not null,
      client_id uuid references public.clients(id),
      client_ref text,
      client_name text,
      title text,
      document_type text,
      status text,
      content jsonb default '{}'::jsonb,
      source_manifest jsonb default '[]'::jsonb,
      finalized_at timestamptz,
      updated_at timestamptz default now()
    );
  `);

  // 2. Mock data
  const clientId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const sessionId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  const userId = '11111111-1111-4111-8111-111111111111';

  await db.exec(`
    insert into public.clients (id, user_id, display_name) 
    values ('${clientId}', '${userId}', 'Test Client');
  `);

  // 3. Define findSessionSummary (mirrored from src/lib/clientDocuments.js)
  async function findSessionSummary({clientId, sessionId}) {
    const result = await db.query(`
      select id, client_id, title, document_type, source_manifest 
      from public.documents 
      where client_id = $1
      order by updated_at desc
    `, [clientId]);
    
    const documents = result.rows.map(row => ({
      id: row.id,
      clientId: row.client_id,
      documentType: row.document_type,
      sourceManifest: Array.isArray(row.source_manifest) ? row.source_manifest : []
    }));

    return documents.find(doc => 
      doc.documentType === 'session_summary' && 
      doc.sourceManifest?.some(src => src.sessionId === sessionId)
    ) || null;
  }

  // 4. Simulate current writer behavior (MISSING sessionId)
  const currentWriterSources = [
    { 
      id: 'ccccccc-cccc-4ccc-8ccc-cccccccccccc', 
      kind: 'zoom_transcript', 
      source: 'zoom', 
      hasTranscript: true, 
      hasZoomSummary: true 
    }
  ];

  await db.query(`
    insert into public.documents (user_id, client_id, title, document_type, status, source_manifest)
    values ($1, $2, $3, $4, $5, $6)
  `, [userId, clientId, 'Session Summary - Date', 'session_summary', 'draft', JSON.stringify(currentWriterSources)]);

  // 5. Verify failure
  const foundOld = await findSessionSummary({ clientId, sessionId });
  assert.strictEqual(foundOld, null, 'Should NOT find summary when sessionId is missing from manifest');

  // 6. Simulate fixed writer behavior (WITH sessionId)
  const fixedWriterSources = [
    { 
      id: 'ccccccc-cccc-4ccc-8ccc-cccccccccccc', 
      sessionId: sessionId, // THE FIX
      kind: 'zoom_transcript', 
      source: 'zoom', 
      hasTranscript: true, 
      hasZoomSummary: true 
    }
  ];

  await db.query(`
    insert into public.documents (user_id, client_id, title, document_type, status, source_manifest)
    values ($1, $2, $3, $4, $5, $6)
  `, [userId, clientId, 'Fixed Session Summary', 'session_summary', 'draft', JSON.stringify(fixedWriterSources)]);

  // 7. Verify success
  const foundNew = await findSessionSummary({ clientId, sessionId });
  assert.ok(foundNew, 'Should find summary when sessionId is present in manifest');
  assert.strictEqual(foundNew.sourceManifest[0].sessionId, sessionId, 'Manifest should contain the correct sessionId');
  assert.strictEqual(foundNew.sourceManifest[0].kind, 'zoom_transcript', 'Existing fields should be preserved');

  console.log('Linkage reproduction test passed!');
  await db.close();
});
