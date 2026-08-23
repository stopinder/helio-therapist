import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('shared Helios brand lockup always links to the public landing page', async () => {
  const content = await readFile(new URL('../src/layouts/AppShell.vue', import.meta.url), 'utf8')
  assert.match(content, /const BrandLockup=defineComponent/)
  assert.match(content, /h\(RouterLink,\{to:'\/'/)
  assert.match(content, /'aria-label':'Helios home'/)
})
