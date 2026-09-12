import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const read = path => readFile(new URL(path, import.meta.url), 'utf8')

test('document finalisation keeps therapist checks before using the protected server client', async () => {
  const source = await read('../api/documents.js')

  assert.match(source, /getSupabaseClient, getSupabaseUserClient/)
  assert.match(source, /const draft=await getOwnedDraft\(supabase,user,documentId,expectedVersion\)/)
  assert.match(source, /\.eq\('user_id',user\.id\)\.eq\('status','draft'\)/)
  assert.match(source, /const protectedSupabase=getSupabaseClient\(\)/)
  assert.match(source, /protectedSupabase\.from\('documents'\)\.update/)
  assert.match(source, /\.eq\('id',documentId\)\.eq\('user_id',user\.id\)\.eq\('status','draft'\)\.eq\('version',expectedVersion\)/)
})

test('browser document writes still use the authenticated user client', async () => {
  const source = await read('../api/documents.js')

  assert.match(source, /const \{supabase,user\}=await requireUser\(req\)/)
  assert.match(source, /supabase\.from\('documents'\)\.insert/)
  assert.doesNotMatch(source, /protectedSupabase\.from\('documents'\)\.insert/)
})
