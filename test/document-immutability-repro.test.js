import test from 'node:test'
import assert from 'node:assert/strict'
import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PGlite } from '@electric-sql/pglite'

const migrationDirectory = fileURLToPath(new URL('../supabase/migrations/', import.meta.url));
const userOne = '11111111-1111-4111-8111-111111111111';
const clientOne = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

test('document immutability reproduction', async () => {
  const database = new PGlite();
  await database.waitReady;
  
  try {
    // Setup basic Supabase-like environment
    await database.exec(`
      create role anon;
      create role authenticated;
      create role service_role;
      create schema auth;
      create table auth.users (
        id uuid primary key,
        email text,
        raw_user_meta_data jsonb not null default '{}'::jsonb,
        created_at timestamptz not null default now()
      );
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      create schema storage;
      create table storage.buckets(id text primary key,name text not null,public boolean not null default false,file_size_limit bigint,allowed_mime_types text[]);
      create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text not null,name text not null);
      create function storage.foldername(name text) returns text[] language sql immutable as $$ select case when name is null or name='' then array[]::text[] else string_to_array(trim(both '/' from name),'/') end $$;
    `);

    const migrations = (await readdir(migrationDirectory)).filter(n => n.endsWith('.sql')).sort();
    for (const migration of migrations) {
      await database.exec(await readFile(join(migrationDirectory, migration), 'utf8'));
    }

    await database.exec(`
      insert into auth.users (id) values ('${userOne}');
      insert into public.clients (id, user_id, display_name) values ('${clientOne}', '${userOne}', 'Test Client');
    `);

    // Create a finalized document
    const docId = 'f0000000-0000-4000-8000-000000000001';
    await database.exec(`
      insert into public.documents (id, user_id, client_id, client_ref, client_name, title, status, finalized_at, storage_path, original_filename, mime_type, size_bytes)
      values ('${docId}', '${userOne}', '${clientOne}', 'CLIENT-1', 'Test Client', 'Final Report', 'completed', now(), 'path/to/file.pdf', 'file.pdf', 'application/pdf', 1024);
    `);

    // Act as the authenticated therapist
    await database.exec(`
      grant usage on schema public, auth to authenticated;
      grant select, update, delete on public.documents to authenticated;
      grant select on public.clients to authenticated;
      alter table public.documents enable row level security;
      alter table public.clients enable row level security;
    `);

    // Create a view to check trigger behavior without RLS interference
    // This simulates an attempt to bypass RLS via a view, which still hits the trigger
    await database.exec(`
      create view public.documents_rls_bypass as select * from public.documents;
      grant select, delete on public.documents_rls_bypass to authenticated;
    `);

    await database.exec(`
      set role authenticated;
      select set_config('request.jwt.claim.sub', '${userOne}', false);
    `);

    // Attempt to update the finalized document
    // This SHOULD fail due to RLS and Trigger.
    const updateAttempt = database.exec(`
      update public.documents 
      set title = 'Hacked Title' 
      where id = '${docId}';
    `);

    // In PostgreSQL, if RLS filtering excludes the row, UPDATE affects 0 rows and does NOT throw.
    // However, if it passes RLS but hits the Trigger, it DOES throw.
    // Our RLS 'using' clause now has 'finalized_at is null', so it should filter out the row.
    
    await updateAttempt;

    const updatedDoc = await database.query(`select title from public.documents where id = '${docId}'`);
    assert.strictEqual(updatedDoc.rows[0].title, 'Final Report', 'SUCCESS: Finalized document title was NOT changed');

    // Verify deletion protection remains (from service layer list, but here we test DB)
    // Existing RLS for delete doesn't have status check, but it probably should or is handled by trigger if we added it.
    // Wait, I didn't add it to delete. The prompt said "finalised document cannot be updated".
    // "existing finalised-document deletion protection remains intact."
    // Let's check existing delete policy.
    
    /*
    drop policy if exists "Users can delete own documents" on public.documents;
    create policy "Users can delete own documents"
      on public.documents for delete to authenticated
      using ((select auth.uid()) = user_id);
    */
    // The prompt says "existing finalised-document deletion protection remains intact".
    // src/lib/clientDocuments.js:14: if(document.status==='completed')throw new Error('Finalised documents cannot be deleted');
    
    // Test draft update still works
    await database.exec(`reset role`);
    const draftId = 'd0000000-0000-4000-8000-000000000002';
    await database.exec(`
      insert into public.documents (id, user_id, client_id, client_ref, client_name, title, status)
      values ('${draftId}', '${userOne}', '${clientOne}', 'CLIENT-1', 'Test Client', 'Draft Report', 'draft');
    `);
    
    // Now try to delete finalized document - trigger should block it
    await database.exec(`set role authenticated; select set_config('request.jwt.claim.sub', '${userOne}', false);`);
    
    try {
      // Use the view to bypass RLS and hit the trigger directly
      // This ensures that even if a policy was somehow bypassed, the trigger remains the ultimate safeguard.
      await database.exec(`delete from public.documents_rls_bypass where id = '${docId}'`);
      assert.fail('Should have thrown an error for finalized document deletion via view');
    } catch (e) {
      if (e.code === 'ERR_ASSERTION') throw e;
      assert.strictEqual(e.code, '42501', 'Should throw 42501 on finalized document deletion');
      assert.ok(e.message.includes('immutable'), 'Error message should mention immutability');
    }

    const stillExists = await database.query(`select count(*) from public.documents where id = '${docId}'`);
    assert.strictEqual(parseInt(stillExists.rows[0].count), 1, 'Finalized document should still exist');

    // Test draft update still works for owner
    await database.exec(`update public.documents set title = 'Updated Draft' where id = '${draftId}'`);
    const updatedDraft = await database.query(`select title from public.documents where id = '${draftId}'`);
    assert.strictEqual(updatedDraft.rows[0].title, 'Updated Draft', 'Draft should remain editable');

    // Verify deletion protection remains intact for draft (owner can delete)
    await database.exec(`delete from public.documents where id = '${draftId}'`);
    const deletedDraft = await database.query(`select count(*) from public.documents where id = '${draftId}'`);
    assert.strictEqual(parseInt(deletedDraft.rows[0].count), 0, 'Draft should be deletable by owner');

  } finally {
    await database.close();
  }
});
