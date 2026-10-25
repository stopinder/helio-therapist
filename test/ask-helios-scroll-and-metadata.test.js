import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { normalizeResult } from '../api/_lib/research-retrieval.js'

test('Ask Helios scroll positions a new answer at its start, not its references', () => {
  const source = readFileSync(new URL('../src/components/ui/AskHeliosPanel.vue', import.meta.url), 'utf8')
  assert.match(source, /await scrollToMessageStart\(messages\.value\.length - 1\)/)
  assert.match(source, /message\.getBoundingClientRect\(\)\.top - container\.getBoundingClientRect\(\)\.top/)
  assert.doesNotMatch(source, /scrollToBottom|scrollTop\s*=\s*scrollContainer\.value\.scrollHeight/)
})

test('Europe PMC PMCID links do not duplicate the PMC prefix', () => {
  const result = normalizeResult('europepmc', {
    pmcid: 'PMC13655579',
    id: '13655579',
    source: 'PMC',
    title: 'Clinical review',
    authorString: 'Researcher A',
    pubYear: '2026',
    journalTitle: 'Clinical Journal'
  })
  assert.equal(result.url, 'https://europepmc.org/articles/PMC13655579')
  assert.equal(result.year, '2026')
  assert.equal(result.journal, 'Clinical Journal')
})

test('Europe PMC metadata falls back cleanly when year and journal are absent', () => {
  const result = normalizeResult('europepmc', {
    pmcid: 'PMC12345', id: '12345', source: 'PMC', title: 'Title', authorString: 'A'
  })
  assert.equal(result.year, 'Year not supplied')
  assert.equal(result.journal, 'Journal not supplied')
  assert.equal(result.url, 'https://europepmc.org/articles/PMC12345')
})

test('Europe PMC PMID preferred when available', () => {
  const result = normalizeResult('europepmc', {
    pmid: '12345678', pmcid: 'PMC12345', title: 'Title'
  })
  assert.equal(result.url, 'https://pubmed.ncbi.nlm.nih.gov/12345678/')
})
