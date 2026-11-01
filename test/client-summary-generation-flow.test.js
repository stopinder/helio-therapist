import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const composer = await readFile(new URL('../src/components/workspace/ClientDocumentComposer.vue', import.meta.url), 'utf8')

test('client summary configures evidence before offering generation', () => {
  const perspective = composer.indexOf('>Perspective<')
  const continuity = composer.indexOf('>Continuity<')
  const anchor = composer.indexOf('>Anchor session<')
  const additions = composer.indexOf('>Therapist additions ')
  const generate = composer.indexOf("hasExistingSummary ? 'Regenerate client summary' : 'Generate client summary'")

  assert.ok(perspective > -1)
  assert.ok(continuity > perspective)
  assert.ok(anchor > continuity)
  assert.ok(additions > anchor)
  assert.ok(generate > additions)
})

test('client summary setup explains scope and selected evidence compactly', () => {
  assert.match(composer, /Summary setup/)
  assert.match(composer, /Decide how Helios should read the available material before generating\./)
  assert.match(composer, /Clinical lens/)
  assert.match(composer, /How much recent history/)
  assert.match(composer, /Latest session to include/)
  assert.match(composer, /Evidence selected/)
  assert.match(composer, /session source/)
})

test('client summary generation is disabled until evidence is ready', () => {
  assert.match(composer, /:disabled="generatingSummary \|\| loadingEvidence \|\| !anchorSessionId \|\| Boolean\(evidenceError\)"/)
})

test('clinical intelligence intro no longer places a primary generate button before controls', () => {
  const sectionStart = composer.indexOf('aria-labelledby="clinical-intelligence-heading"')
  const setup = composer.indexOf('Summary setup', sectionStart)
  const firstGenerate = composer.indexOf('Regenerate client summary', sectionStart)
  assert.ok(sectionStart > -1)
  assert.ok(setup > sectionStart)
  assert.ok(firstGenerate > setup)
  assert.doesNotMatch(composer.slice(sectionStart, setup), /@click="generateSummary"/)
})
