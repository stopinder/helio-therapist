import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('Vercel routing configuration', async (t) => {
  const vercelJsonSource = await readFile(new URL('../vercel.json', import.meta.url), 'utf8')
  const vercelJson = JSON.parse(vercelJsonSource)

  await t.test('SPA catch-all rewrite is present', () => {
    const catchAll = vercelJson.rewrites.find(r => r.source === "/(.*)" && r.destination === "/index.html")
    assert.ok(catchAll, 'Should have a catch-all rewrite for SPA routing')
  })

  await t.test('Schema is present', () => {
    assert.strictEqual(vercelJson.$schema, "https://openapi.vercel.sh/vercel.json")
  })
})
