import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { HELP_ARTICLES, HELP_CATEGORIES, getHelpArticle } from '../src/content/help/articles.js'

test('help catalogue has unique stable IDs, substantive articles and valid relations', () => {
  const ids = HELP_ARTICLES.map(article => article.id)
  assert.equal(new Set(ids).size, ids.length)
  assert.ok(ids.length >= 10)
  assert.deepEqual(HELP_CATEGORIES, ['Clients', 'Therapy Focus', 'Sessions', 'Reflection'])
  for (const article of HELP_ARTICLES) {
    assert.match(article.id, /^[a-z]+(?:-[a-z]+)*$/)
    assert.ok(HELP_CATEGORIES.includes(article.category))
    assert.ok(article.summary.length > 80)
    assert.ok(article.sections.length >= 3)
    assert.ok(article.sections.some(section => section.steps?.length >= 3))
    for (const id of article.related) assert.ok(getHelpArticle(id), article.id + ': ' + id)
  }
  assert.equal(getHelpArticle('../private-data'), null)
  assert.equal(getHelpArticle(undefined), null)
})

test('Help browser uses grouped catalogue navigation without search or filter UI', () => {
  const browser = readFileSync(new URL('../src/components/help/HelpBrowser.vue', import.meta.url), 'utf8')
  assert.match(browser, /HELP_ARTICLES/)
  assert.match(browser, /HELP_CATEGORIES/)
  assert.match(browser, /groupedArticles/)
  assert.match(browser, /data-testid="help-topic-card"/)
  assert.doesNotMatch(browser, /Search Help|All topics|Filter help topics|type="search"|helpSearch|MAX_HELP_QUERY_LENGTH/)
})

test('help implementation does not fetch, persist navigation state, render HTML or access clinical services', () => {
  const files = [
    'src/composables/useHelp.js', 'src/components/help/HelpBrowser.vue',
    'src/components/help/HelpPanel.vue', 'src/views/HelpCentre.vue'
  ]
  for (const file of files) {
    const content = readFileSync(new URL('../' + file, import.meta.url), 'utf8')
    assert.doesNotMatch(content, /\bv-html\b|\bfetch\s*\(|\bauthenticatedFetch\s*\(|localStorage|sessionStorage|from\s+['"][^'"]*(?:supabase|clients|reflections)\./)
  }
})
