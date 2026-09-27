import test from 'node:test'
import assert from 'node:assert/strict'
import { HELP_ARTICLES, HELP_CATEGORIES, getHelpArticle } from '../src/content/help/articles.js'
import { searchHelp, MAX_HELP_QUERY_LENGTH } from '../src/lib/helpSearch.js'
import { readFileSync } from 'node:fs'

test('help catalogue has unique stable IDs, substantive articles and valid relations', () => {
  const ids = HELP_ARTICLES.map(article => article.id)
  assert.equal(new Set(ids).size, ids.length)
  assert.ok(ids.length >= 10)
  for (const article of HELP_ARTICLES) {
    assert.match(article.id, /^[a-z]+(?:-[a-z]+)*$/)
    assert.ok(HELP_CATEGORIES.includes(article.category))
    assert.ok(article.summary.length > 80)
    assert.ok(article.sections.length >= 3)
    assert.ok(article.sections.some(section => section.steps?.length >= 3))
    for (const id of article.related) assert.ok(getHelpArticle(id), `${article.id}: ${id}`)
  }
  assert.equal(getHelpArticle('../private-data'), null)
  assert.equal(getHelpArticle(undefined), null)
})

for (const [query, expected] of [
  ['last 3 sessions', 'client-summary'],
  ['last three sessions', 'client-summary'],
  ['where does my reflection go?', 'private-reflection'],
  ['over time', 'practice-map'],
  ['overtime', 'practice-map'],
  ['dictation', 'dictate'],
  ['MICROPHONE', 'dictate'],
  ['reflect on care', 'care-suggestions'],
  ['save accepted changes', 'care-suggestions'],
  ['therapeutic stance', 'therapeutic-stance'],
  ['refelction', 'private-reflection']
]) {
  test(`finds useful help for "${query}"`, () => assert.equal(searchHelp(query)[0]?.id, expected))
}

test('search supports partial words, punctuation, accents and category filtering', () => {
  assert.ok(searchHelp('dicta').some(article => article.id === 'dictate'))
  assert.equal(searchHelp('D\u00cdCTATE')[0].id, 'dictate')
  assert.equal(searchHelp('zzqnonexistent').length, 0)
  assert.ok(searchHelp('', 'Reflection').every(article => article.category === 'Reflection'))
  assert.equal(searchHelp('', 'invalid').length, 0)
  assert.equal(searchHelp('   ').length, HELP_ARTICLES.length)
  assert.equal(searchHelp('[.*]').length, HELP_ARTICLES.length)
  assert.deepEqual(searchHelp('dictate'.padEnd(MAX_HELP_QUERY_LENGTH) + ' unknown'), searchHelp('dictate'))
})

test('help implementation does not fetch, save queries, render HTML or access clinical services', () => {
  const files = [
    'src/lib/helpSearch.js', 'src/composables/useHelp.js', 'src/components/help/HelpBrowser.vue',
    'src/components/help/HelpPanel.vue', 'src/views/HelpCentre.vue'
  ]
  for (const file of files) {
    const content = readFileSync(new URL(`../${file}`, import.meta.url), 'utf8')
    assert.doesNotMatch(content, /\bv-html\b|\bfetch\s*\(|\bauthenticatedFetch\s*\(|localStorage|sessionStorage|from\s+['"][^'"]*(?:supabase|clients|reflections)\./)
  }
})
