import { HELP_ARTICLES } from '../content/help/articles.js'

// Local, deterministic documentation search. Never read clinical stores, send a
// request, or persist the query. Bound input before any normalisation or matching.
export const MAX_HELP_QUERY_LENGTH = 160
const stopWords = new Set('a an and are as at be by can do does for from have how i in is it me my of on or so the this to was what when where which why with you your'.split(' '))
const aliases = { '3': 'three', '30': 'thirty', 'dictation': 'dictate', 'dictating': 'dictate', 'refelction': 'reflection', 'reflections': 'reflection', 'sessions': 'session', 'summaries': 'summary', 'saving': 'save', 'saved': 'save', 'patterns': 'pattern', 'overtime': 'over time' }

export function normaliseHelpText(value) {
  return String(value ?? '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ').trim().split(/\s+/).map(word => aliases[word] || word).join(' ')
}

export function helpArticleText(article) {
  return [article.title, article.summary, ...article.keywords,
    ...article.sections.flatMap(section => [section.heading, ...(section.paragraphs || []), ...(section.steps || []), section.example || ''])].join(' ')
}

export function searchHelp(query, category = '', articles = HELP_ARTICLES) {
  const normal = normaliseHelpText(String(query ?? '').slice(0, MAX_HELP_QUERY_LENGTH))
  const words = [...new Set(normal.split(/\s+/).filter(word => word && !stopWords.has(word)))].slice(0, 12)
  return articles.filter(article => !category || article.category === category).map((article, order) => {
    if (!words.length) return { article, score: 0, order }
    const title = normaliseHelpText(article.title)
    const keywords = normaliseHelpText(article.keywords.join(' '))
    const summary = normaliseHelpText(article.summary)
    const body = normaliseHelpText(helpArticleText(article))
    const tokens = body.split(/\s+/)
    // Prefix matching lets partially typed feature names find their articles.
    if (!words.every(word => tokens.some(token => token === word || (word.length >= 3 && token.startsWith(word))))) return null
    let score = 0
    for (const word of words) {
      score += title.includes(word) ? 12 : keywords.includes(word) ? 9 : summary.includes(word) ? 5 : 1
    }
    if (normal && title.includes(normal)) score += 24
    if (normal && article.keywords.some(value => normaliseHelpText(value) === normal)) score += 30
    return { article, score, order }
  }).filter(Boolean).sort((a, b) => b.score - a.score || a.order - b.order).map(result => result.article)
}
