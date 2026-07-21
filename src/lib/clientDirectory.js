export function normaliseClientSearch(value = '') {
  return String(value).trim().toLocaleLowerCase()
}

export function clientMatchesSearch(client, query) {
  const term = normaliseClientSearch(query)
  if (!term) return true
  return [client.name, client.reference, client.email]
    .filter(Boolean)
    .some(value => normaliseClientSearch(value).includes(term))
}

export function exactSearchMatches(clients, query) {
  const term = normaliseClientSearch(query)
  if (!term) return []
  return clients.filter(client =>
    [client.name, client.reference, client.email]
      .filter(Boolean)
      .some(value => normaliseClientSearch(value) === term)
  )
}

export function sortClients(clients, sortBy, recentClientIds = []) {
  const recentPositions = new Map(recentClientIds.map((id, index) => [String(id), index]))
  return [...clients].sort((a, b) => {
    if (sortBy === 'recent') {
      const aPosition = recentPositions.get(String(a.id))
      const bPosition = recentPositions.get(String(b.id))
      if (aPosition !== undefined || bPosition !== undefined) {
        return (aPosition ?? Number.MAX_SAFE_INTEGER) - (bPosition ?? Number.MAX_SAFE_INTEGER)
      }
    }
    return String(a.name || '').localeCompare(String(b.name || ''))
  })
}

export function clientIdentifier(client, clients) {
  const matchingNames = clients.filter(candidate => normaliseClientSearch(candidate.name) === normaliseClientSearch(client.name))
  if (matchingNames.length < 2) return ''
  return client.reference || client.email || ''
}
