import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const read = path => readFile(new URL(path, import.meta.url), 'utf8')

test('Settings prioritises connections before practice details', async () => {
  const source = await read('../src/components/Settings.vue')
  const connections = source.indexOf('data-testid="settings-connections"')
  const practice = source.indexOf('data-testid="settings-practice-profile"')
  assert.ok(connections >= 0)
  assert.ok(practice > connections)
  assert.match(source, />Connections</)
  assert.match(source, />Practice & professional details</)
})

test('Settings provides private practice logo upload replace and removal', async () => {
  const source = await read('../src/components/Settings.vue')
  assert.match(source, /practice_logo_path/)
  assert.match(source, /practice-branding/)
  assert.match(source, /image\/png,image\/jpeg,image\/webp/)
  assert.match(source, /2\*1024\*1024/)
  assert.match(source, /uploadLogo/)
  assert.match(source, /removeLogo/)
  assert.match(source, /createSignedUrl/)
})

test('practice branding migration keeps logos private and owner scoped', async () => {
  const migration = await read('../supabase/migrations/20260822093000_add_practice_logo.sql')
  assert.match(migration, /practice_logo_path text/)
  assert.match(migration, /'practice-branding'/)
  assert.match(migration, /false,\s*2097152/)
  assert.match(migration, /image\/png/)
  assert.match(migration, /storage\.foldername\(name\)/)
  assert.match(migration, /auth\.uid\(\)/)
})
