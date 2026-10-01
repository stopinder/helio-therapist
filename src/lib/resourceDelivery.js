import { assignmentCompletionUrl } from './clinicalExchange.js'

export function buildResourceDelivery({ assignments = [], clientAccessTokens = [], client, origin } = {}) {
  const links = assignments.map((assignment, index) => {
    const token = clientAccessTokens[index]
    if (!token) return null
    return {
      title: assignment?.sent_snapshot?.title || 'Resource',
      url: assignmentCompletionUrl(token, origin)
    }
  }).filter(Boolean)

  const email = String(client?.email || '').trim()
  const name = String(client?.name || '').trim()
  const greetingName = name.split(/\s+/)[0] || ''
  const subject = links.length === 1 ? `${links[0].title} from your therapist` : 'Resources from your therapist'
  const linkText = links.map(item => `${item.title}:\n${item.url}`).join('\n\n')
  const body = [
    `Hello${greetingName ? ` ${greetingName}` : ''},`,
    '',
    'Please use the secure Helios link below to complete the item I have sent you.',
    '',
    linkText,
    '',
    'The link expires after 30 days.',
    '',
    'Best wishes'
  ].join('\n')

  return {
    links,
    mailto: email && links.length
      ? `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
      : ''
  }
}

export function openEmailDraft(mailto) {
  if (!mailto || typeof document === 'undefined') return false
  const link = document.createElement('a')
  link.href = mailto
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  link.remove()
  return true
}
