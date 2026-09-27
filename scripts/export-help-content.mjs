import { HELP_ARTICLES, HELP_REVIEW_DATE } from '../src/content/help/articles.js'
// Print the exact shipped article wording for editorial review/Notion updates.
console.log(`# Helios Help Centre\n\nContent reviewed: ${HELP_REVIEW_DATE}\n`)
for (const article of HELP_ARTICLES) {
  console.log(`## ${article.title}\n\nID: ${article.id} | Category: ${article.category}\n\n${article.summary}\n`)
  for (const section of article.sections) {
    console.log(`### ${section.heading}\n`)
    for (const paragraph of section.paragraphs || []) console.log(`${paragraph}\n`)
    for (const [index, step] of (section.steps || []).entries()) console.log(`${index + 1}. ${step}`)
    if (section.example) console.log(`${section.example}\n`)
    console.log('')
  }
  console.log(`Related articles: ${article.related.join(', ')}\n`)
}
